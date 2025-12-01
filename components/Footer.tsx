import React, { useEffect, useState, useContext } from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';

export const Footer: React.FC = () => {
  const auth = useContext(AuthContext);
  const [socials, setSocials] = useState({
      facebook: '',
      twitter: '',
      instagram: '',
      whatsapp: ''
  });

  useEffect(() => {
      const fetchContent = async () => {
          try {
              // Fetch Socials
              const socDoc = await getDoc(doc(db, 'content', 'social_links'));
              if (socDoc.exists()) setSocials(socDoc.data() as any);
          } catch (e) {
              console.error("Failed to fetch footer content");
          }
      };
      fetchContent();
  }, []);

  return (
    <footer className="bg-indigo-950 dark:bg-slate-950 text-white mt-16 border-t border-indigo-900 dark:border-slate-800 transition-colors">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
          
          <div className="md:col-span-2 flex flex-col items-center md:items-start">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-white p-1 rounded-full">
                 <Logo className="h-10 w-10" />
              </div>
              <div>
                  <span className="font-bold text-xl block leading-none">FINSA</span>
                  <span className="text-[10px] text-indigo-300 uppercase tracking-widest">AAUA Chapter</span>
              </div>
            </div>
            <p className="text-sm text-indigo-300 mb-6 max-w-xs leading-relaxed">
              The official digital resource hub for the Finance Department of Adekunle Ajasin University. Breeding financial experts since inception.
            </p>
            
            <div className="flex gap-4">
                {socials.facebook && (
                    <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-indigo-900 hover:bg-indigo-800 flex items-center justify-center transition-all hover:-translate-y-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                )}
                {socials.twitter && (
                    <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-indigo-900 hover:bg-indigo-800 flex items-center justify-center transition-all hover:-translate-y-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                )}
                {socials.instagram && (
                    <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-indigo-900 hover:bg-indigo-800 flex items-center justify-center transition-all hover:-translate-y-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                )}
                {socials.whatsapp && (
                    <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-indigo-900 hover:bg-indigo-800 flex items-center justify-center transition-all hover:-translate-y-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    </a>
                )}
            </div>
          </div>

          {/* Links Column */}
          <div>
            <h3 className="font-bold mb-6 text-indigo-200">Quick Access</h3>
            <ul className="space-y-3 text-sm">
                {/* CONDITIONAL LINKS BASED ON AUTH */}
                {auth?.user && <li><Link to="/dashboard" className="hover:text-white text-indigo-400 transition-colors">My Dashboard</Link></li>}
                {auth?.user && <li><Link to="/questions" className="hover:text-white text-indigo-400 transition-colors">Past Questions</Link></li>}
                <li><Link to="/announcements" className="hover:text-white text-indigo-400 transition-colors">Announcements</Link></li>
                {auth?.user && <li><Link to="/lecturers" className="hover:text-white text-indigo-400 transition-colors">Directory</Link></li>}
                {!auth?.user && <li><Link to="/login" className="hover:text-white text-indigo-400 transition-colors">Login / Register</Link></li>}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="font-bold mb-6 text-indigo-200">Contact Us</h3>
            <address className="not-italic text-sm text-indigo-400 space-y-3">
              <p>Department of Finance</p>
              <p>Faculty of Administration</p>
              <p>Adekunle Ajasin University,</p>
              <p>Akungba-Akoko, Ondo State.</p>
              
              <div className="mt-6 space-y-3">
                  <a href="mailto:obaofaaua@gmail.com" className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors group">
                      <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="font-medium">obaofaaua@gmail.com</span>
                  </a>
                  <a href="tel:08142452729" className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors group">
                      <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <span className="font-medium">08142452729</span>
                  </a>
                  <a href="https://wa.me/2348142452729" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors group">
                      <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                      </div>
                      <span className="font-medium">WhatsApp Support</span>
                  </a>
              </div>
            </address>
          </div>

        </div>
        
        {/* Copyright */}
        <div className="border-t border-indigo-900 dark:border-slate-800 mt-12 pt-8 text-center text-xs text-indigo-500 dark:text-slate-500 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col md:flex-row gap-2 items-center">
              <p>FINSA-OBA &copy; {new Date().getFullYear()}. All rights reserved.</p>
              <span className="hidden md:inline text-indigo-700 dark:text-slate-700">•</span>
              <p className="text-indigo-400 dark:text-slate-400 font-bold">OBA - PRO '25/26</p>
          </div>
          <div className="flex gap-4 mt-2 md:mt-0">
              <Link to="/privacy" className="hover:text-indigo-300">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-indigo-300">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};