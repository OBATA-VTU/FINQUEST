
import React, { useEffect } from 'react';

export const PrivacyPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0,0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-16 transition-colors">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm space-y-6 text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Introduction</h2>
            <p>Welcome to the FINSA AAUA Portal ("the platform"). This platform is the official digital resource for the Finance Department of Adekunle Ajasin University, Akungba-Akoko (AAUA). This Privacy Policy outlines how the platform collects, uses, discloses, and protects the personal information of its users ("you"). By using the platform, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Information Collection</h2>
            <p>The platform collects information to provide and improve its services. The types of information collected include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Personal Identification Information:</strong> This includes information you provide during registration, such as your full name, email address, matriculation number, academic level, and chosen username.</li>
              <li><strong>Authentication Data:</strong> This includes your password (hashed and salted) or credentials from third-party sign-in services like Google.</li>
              <li><strong>User-Generated Content:</strong> Any materials you upload (e.g., past questions, notes), messages you send in the community chat, and personal notes you create.</li>
              <li><strong>Usage Data:</strong> Information on how you interact with the platform, such as test scores, contribution points, pages visited, and features used. This data is collected to improve the service and power features like the leaderboard.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Use of Information</h2>
            <p>The information collected is used for the following purposes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To create and manage your account.</li>
              <li>To personalize your experience and provide relevant academic content.</li>
              <li>To operate interactive features like the CBT practice tests, community chat, and leaderboard.</li>
              <li>To review and approve user-contributed academic materials.</li>
              <li>To communicate important departmental announcements and platform updates.</li>
              <li>To maintain the security and integrity of the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Data Sharing and Third-Party Services</h2>
            <p>The platform does not sell your personal data. However, it relies on third-party services to function, which may process your data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Firebase (by Google):</strong> Used for authentication, database storage (Firestore), and hosting.</li>
              <li><strong>Google Drive / Dropbox:</strong> Used for file storage if configured by the administrator. Uploaded files are subject to the privacy policies of these services.</li>
              <li><strong>Google Gemini API:</strong> Used for generating AI-powered test questions and notes. Prompts containing academic topics may be sent to Google for processing.</li>
              <li><strong>Adsterra:</strong> Used to display advertisements. Adsterra may use cookies and other tracking technologies to serve personalized ads. The platform does not share your personal identification information with Adsterra.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">5. Data Security</h2>
            <p>The platform implements reasonable security measures to protect your information. However, no electronic transmission or storage is 100% secure. While the platform strives to use commercially acceptable means to protect your Personal Information, its absolute security cannot be guaranteed.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">6. User Rights and Control</h2>
            <p>You have the right to access and update your personal information through your profile page. You may also request the deletion of your account and associated data by contacting the administrator. Please note that some user-generated content, such as approved academic materials, may be retained for the benefit of the student community.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">7. Contact Information</h2>
            <p>For any questions or concerns regarding this privacy policy or your data, please contact the designated administrator (Public Relations Officer) through the official support channels listed on the platform.</p>
            <ul className="list-none mt-2 space-y-2">
              <li className="flex items-center gap-2">
                  <strong>Primary Contact (WhatsApp):</strong> 
                  <a href="https://wa.me/2348142452729" className="text-indigo-600 hover:underline">08142452729</a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
