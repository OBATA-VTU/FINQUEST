
import React, { useState, useEffect } from 'react';

// Helper to detect iOS devices
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  // Check for iPad, iPhone, iPod
  return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
};

export const DownloadAppPage: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIosDevice, setIsIosDevice] = useState(false);
    const [showIosInstructions, setShowIosInstructions] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        if (isIos()) {
            setIsIosDevice(true);
            // On iOS, 'Add to Home Screen' is always a manual option if the manifest is set up correctly.
            // We can assume it's "installable" in that sense.
            setIsInstallable(true);
        } else {
            window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        }

        // Check if the app is already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) {
            setIsInstallable(false);
        }

        return () => {
            if (!isIos()) {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            }
        };
    }, []);
    
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            setIsInstallable(false);
        } else if (isIosDevice) {
            setShowIosInstructions(true);
        } else {
            alert("App may already be installed. If not, look for an 'Install' icon in your browser's address bar or menu.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex items-center justify-center transition-colors">
            <div className="max-w-2xl w-full text-center animate-fade-in-up">
                <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Install FINSA App</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Get the best experience by installing the FINSA portal directly to your home screen for quick access.</p>
                
                {isInstallable ? (
                    <button 
                        onClick={handleInstallClick}
                        className="px-12 py-5 bg-indigo-600 text-white font-bold rounded-full shadow-2xl hover:bg-indigo-700 transition uppercase tracking-widest text-sm transform hover:scale-105 duration-300"
                    >
                        Download Here
                    </button>
                ) : (
                    <p className="px-12 py-5 bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold rounded-full shadow-inner">
                        App Already Installed or Not Supported
                    </p>
                )}

                <div className="relative flex py-8 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or visit the app store</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-20" />
                    </a>
                    <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" className="h-14" />
                    </a>
                </div>
            </div>

            {showIosInstructions && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowIosInstructions(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm text-center animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Install on iOS</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">To install the app on your iPhone or iPad, follow these steps in Safari:</p>
                        <ol className="text-left space-y-4">
                            <li className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-blue-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                                <div><strong>1.</strong> Tap the <strong>Share</strong> button.</div>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-blue-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </div>
                                <div><strong>2.</strong> Scroll down and tap on <strong>'Add to Home Screen'</strong>.</div>
                            </li>
                        </ol>
                        <button onClick={() => setShowIosInstructions(false)} className="mt-8 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Got It!</button>
                    </div>
                </div>
            )}
        </div>
    );
};
