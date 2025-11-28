import React from 'react';
import { Logo } from './Logo';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-indigo-900 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center space-x-2 mb-4">
              <Logo className="h-12 w-12" />
              <span className="font-bold text-lg">FINQUEST</span>
            </div>
            <p className="text-sm text-indigo-200">
              Motto: Breeding Financial Experts
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-rose-400 transition-colors">Home</Link></li>
              <li><Link to="/questions" className="hover:text-rose-400 transition-colors">Past Questions</Link></li>
              <li><Link to="/announcements" className="hover:text-rose-400 transition-colors">Announcements</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Connect</h3>
            <p className="text-sm text-indigo-200">
              Finance Department,
              <br />
              Adekunle Ajasin University,
              <br />
              Akungba-Akoko, Ondo State.
            </p>
          </div>
        </div>
        <div className="border-t border-indigo-800 mt-8 pt-6 text-center text-sm text-indigo-300">
          <p>&copy; {new Date().getFullYear()} FINQUEST (AAUA Chapter). All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};