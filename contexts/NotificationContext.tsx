
import React, { createContext, useContext, useState, ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Only auto-remove info/success messages after 8 seconds (longer than before).
    // Errors and warnings persist until clicked or navigated away.
    if (type === 'info' || type === 'success') {
        setTimeout(() => {
            removeNotification(id);
        }, 8000);
    }
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`
              pointer-events-auto min-w-[300px] max-w-sm px-4 py-3 rounded-lg shadow-xl border-l-4 text-white flex justify-between items-center animate-fade-in-down transition-all
              ${notification.type === 'success' ? 'bg-slate-800 border-emerald-500' : ''}
              ${notification.type === 'error' ? 'bg-slate-800 border-rose-500' : ''}
              ${notification.type === 'info' ? 'bg-slate-800 border-indigo-500' : ''}
              ${notification.type === 'warning' ? 'bg-slate-800 border-amber-500' : ''}
            `}
          >
            <div className="flex items-center gap-3">
                {notification.type === 'success' && <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {notification.type === 'error' && <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {notification.type === 'warning' && <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                <span className="text-sm font-medium leading-tight">{notification.message}</span>
            </div>
            <button onClick={() => removeNotification(notification.id)} className="ml-4 text-slate-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
