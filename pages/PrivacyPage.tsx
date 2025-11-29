import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-8">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-xl shadow-sm space-y-6 text-slate-700">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Introduction</h2>
            <p>Welcome to FINQUEST ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and your rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when you register on the website, expressed an interest in obtaining information about us or our products and Services, when you participate in activities on the website (such as posting messages in our online forums or entering competitions, contests or giveaways) or otherwise when you contact us.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Name and Contact Data (Email address, phone number).</li>
              <li>Credentials (Passwords, hints, and similar security information).</li>
              <li>Academic Data (Matriculation number, Level, Course details).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. How We Use Your Information</h2>
            <p>We use personal information collected via our website for a variety of business purposes described below:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To facilitate account creation and logon process.</li>
              <li>To post testimonials.</li>
              <li>To Request Feedback.</li>
              <li>To enable user-to-user communications.</li>
              <li>To manage user accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Google AdSense & Cookies</h2>
            <p>We use third-party vendors, including Google, which use cookies to serve ads based on a user's prior visits to our website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p>
            <p className="mt-2">Users may opt-out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Google Ads Settings</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Contact Us</h2>
            <p>If you have questions or comments about this policy, you may email us at support@finquest.aaua.edu.ng.</p>
          </section>
        </div>
      </div>
    </div>
  );
};