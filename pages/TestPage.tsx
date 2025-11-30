import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Calculator } from '../components/Calculator';
import { GoogleGenAI, Type } from "@google/genai";
import { useNotification } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

export const TestPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [stage, setStage] = useState<'setup' | 'loading' | 'exam' | 'result'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState(0);

  const startExam = async () => {
    if (!topic.trim()) {
        showNotification("Please enter a topic to generate questions.", "error");
        return;
    }
    setStage('loading');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const level = auth?.user?.level || 100;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 10 multiple-choice questions for ${level} Level Finance students about "${topic}". The options must be an array of 4 strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            answerIndex: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
                        },
                        required: ["question", "options", "answerIndex"]
                    }
                }
            }
        });

        const data = JSON.parse(response.text);
        if (Array.isArray(data)) {
            setQuestions(data.map((q: any, idx: number) => ({
                id: idx,
                text: q.question,
                options: q.options,
                correctAnswer: q.answerIndex
            })));
            setStage('exam');
            setCurrentQuestionIndex(0);
            setUserAnswers({});
        } else {
            throw new Error("Invalid format received from AI");
        }

    } catch (e) {
        console.error(e);
        showNotification("Failed to generate test. Please try again.", "error");
        setStage('setup');
    }
  };

  const handleAnswer = (optionIdx: number) => {
      setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIdx }));
  };

  const handleNext = () => {
      if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
      }
  };

  const handlePrev = () => {
      if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(prev => prev - 1);
      }
  };

  const handleJumpTo = (idx: number) => {
      setCurrentQuestionIndex(idx);
  };

  const finishTest = () => {
      let s = 0;
      questions.forEach((q, idx) => {
          if (userAnswers[idx] === q.correctAnswer) s++;
      });
      setScore(s);
      setStage('result');
  };

  const resetTest = () => {
      setStage('setup');
      setTopic('');
      setQuestions([]);
      setUserAnswers({});
      setScore(0);
  };

  if (stage === 'setup') {
      return (
          <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center animate-fade-in-up">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Practice CBT</h1>
                  <p className="text-slate-500 mb-8">Test your knowledge with AI-generated questions tailored to your level.</p>
                  
                  <div className="text-left mb-6">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Topic or Course Code</label>
                      <input 
                        type="text" 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. FIN 201, Corporate Finance, Bonds"
                      />
                  </div>
                  
                  <button onClick={startExam} className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-transform hover:-translate-y-1">
                      Start Assessment
                  </button>
              </div>
          </div>
      );
  }

  if (stage === 'loading') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-slate-800">Generating Questions...</h2>
              <p className="text-slate-500">Our AI is crafting a unique test for you.</p>
          </div>
      );
  }

  if (stage === 'result') {
      const percentage = Math.round((score / questions.length) * 100);
      return (
          <div className="min-h-screen bg-slate-50 py-12 px-4">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                  <div className={`p-8 text-center text-white ${percentage >= 50 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      <h1 className="text-3xl font-bold mb-2">{percentage >= 50 ? 'Great Job!' : 'Keep Practicing'}</h1>
                      <div className="text-6xl font-black mb-2">{percentage}%</div>
                      <p className="opacity-90">You scored {score} out of {questions.length}</p>
                  </div>
                  <div className="p-8">
                      <h3 className="font-bold text-slate-800 mb-4 text-lg">Review Answers</h3>
                      <div className="space-y-6">
                          {questions.map((q, idx) => (
                              <div key={q.id} className="border-b border-slate-100 pb-4 last:border-0">
                                  <div className="flex gap-3">
                                      <span className="font-bold text-slate-400">0{idx + 1}.</span>
                                      <div className="flex-1">
                                          <p className="font-medium text-slate-800 mb-2">{q.text}</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                              {q.options.map((opt, oIdx) => {
                                                  const isCorrect = oIdx === q.correctAnswer;
                                                  const isSelected = userAnswers[idx] === oIdx;
                                                  let className = "p-2 rounded border ";
                                                  if (isCorrect) className += "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold";
                                                  else if (isSelected && !isCorrect) className += "bg-rose-50 border-rose-500 text-rose-700";
                                                  else className += "border-slate-200 text-slate-500";
                                                  
                                                  return (
                                                      <div key={oIdx} className={className}>
                                                          {opt} {isCorrect && '✓'} {isSelected && !isCorrect && '✗'}
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="mt-8 flex gap-4">
                          <button onClick={resetTest} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Take Another Test</button>
                          <Link to="/dashboard" className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-center">Back to Dashboard</Link>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // EXAM STAGE
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
          <div>
              <h1 className="text-xl font-bold text-slate-900">{topic || 'Finance Test'}</h1>
              <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={() => setShowCalculator(!showCalculator)}
                className={`p-2 rounded-lg transition-colors ${showCalculator ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                title="Toggle Calculator"
              >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </button>
          </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 items-start">
          
          {/* Main Question Card */}
          <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 md:p-10 flex-grow">
                  <h2 className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed mb-8">
                      {currentQ.text}
                  </h2>
                  
                  <div className="space-y-3">
                      {currentQ.options.map((option, idx) => (
                          <button
                              key={idx}
                              onClick={() => handleAnswer(idx)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                                  userAnswers[currentQuestionIndex] === idx 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                                  : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                              }`}
                          >
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  userAnswers[currentQuestionIndex] === idx 
                                  ? 'border-indigo-600' 
                                  : 'border-slate-300'
                              }`}>
                                  {userAnswers[currentQuestionIndex] === idx && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                              </div>
                              <span className="font-medium">{option}</span>
                          </button>
                      ))}
                  </div>
              </div>

              {/* Navigation Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
                  <button 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      Previous
                  </button>
                  
                  {currentQuestionIndex < questions.length - 1 ? (
                      <button 
                        onClick={handleNext} 
                        className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-colors"
                      >
                          Next
                      </button>
                  ) : (
                      <button 
                        onClick={() => window.confirm("Are you sure you want to finish the exam?") && finishTest()}
                        className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md transition-colors"
                      >
                          Finish Exam
                      </button>
                  )}
              </div>
          </div>

          {/* Sidebar / Question Map */}
          <div className="w-full md:w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-auto">
              <div className="bg-slate-50 border-b border-slate-200 p-4 text-center">
                  <h3 className="font-bold text-slate-800 text-sm uppercase">Question Map</h3>
              </div>
              <div className="p-4 grid grid-cols-5 gap-2 max-h-64 md:max-h-none overflow-y-auto">
                  {questions.map((_, idx) => {
                      const isAnswered = userAnswers[idx] !== undefined;
                      const isCurrent = currentQuestionIndex === idx;
                      return (
                          <button
                              key={idx}
                              onClick={() => handleJumpTo(idx)}
                              className={`aspect-square rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                  isCurrent 
                                  ? 'ring-2 ring-indigo-600 ring-offset-2 bg-indigo-100 text-indigo-700' 
                                  : isAnswered 
                                      ? 'bg-emerald-500 text-white shadow-sm' 
                                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                          >
                              {idx + 1}
                          </button>
                      );
                  })}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 space-y-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Answered</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded"></div> Unanswered</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-100 border border-indigo-600 rounded"></div> Current</div>
              </div>
              <div className="p-4 border-t border-slate-100">
                    <button 
                        onClick={() => window.confirm("Are you sure you want to submit?") && finishTest()}
                        className="w-full py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 shadow-sm transition-colors text-sm"
                    >
                        Submit Exam
                    </button>
              </div>
          </div>
      </div>

      {showCalculator && (
          <div className="fixed bottom-20 right-4 z-50 animate-fade-in-up">
              <Calculator />
          </div>
      )}
    </div>
  );
};