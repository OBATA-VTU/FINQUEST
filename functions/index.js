
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Configuration is now sourced from Firebase environment variables.
// To set them, use the Firebase CLI or your hosting provider's (e.g., Vercel) interface:
// - mailjet.apikey="YOUR_API_KEY"
// - mailjet.apisecret="YOUR_API_SECRET"
// - mailjet.sender="your@sender.email"

/**
 * Sends a welcome email to a new user.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const mailjetConfig = functions.config().mailjet;
  if (!mailjetConfig?.apikey || !mailjetConfig?.apisecret || !mailjetConfig?.sender) {
    console.error("CRITICAL: Mailjet configuration is missing. Set mailjet.apikey, mailjet.apisecret, and mailjet.sender in your environment config.");
    return;
  }
  
  const mailjet = require('@mailjet/node').connect(
    mailjetConfig.apikey,
    mailjetConfig.apisecret
  );
  const senderEmail = mailjetConfig.sender;
  
  const recipientEmail = user.email;
  const recipientName = user.displayName || "Student";

  console.log(`Attempting to send welcome email to ${recipientEmail}`);
  const request = mailjet.post("send", { version: "v3.1" }).request({
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
    .then((result) => console.log("Welcome email sent successfully to:", recipientEmail, JSON.stringify(result.body)))
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

    const mailjetConfig = functions.config().mailjet;
    if (!mailjetConfig?.apikey || !mailjetConfig?.apisecret || !mailjetConfig?.sender) {
        console.error("CRITICAL: Mailjet configuration is missing. Set mailjet.apikey, mailjet.apisecret, and mailjet.sender in your environment config.");
        return;
    }

    const mailjet = require("@mailjet/node").connect(
        mailjetConfig.apikey,
        mailjetConfig.apisecret
    );
    const senderEmail = mailjetConfig.sender;

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
    const request = mailjet.post("send", { version: "v3.1" }).request({
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
      .then((result) => console.log("Broadcast email sent successfully.", JSON.stringify(result.body)))
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

    const mailjetConfig = functions.config().mailjet;
    if (!mailjetConfig?.apikey || !mailjetConfig?.apisecret || !mailjetConfig?.sender) {
        console.error("CRITICAL: Mailjet configuration is missing. Set mailjet.apikey, mailjet.apisecret, and mailjet.sender in your environment config.");
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
    
    const mailjet = require("@mailjet/node").connect(
        mailjetConfig.apikey,
        mailjetConfig.apisecret
    );
    const senderEmail = mailjetConfig.sender;
    
    console.log(`Attempting to send direct email to ${recipientEmail}...`);
    const request = mailjet.post("send", { version: "v3.1" }).request({
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
      .then((result) => console.log(`Direct notification email sent successfully to: ${recipientEmail}`, JSON.stringify(result.body)))
      .catch((err) => console.error(`Error sending direct notification email to ${recipientEmail}:`, err.statusCode, err.message, err.ErrorMessage));
  });


/**
 * Sends an email to all users when a new announcement is posted.
 */
exports.sendAnnouncementEmail = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snap) => {
    const announcement = snap.data();

    const mailjetConfig = functions.config().mailjet;
    if (!mailjetConfig?.apikey || !mailjetConfig?.apisecret || !mailjetConfig?.sender) {
        console.error("CRITICAL: Mailjet configuration is missing. Set mailjet.apikey, mailjet.apisecret, and mailjet.sender in your environment config.");
        return;
    }

    const mailjet = require("@mailjet/node").connect(
        mailjetConfig.apikey,
        mailjetConfig.apisecret
    );
    const senderEmail = mailjetConfig.sender;

    const usersSnap = await admin.firestore().collection("users").get();
    const recipients = usersSnap.docs.map((doc) => ({
      Email: doc.data().email,
      Name: doc.data().name || "Student",
    }));

    if (recipients.length === 0) return null;

    console.log(`Attempting to send announcement email to ${recipients.length} users.`);
    const request = mailjet.post("send", { version: "v3.1" }).request({
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
      .then((result) => console.log("Announcement email sent successfully.", JSON.stringify(result.body)))
      .catch((err) => console.error("Error sending announcement email:", err.statusCode, err.message, err.ErrorMessage));
  });
