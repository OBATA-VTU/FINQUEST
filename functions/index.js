
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Mailjet = require("@mailjet/node");

admin.initializeApp();

// Helper to get mail configuration securely from Firestore
async function getMailConfig() {
    const configDoc = await admin.firestore().doc("config/mailjet").get();
    if (!configDoc.exists) {
        console.error("CRITICAL: Mailjet configuration not found in Firestore at /config/mailjet. Email functions are disabled.");
        return null;
    }
    return configDoc.data();
}


/**
 * Sends a welcome email to a new user.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const mailConfig = await getMailConfig();
  if (!mailConfig?.apiKey || !mailConfig?.apiSecret || !mailConfig?.sender) {
    console.error("Aborting welcome email: Mailjet config is incomplete.");
    return;
  }
  
  console.log("Mailjet config loaded, preparing to send welcome email.");
  const mailjetClient = new Mailjet({
    apiKey: mailConfig.apiKey,
    apiSecret: mailConfig.apiSecret,
  });
  const senderEmail = mailConfig.sender;
  
  const recipientEmail = user.email;
  const recipientName = user.displayName || "Student";

  console.log(`Attempting to send welcome email to ${recipientEmail}`);
  const request = mailjetClient.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: senderEmail,
          Name: "FINSA AAUA",
        },
        To: [ { Email: recipientEmail, Name: recipientName } ],
        Subject: "Welcome to the FINSA Portal!",
        HTMLPart: `
          <h3>Dear ${recipientName},</h3>
          <p>Welcome to the official FINSA student portal! We are thrilled to have you with us.</p>
          <p>You can now access past questions, practice for CBTs, and connect with the departmental community.</p>
          <p>If you have any questions, feel free to explore the FAQ section or reach out to an executive.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>The FINSA Team</strong></p>
        `,
      },
    ],
  });

  return request
    .then(() => console.log("Welcome email sent successfully to:", recipientEmail))
    .catch((err) => console.error("Error sending welcome email:", err.statusCode, err.message, err.ErrorMessage));
});

/**
 * Sends an email to all users when a global notification is created.
 */
exports.sendBroadcastEmail = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const notification = snap.data();
    if (notification.userId !== "all") return null;

    const mailConfig = await getMailConfig();
    if (!mailConfig?.apiKey || !mailConfig?.apiSecret || !mailConfig?.sender) {
        console.error("Aborting broadcast email: Mailjet config is incomplete.");
        return;
    }

    console.log("Mailjet config loaded, preparing to send broadcast email.");
    const mailjetClient = new Mailjet({
        apiKey: mailConfig.apiKey,
        apiSecret: mailConfig.apiSecret,
    });
    const senderEmail = mailConfig.sender;

    const usersSnap = await admin.firestore().collection("users").get();
    const recipients = usersSnap.docs.map((doc) => ({
      Email: doc.data().email,
      Name: doc.data().name || "Student",
    }));

    if (recipients.length === 0) {
        console.log("No users found to send broadcast email to. Aborting.");
        return null;
    }

    console.log(`Attempting to send broadcast to ${recipients.length} users.`);
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: senderEmail, Name: "FINSA Admin" },
          To: recipients,
          Subject: "Important Alert from FINSA",
          HTMLPart: `
            <h3>Dear Student,</h3>
            <p>You have a new broadcast message from the FINSA administration:</p>
            <p style="font-size: 16px; padding: 10px; border-left: 4px solid #4F46E5; background-color: #f5f5f5;">
              <strong>${notification.message}</strong>
            </p>
            <p>Please log in to the portal for more details.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The FINSA Team</strong></p>
          `,
        },
      ],
    });

    return request
      .then(() => console.log("Broadcast email sent successfully."))
      .catch((err) => console.error("Error sending broadcast email:", err.statusCode, err.message, err.ErrorMessage));
  });

/**
 * Sends a direct email to a user when a specific notification is created for them.
 */
