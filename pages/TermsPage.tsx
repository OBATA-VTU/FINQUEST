import React, { useEffect } from 'react';

export const TermsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0,0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-8">Terms of Service</h1>
        <div className="bg-white p-8 rounded-xl shadow-sm space-y-6 text-slate-700">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Agreement to Terms</h2>
            <p>These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and FINSA ("we," "us" or "our"), concerning your access to and use of the website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Intellectual Property Rights</h2>
            <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. User Representations</h2>
            <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. User Registration</h2>
            <p>You may be required to register with the Site. You agree to keep your password confidential and will be responsible for all use of your account and password.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Prohibited Activities</h2>
            <p>You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">6. Academic Integrity</h2>
            <p>Materials provided on this site are for educational and revision purposes only. We do not encourage malpractice or academic dishonesty.</p>
          </section>
        </div>
      </div>
    </div>
  );
};