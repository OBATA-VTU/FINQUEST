

import React, { useContext } from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export const Footer: React.FC = () => {
  const auth = useContext(AuthContext);
  const settings = useSettings();
  // Ensure default values are used if settings are not yet loaded or missing
  const socials = settings?.socialLinks || { facebook: 'https://facebook.com/groups/8173545352661193/', twitter: 'https://x.com/FINSA_AAUA', instagram: '', whatsapp: 'https://whatsapp.com/channel/0029VbC0FW23QxS7OqFNcP0q', telegram: '', tiktok: '' };

  return (
    <footer className="relative bg-slate-950 text-slate-300 overflow-hidden border-t border-slate-800 mt-auto">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          
          {/* BRAND COLUMN (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                 <Logo className="h-10 w-10" />
              </div>
              <div>
                  <span className="font-serif font-bold text-2xl text-white block leading-none tracking-wide">FINSA</span>
                  <span className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-bold">AAUA Chapter</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The official digital ecosystem for the Department of Finance, Adekunle Ajasin University. Empowering students with academic resources and community connection.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-4 pt-2">
                {[
                    { link: socials.facebook, icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>, label: "Facebook" },
                    { link: socials.twitter, icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>, label: "X" },
                    { link: socials.instagram, icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>, label: "Instagram" },
                    { link: socials.whatsapp, icon: <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>, label: "WhatsApp" }
                ].map((social, idx) => (
                    social.link && (
                        <a key={idx} href={social.link} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all duration-300 hover:-translate-y-1 shadow-sm border border-slate-700 hover:border-indigo-500" aria-label={social.label}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">{social.icon}</svg>
                        </a>
                    )
                ))}
            </div>
          </div>

          {/* QUICK LINKS (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-white mb-6 uppercase text-xs tracking-widest border-l-2 border-indigo-500 pl-3">Explore</h3>
            <ul className="space-y-3">
                <li><Link to="/" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Home</Link></li>
                <li><Link to="/announcements" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>News</Link></li>
                <li><Link to="/gallery" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Gallery</Link></li>
                <li><Link to="/executives" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Executives</Link></li>
                <li><Link to="/lecturers" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Lecturers</Link></li>
            </ul>
          </div>

          {/* STUDENT RESOURCES (3 cols) */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-white mb-6 uppercase text-xs tracking-widest border-l-2 border-indigo-500 pl-3">Student Portal</h3>
            <ul className="space-y-3">
                {auth?.user ? (
                    <>
                        <li><Link to="/dashboard" className="text-sm hover:text-emerald-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 bg-emerald-500/50 group-hover:bg-emerald-400 rounded-full transition-colors"></span>My Dashboard</Link></li>
                        <li><Link to="/questions" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Past Questions</Link></li>
                        <li><Link to="/test" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>CBT Practice</Link></li>
                        <li><Link to="/community" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Community</Link></li>
                    </>
                ) : (
                    <>
                        {/* Changed this link to /signup */}
                        <li><Link to="/signup" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Login / Register</Link></li>
                        <li className="text-xs text-slate-500 mt-2">Access to resources requires login.</li>
                    </>
                )}
                <li><Link to="/faq" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>FAQ</Link></li>
                <li><Link to="/privacy" className="text-sm hover:text-indigo-400 transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-slate-600 group-hover:bg-indigo-400 rounded-full transition-colors"></span>Privacy Policy</Link></li>
            </ul>
          </div>
          
          {/* NEWSLETTER (3 cols) */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
              <h3 className="font-bold text-white mb-3">Stay Updated</h3>
              <p className="text-sm text-slate-400 mb-6">Subscribe to get notifications for major announcements and new resources.</p>
              <form className="flex gap-2">
                  <input type="email" placeholder="your.email@student.aaua.edu.ng" className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-lg">Subscribe</button>
              </form>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="text-center pt-16 mt-16 border-t border-white/10">
            <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} FINSA AAUA Portal. All rights reserved.</p>
            <p className="text-xs text-slate-500 mt-2">Developed by OBA (PRO 2025/2026).</p>
        </div>
      </div>
    </footer>
  );
};