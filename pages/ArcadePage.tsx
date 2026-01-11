
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ArcadePage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect users to the new, unified practice hub
        navigate('/test', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h1 className="text-2xl font-bold font-serif mb-2">Redirecting...</h1>
                <p className="text-indigo-300">The Arcade has been integrated into the new CBT Practice Center.</p>
            </div>
        </div>
    );
};
