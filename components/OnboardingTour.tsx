
import React, { useState } from 'react';

interface OnboardingTourProps {
    onFinish: () => void;
}

const steps = [
    {
        icon: '👋',
        title: 'Welcome to the FINSA Portal!',
        description: "Let's take a quick tour to show you the key features that will help you excel in your studies."
    },
    {
        icon: '📚',
        title: 'Resources Archives',
        description: "Find all your study materials in one place. Access verified past questions, lecture notes, and more, all sorted by level."
    },
    {
        icon: '🎯',
        title: 'AI-Powered Practice Center',
        description: "Sharpen your skills by taking mock exams, generating quizzes on any topic, or playing educational arcade games."
    },
    {
        icon: '💬',
        title: 'Community Hub',
        description: "Connect with classmates in the Student Lounge, find official study groups, and stay in the loop with department news."
    },
    {
        icon: '🚀',
        title: "You're All Set!",
        description: "Explore the portal and start your journey to academic excellence. Good luck!"
    }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onFinish }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onFinish();
        }
    };

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm text-center p-8 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                <div key={currentStep} className="animate-fade-in">
                    <div className="text-6xl mb-6">{step.icon}</div>
                    <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white mb-3">{step.title}</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-8">{step.description}</p>
                </div>

                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? 'bg-indigo-600 w-4' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={nextStep} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-transform hover:-translate-y-1">
                        {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                    </button>
                    <button onClick={onFinish} className="text-xs text-slate-400 font-bold hover:text-indigo-500">
                        Skip Tour
                    </button>
                </div>
            </div>
        </div>
    );
};
