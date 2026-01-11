const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();

// --- IMPORTANT DEPLOYMENT NOTE ---
// Before deploying, you MUST set your Google OAuth Client ID and Secret in your Firebase environment.
// Run these commands in your terminal, replacing the placeholders with your actual credentials:
// firebase functions:config:set google.client_id="YOUR_GOOGLE_CLIENT_ID"
// firebase functions:config:set google.client_secret="YOUR_GOOGLE_CLIENT_SECRET"
//
// These credentials should be the same ones used in your vite.config.ts and AdminSettingsPage.
const GOOGLE_CLIENT_ID = functions.config().google.client_id;
const GOOGLE_CLIENT_SECRET = functions.config().google.client_secret;

/**
 * A callable Cloud Function to securely upload files to a shared Google Drive.
 * This function acts as a backend proxy, using securely stored admin credentials
 * to perform uploads on behalf of any authenticated user.
 */
exports.uploadFileToDrive = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check: Ensure the user is logged in.
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to upload files.");
    }

    const { fileContent, fileName, mimeType } = data;
    if (!fileContent || !fileName || !mimeType) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with fileContent, fileName, and mimeType.");
    }

    try {
        // 2. Get Google Drive settings (refresh token, folder ID) from Firestore.
        const db = admin.firestore();
        const configRef = db.collection("config").doc("google_drive_settings");
        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            throw new functions.https.HttpsError("failed-precondition", "Google Drive is not configured. Please contact an administrator.");
        }
        const config = configDoc.data();
        const { refresh_token, folder_id } = config;

        if (!refresh_token || !folder_id) {
            throw new functions.https.HttpsError("failed-precondition", "Google Drive configuration is incomplete. Please ask an admin to re-authenticate and set a Folder ID.");
        }
        
        // 3. Set up Google API client with OAuth2 credentials.
        const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // 4. Decode base64 content and prepare it for upload.
        const fileBuffer = Buffer.from(fileContent, 'base64');
        const media = {
            mimeType: mimeType,
            body: require('stream').Readable.from(fileBuffer),
        };

        // 5. Upload the file to the specified Google Drive folder.
        const driveResponse = await drive.files.create({
            resource: { name: fileName, parents: [folder_id] },
            media: media,
            fields: 'id',
        });

        const fileId = driveResponse.data.id;
        if (!fileId) {
            throw new Error("File uploaded to Drive, but no file ID was returned.");
        }

        // 6. Make the newly uploaded file publicly readable.
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        // 7. Return the public URL and file ID to the client.
        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        return { success: true, url: publicUrl, path: fileId };

    } catch (error) {
        console.error("Cloud function 'uploadFileToDrive' error:", error);
        if (error.code >= 400 && error.code < 500) {
             throw new functions.https.HttpsError("permission-denied", "The server's permission to Google Drive has expired or is invalid. An admin needs to re-authenticate.");
        }
        throw new functions.https.HttpsError("internal", "An error occurred on the server while uploading the file.");
    }
});


// --- MAILJET EMAIL FUNCTIONS ---
// Configuration is sourced from Firebase environment variables.
const mailjetConfig = functions.config().mailjet;


/**
 * Sends a welcome email to a new user.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  // ... (existing email functions remain unchanged)
});

// ... (all other existing email functions remain here)


// The exchangeAuthCode function has been removed as it's no longer needed
// with the client-side 'token' authentication flow.