const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

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
