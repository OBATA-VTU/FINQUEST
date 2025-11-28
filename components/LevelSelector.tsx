
import React from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';

interface LevelSelectorProps {
  selectedLevel: Level;
  onSelectLevel: (level: Level) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({ selectedLevel, onSelectLevel }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="font-bold text-lg mb-4 text-indigo-800">Select Level</h3>
      <ul className="space-y-2">
        {LEVELS.map((level) => (
          <li key={level}>
            <button
              onClick={() => onSelectLevel(level)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                selectedLevel === level
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'
              }`}
            >
              {level} Level
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
