const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();

const GOOGLE_CLIENT_ID = functions.config().google?.client_id;
const GOOGLE_CLIENT_SECRET = functions.config().google?.client_secret;

// NEW SECURE FUNCTION FOR OAUTH TOKEN EXCHANGE
exports.exchangeAuthCodeForTokens = functions.https.onCall(async (data, context) => {
    functions.logger.info("exchangeAuthCodeForTokens invoked.");

    if (!context.auth || !['admin', 'librarian', 'vice_president', 'supplement'].includes(context.auth.token.role)) {
        functions.logger.error("Unauthorized user attempted to exchange auth code.");
        throw new functions.https.HttpsError("permission-denied", "You must be an administrator to perform this action.");
    }
    
    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with an authorization code.");
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            "postmessage" // Important for client-side web apps
        );

        functions.logger.info("Exchanging authorization code for tokens...");
        const { tokens } = await oauth2Client.getToken(code);
        functions.logger.info("Tokens received from Google.");

        if (!tokens.refresh_token) {
            functions.logger.warn("No refresh token received. User may have already granted permission.");
        }
        
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const userEmail = userInfo.data.email;

        functions.logger.info(`Successfully authenticated as ${userEmail}. Saving refresh token.`);

        const settingsToSave = {
            refresh_token: tokens.refresh_token,
            connected_email: userEmail,
        };

        // We only save the refresh token if a new one is provided.
        if (!tokens.refresh_token) {
            delete settingsToSave.refresh_token;
        }

        await admin.firestore().collection("config").doc("google_drive_settings").set(settingsToSave, { merge: true });

        functions.logger.info("Refresh token and email saved to Firestore.");
        return { success: true, email: userEmail };

    } catch (error) {
        functions.logger.error("!!! GOOGLE OAUTH TOKEN EXCHANGE FAILED !!!", {
            error: error.message,
            response: error.response?.data
        });
        throw new functions.https.HttpsError("unknown", error.message || "Failed to exchange authorization code.");
    }
});


exports.uploadFileToDrive = functions
    .runWith({ timeoutSeconds: 300 })
    .https.onCall(async (data, context) => {
    
    functions.logger.info("uploadFileToDrive invoked.", { 
        fileName: data.fileName, 
        mimeType: data.mimeType,
        uid: context.auth?.uid 
    });

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        functions.logger.error("FATAL: Google OAuth environment variables are not set in Firebase Functions config.");
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Server is missing Google OAuth configuration. Administrator must run 'firebase functions:config:set google.client_id=...' and '...google.client_secret=...' and redeploy."
        );
    }
    
    if (!context.auth) {
        functions.logger.warn("Unauthenticated user attempted to upload.");
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to upload files.");
    }

    const { fileContent, fileName, mimeType } = data;
    if (!fileContent || !fileName || !mimeType) {
        functions.logger.error("Invalid arguments to function.", { hasFile: !!fileContent, hasName: !!fileName, hasMime: !!mimeType });
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with fileContent, fileName, and mimeType.");
    }

    try {
        const db = admin.firestore();
        const configRef = db.collection("config").doc("google_drive_settings");
        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            functions.logger.error("Google Drive config document does not exist in Firestore.");
            throw new functions.https.HttpsError("failed-precondition", "Google Drive is not configured. Please contact an administrator.");
        }
        
        const config = configDoc.data();
        const { refresh_token, folder_id } = config;
        
        functions.logger.info("Retrieved Google Drive config from Firestore.", { hasRefreshToken: !!refresh_token, folderId: folder_id });

        if (!refresh_token || !folder_id) {
            functions.logger.error("Firestore config is incomplete.", { hasRefreshToken: !!refresh_token, hasFolderId: !!folder_id });
            throw new functions.https.HttpsError("failed-precondition", "Google Drive configuration is incomplete. Please ask an admin to re-authenticate and set a Folder ID.");
        }
        
        const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token });
        functions.logger.info("OAuth2 client created with refresh token.");

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const fileBuffer = Buffer.from(fileContent, 'base64');
        const media = {
            mimeType: mimeType,
            body: require('stream').Readable.from(fileBuffer),
        };

        functions.logger.info("Attempting to upload file to Google Drive...", { fileName, parentFolder: folder_id });
        const driveResponse = await drive.files.create({
            resource: { name: fileName, parents: [folder_id] },
            media: media,
            fields: 'id',
        });
        functions.logger.info("drive.files.create call successful.", { responseData: driveResponse.data });

        const fileId = driveResponse.data.id;
        if (!fileId) {
            functions.logger.error("File uploaded to Drive, but no file ID was returned.");
            throw new Error("File uploaded to Drive, but no file ID was returned.");
        }

        functions.logger.info("Attempting to set public permissions...", { fileId });
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });
        functions.logger.info("Permissions set successfully.");

        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        functions.logger.info("Upload complete. Returning success.", { url: publicUrl, fileId });
        
        return { success: true, url: publicUrl, path: fileId };

    } catch (error) {
        // THIS IS THE CRITICAL LOGGING STEP FOR DEBUGGING
        functions.logger.error("!!! GOOGLE DRIVE UPLOAD FAILED !!!", { 
            // Using JSON.stringify to attempt to capture the whole structure
            fullError: JSON.parse(JSON.stringify(error)),
        });

        let errorMessage = "An unexpected server error occurred during upload.";
        let errorCode = "internal";

        if (error.code && (typeof error.code === 'number') && error.errors) {
            const googleError = error.errors[0] || {};
            const reason = googleError.reason || 'unknownReason';
            const message = googleError.message || 'No details provided by Google.';

            if (error.code === 404) {
                errorMessage = "The Google Drive Folder ID is invalid. Please check it in the Admin Settings.";
                errorCode = "not-found";
            } else if (error.code === 401 || error.code === 403) {
                errorMessage = "Google Drive permission denied. The connection may have expired. An admin needs to re-authenticate.";
                errorCode = "permission-denied";
            } else {
                errorMessage = `Google Drive Error: ${message} (Reason: ${reason})`;
                errorCode = "unknown";
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        throw new functions.https.HttpsError(errorCode, errorMessage);
    }
});


// --- MAILJET EMAIL FUNCTIONS ---
const mailjetConfig = functions.config().mailjet;

exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  // ... (existing email functions remain unchanged)
});