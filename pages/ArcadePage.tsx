import React from 'react';

export const ArcadePage: React.FC = () => {
    // This is a placeholder for the full game implementations.
    // Due to the complexity, each game would ideally be its own component.
    // For this demonstration, we'll show the layout and basic placeholders.

    const GameCard = ({ title, description, icon, comingSoon = false }: { title: string, description: string, icon: string, comingSoon?: boolean }) => (
        <div className={`bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 text-center relative ${comingSoon ? 'opacity-60' : 'hover:-translate-y-2 transition-transform cursor-pointer'}`}>
            {comingSoon && <div className="absolute top-4 right-4 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Coming Soon</div>}
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400">{description}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="container mx-auto max-w-5xl pt-10 text-center">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">FINQUEST Arcade</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-12">Learn finance concepts through fun, interactive games.</p>

                <div className="grid md:grid-cols-2 gap-8">
                    <GameCard 
                        title="Trivia Titan" 
                        description="Answer fast-paced multiple-choice questions against the clock."
                        icon="🏆"
                    />
                    <GameCard 
                        title="Timeline Tussle" 
                        description="Drag and drop historical financial events into the correct order."
                        icon="⏳"
                    />
                    <GameCard 
                        title="Stock Showdown" 
                        description="A simple stock market simulator. Buy and sell based on news events."
                        icon="📈"
                        comingSoon={true}
                    />
                    <GameCard 
                        title="CFO Challenge" 
                        description="Make critical business decisions in text-based scenarios."
                        icon="💼"
                        comingSoon={true}
                    />
                </div>
            </div>
        </div>
    );
};
