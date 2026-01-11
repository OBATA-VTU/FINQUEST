
import React, { useState } from 'react';

export const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(display === '0' ? num : display + num);
    setExpression(expression + num);
  };

  const handleOperator = (op: string) => {
    setDisplay('0');
    setExpression(expression + op);
  };

  const handleEqual = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(expression); 
      setDisplay(String(result));
      setExpression(String(result));
    } catch (e) {
      setDisplay('Error');
      setExpression('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  return (
    <div className="bg-slate-900 p-4 rounded-xl shadow-2xl w-64 border border-slate-700">
      <div className="bg-slate-100 rounded-lg p-3 mb-4 text-right">
        <div className="text-xs text-slate-500 h-4">{expression}</div>
        <div className="text-2xl font-mono font-bold text-slate-900 truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button onClick={handleClear} className="col-span-2 bg-rose-500 text-white p-3 rounded font-bold hover:bg-rose-600">AC</button>
        <button onClick={() => handleOperator('/')} className="bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700">÷</button>
        <button onClick={() => handleOperator('*')} className="bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700">×</button>
        
        <button onClick={() => handleNumber('7')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">7</button>
        <button onClick={() => handleNumber('8')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">8</button>
        <button onClick={() => handleNumber('9')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">9</button>
        <button onClick={() => handleOperator('-')} className="bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700">-</button>
        
        <button onClick={() => handleNumber('4')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">4</button>
        <button onClick={() => handleNumber('5')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">5</button>
        <button onClick={() => handleNumber('6')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">6</button>
        <button onClick={() => handleOperator('+')} className="bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700">+</button>
        
        <button onClick={() => handleNumber('1')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">1</button>
        <button onClick={() => handleNumber('2')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">2</button>
        <button onClick={() => handleNumber('3')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">3</button>
        <button onClick={handleEqual} className="row-span-2 bg-emerald-500 text-white p-3 rounded font-bold hover:bg-emerald-600 flex items-center justify-center">=</button>
        
        <button onClick={() => handleNumber('0')} className="col-span-2 bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">0</button>
        <button onClick={() => handleNumber('.')} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">.</button>
      </div>
    </div>
  );
};
