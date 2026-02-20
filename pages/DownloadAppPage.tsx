
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

        // Check if the app is already running in standalone mode. If so, don't offer to install.
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) {
            setIsInstallable(false);
            return;
        }

        if (isIos()) {
            setIsIosDevice(true);
            // On iOS, installation is a manual browser action. We can always show the instructions.
            setIsInstallable(true);
        } else {
            // For other browsers, rely on the beforeinstallprompt event.
            window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        }

        return () => {
            if (!isIos()) {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            }
        };
    }, []);
    
    const APK_URL = "https://cdn.applikeweb.com/downloads/android_ff3e6395-9b07-4752-abb4-4ea45c917593_1.0.0.apk";

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            setIsInstallable(false);
        } else if (isIosDevice) {
            setShowIosInstructions(true);
        } else {
            // Fallback to APK download if PWA install fails or is not supported
            window.location.href = APK_URL;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 flex items-center justify-center transition-colors">
            <div className="max-w-2xl w-full text-center animate-fade-in-up">
                <h1 className="text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Download FINSA App</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Get the best experience by downloading the official FINSA app for Android or installing the portal to your home screen.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                    <a 
                        href={APK_URL}
                        className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white font-bold rounded-full shadow-2xl hover:bg-indigo-700 transition uppercase tracking-widest text-sm transform hover:scale-105 duration-300 flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414L20.355 18.1734L18.941 19.5874L16.109 16.7554L13.277 19.5874L11.863 18.1734L14.695 15.3414L11.863 12.5094L13.277 11.0954L16.109 13.9274L18.941 11.0954L20.355 12.5094L17.523 15.3414ZM12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20Z"/></svg>
                        Download APK
                    </a>
                    
                    {isInstallable && (
                        <button 
                            onClick={handleInstallClick}
                            className="w-full sm:w-auto px-12 py-5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-400 font-bold rounded-full shadow-xl hover:bg-indigo-50 transition uppercase tracking-widest text-sm transform hover:scale-105 duration-300"
                        >
                            Install Web App
                        </button>
                    )}
                </div>

                <div className="relative flex py-8 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">App Store Links</span>
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
