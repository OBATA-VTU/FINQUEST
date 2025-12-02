import React, { useEffect } from 'react';

export const PrivacyPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0,0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-8">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-xl shadow-sm space-y-6 text-slate-700">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Introduction</h2>
            <p>Welcome to FINSA ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and your rights.</p>
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Third-Party Advertising</h2>
            <p>We use third-party advertising companies to serve ads when you visit our website. These companies may use information about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.</p>
            <p className="mt-2">We do not control the content of these ads or the cookies that these third-party advertisers may use.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Contact Us</h2>
            <p>If you have questions or comments about this policy, you may contact us at:</p>
            <ul className="list-none mt-2 space-y-2">
              <li className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Email:</span> 
                  <a href="mailto:finsa@gmail.com" className="text-indigo-600 hover:underline">finsa@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Phone / WhatsApp:</span> 
                  <a href="tel:081444222147" className="text-indigo-600 hover:underline">081444222147</a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};