exports.sendDirectNotificationEmail = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const notification = snap.data();
    if (notification.userId === "all" || !notification.userId) {
      return null;
    }

    const mailConfig = await getMailConfig();
    if (!mailConfig?.apiKey || !mailConfig?.apiSecret || !mailConfig?.sender) {
        console.error(`Aborting direct notification email for user ${notification.userId}: Mailjet config is incomplete.`);
        return;
    }

    const userDoc = await admin.firestore().doc(`users/${notification.userId}`).get();
    if (!userDoc.exists) {
        console.error(`Could not find user ${notification.userId} to send direct notification.`);
        return;
    }
    const user = userDoc.data();
    const recipientEmail = user.email;
    const recipientName = user.name || "Student";

    if (!recipientEmail) {
        console.error(`User ${notification.userId} has no email address.`);
        return;
    }
    
    console.log(`Mailjet config loaded for direct email to user ${user.name} (${recipientEmail}).`);
    const mailjetClient = new Mailjet({
        apiKey: mailConfig.apiKey,
        apiSecret: mailConfig.apiSecret,
    });
    const senderEmail = mailConfig.sender;
    
    console.log(`Attempting to send direct email to ${recipientEmail}...`);
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: senderEmail, Name: "FINSA Admin" },
          To: [{ Email: recipientEmail, Name: recipientName }],
          Subject: "New Notification from FINSA",
          HTMLPart: `
            <h3>Dear ${recipientName},</h3>
            <p>You have a new notification from the FINSA administration:</p>
            <p style="font-size: 16px; padding: 10px; border-left: 4px solid #4F46E5; background-color: #f5f5f5;">
              <strong>${notification.message}</strong>
            </p>
            <p>Please log in to the portal to view more details.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The FINSA Team</strong></p>
          `,
        },
      ],
    });

    return request
      .then(() => console.log(`Direct notification email sent successfully to: ${recipientEmail}`))
      .catch((err) => console.error(`Error sending direct notification email to ${recipientEmail}:`, err.statusCode, err.message, err.ErrorMessage));
  });


/**
 * Sends an email to all users when a new announcement is posted.
 */
exports.sendAnnouncementEmail = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snap) => {
    const announcement = snap.data();

    const mailConfig = await getMailConfig();
    if (!mailConfig?.apiKey || !mailConfig?.apiSecret || !mailConfig?.sender) {
        console.error("Aborting announcement email: Mailjet config is incomplete.");
        return;
    }

    console.log("Mailjet config loaded, preparing to send announcement email.");
    const mailjetClient = new Mailjet({
        apiKey: mailConfig.apiKey,
        apiSecret: mailConfig.apiSecret,
    });
    const senderEmail = mailConfig.sender;

    const usersSnap = await admin.firestore().collection("users").get();
    const recipients = usersSnap.docs.map((doc) => ({
      Email: doc.data().email,
      Name: doc.data().name || "Student",
    }));

    if (recipients.length === 0) return null;

    console.log(`Attempting to send announcement email to ${recipients.length} users.`);
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: senderEmail, Name: "FINSA Announcements" },
          To: recipients,
          Subject: `New Announcement: ${announcement.title}`,
          HTMLPart: `
            <h3>Hello,</h3>
            <p>A new announcement has been posted on the FINSA portal.</p>
            <h2 style="color: #4F46E5;">${announcement.title}</h2>
            <p>${announcement.content.substring(0, 200)}...</p>
            <p>
              <a href="https://finsa.vercel.app/announcements">Click here to read the full announcement on the portal.</a>
            </p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The FINSA Team</strong></p>
          `,
        },
      ],
    });

    return request
      .then(() => console.log("Announcement email sent successfully."))
      .catch((err) => console.error("Error sending announcement email:", err.statusCode, err.message, err.ErrorMessage));
  });

/**
 * Creates the Mailjet configuration document in Firestore.
 * This is a callable function that can only be executed by an authenticated admin.
 */
exports.createMailjetConfig = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to call this function.');
    }

    const userDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'You must be an admin to perform this action.');
    }

    const configRef = admin.firestore().doc("config/mailjet");
    const configDoc = await configRef.get();
    if (configDoc.exists) {
        return { status: 'success', message: 'Configuration already exists. No action taken.' };
    }
    
    const mailjetConfig = {
        apiKey: '31d3ecd69263132b58b84ef36fe6185a',
        apiSecret: '60749b12fcdb4fb1081ce3066e7d3aa1',
        sender: 'finsa.aaua@gmail.com'
    };

    await configRef.set(mailjetConfig);
    console.log("Successfully created Mailjet config document.");
    return { status: 'success', message: 'Mailjet configuration created successfully!' };
  } catch (error) {
    console.error("[FINSA_SETUP_ERROR] A critical error occurred in createMailjetConfig:", error);
    
    let clientMessage = 'An internal error occurred. Please check the Firebase Function logs for tag "[FINSA_SETUP_ERROR]" for details.';
    
    if (error instanceof functions.https.https.HttpsError) {
      clientMessage = error.message;
    } else if (error.message) {
      clientMessage = `Setup Error: ${error.message}`;
    }
    
    throw new functions.https.HttpsError('internal', clientMessage, { originalError: error.message });
  }
});
