
import React, { useState, useRef, useEffect } from 'react';

interface CalculatorProps {
  onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  
  const [position, setPosition] = useState({ 
    x: window.innerWidth / 2 - 128, // 128 = half of 256px width
    y: 100 
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!calculatorRef.current) return;
    setIsDragging(true);
    // Record the offset between the mouse position and the element's top-left corner
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // We use native mouse events on the window to allow dragging outside the component
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y,
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const handleNumber = (num: string) => {
    setDisplay(display === '0' || display === 'Error' ? num : display + num);
    setExpression(expression + num);
  };

  const handleOperator = (op: string) => {
    setDisplay('0');
    setExpression(expression + op);
  };

  const handleEqual = () => {
    try {
      // Basic protection against unsafe characters
      const sanitizedExpression = expression.replace(/[^-()\d/*+.]/g, '');
      if (sanitizedExpression !== expression) {
          throw new Error("Invalid characters");
      }
      // Use the Function constructor for safer evaluation than eval()
      const result = new Function('return ' + sanitizedExpression)();
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
  
  const handleDecimal = () => {
    if (!display.includes('.')) {
        handleNumber('.');
    }
  };

  return (
    <div 
      ref={calculatorRef}
      className="fixed bg-slate-900 rounded-2xl shadow-2xl w-64 border border-slate-700 z-50 animate-fade-in-up"
      style={{ top: position.y, left: position.x }}
    >
      <div 
        className="flex justify-between items-center px-4 py-2 border-b border-slate-700 cursor-move"
        onMouseDown={onMouseDown}
      >
        <h4 className="text-xs font-bold text-white">Calculator</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
      </div>

      <div className="p-4">
        <div className="bg-slate-100 rounded-lg p-3 mb-4 text-right">
          <div className="text-xs text-slate-500 h-4 truncate">{expression || '...'}</div>
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
          <button onClick={handleDecimal} className="bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-600">.</button>
        </div>
      </div>
    </div>
  );
};
