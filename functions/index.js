
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Mailjet = require("@mailjet/node");

admin.initializeApp();

// ===================================================================================
// !!! --- CRITICAL SECURITY WARNING --- !!!
// ===================================================================================
//
// The API keys below are hardcoded directly into the source code as you requested.
// This is EXTREMELY DANGEROUS and is NOT a secure or recommended practice.
//
// WHY THIS IS DANGEROUS:
// 1. PUBLIC EXPOSURE: Anyone with access to this code can see your secret keys.
// 2. ABUSE: Malicious users can use these keys to send emails from your account,
//    potentially getting you banned from Mailjet or incurring costs.
//
// WHAT YOU MUST DO (URGENTLY):
// 1. GO TO YOUR MAILJET ACCOUNT and CREATE NEW API KEYS.
// 2. DELETE the old keys you provided.
// 3. FOLLOW THE SECURE METHOD we discussed previously (using the Firestore database).
//
// This current setup is a temporary measure to make the service work, but you
// are putting your Mailjet account at high risk by leaving it this way.
//
// ===================================================================================

const mailjetClient = new Mailjet({
    apiKey: "31d3ecd69263132b58b84ef36fe6185a",
    apiSecret: "60749b12fcdb4fb1081ce3066e7d3aa1",
});
const SENDER_EMAIL = "finsa.aaua@gmail.com";


/**
 * Sends a welcome email to a new user.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const recipientEmail = user.email;
  const recipientName = user.displayName || "Student";

  const request = mailjetClient.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: SENDER_EMAIL,
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
    .catch((err) => console.error("Error sending welcome email:", err.statusCode, err.message));
});

/**
 * Sends an email to all users when a global notification is created.
 */
exports.sendBroadcastEmail = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    const notification = snap.data();
    if (notification.userId !== "all") return null;

    const usersSnap = await admin.firestore().collection("users").get();
    const recipients = usersSnap.docs.map((doc) => ({
      Email: doc.data().email,
      Name: doc.data().name || "Student",
    }));

    if (recipients.length === 0) return null;

    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: SENDER_EMAIL, Name: "FINSA Admin" },
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
      .catch((err) => console.error("Error sending broadcast email:", err.statusCode, err.message));
  });


/**
 * Sends an email to all users when a new announcement is posted.
 */
exports.sendAnnouncementEmail = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snap) => {
    const announcement = snap.data();

    const usersSnap = await admin.firestore().collection("users").get();
    const recipients = usersSnap.docs.map((doc) => ({
      Email: doc.data().email,
      Name: doc.data().name || "Student",
    }));

    if (recipients.length === 0) return null;

    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: SENDER_EMAIL, Name: "FINSA Announcements" },
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
      .catch((err) => console.error("Error sending announcement email:", err.statusCode, err.message));
  });
