
import React from 'react';
import { Logo } from './Logo';
import { Page } from '../types';

interface FooterProps {
    onNavigate: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-indigo-900 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center space-x-2 mb-4">
              <Logo className="h-12 w-12" />
              <span className="font-bold text-lg">FINSA AAUA</span>
            </div>
            <p className="text-sm text-indigo-200">
              Motto: Breeding Financial Experts
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('home')} className="hover:text-rose-400 transition-colors">Home</button></li>
              <li><button onClick={() => onNavigate('questions')} className="hover:text-rose-400 transition-colors">Past Questions</button></li>
              <li><button onClick={() => onNavigate('announcements')} className="hover:text-rose-400 transition-colors">Announcements</button></li>
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
          <p>&copy; {new Date().getFullYear()} FINSA AAUA Chapter. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};
