import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
    setNotifications((prev) => [...prev.slice(-2), { id, message, type }]); // Keep only last 3 to reduce clutter
    
    // Automatic dismissal for ALL types to respect user request for speed
    const timeout = type === 'error' || type === 'warning' ? 3500 : 2000;
    setTimeout(() => {
        removeNotification(id);
    }, timeout);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-[320px] sm:max-w-sm">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`
              pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-2xl backdrop-blur-md border-l-4 animate-slide-in transition-all duration-300
              ${notification.type === 'success' ? 'bg-emerald-600/95 border-emerald-300' : ''}
              ${notification.type === 'error' ? 'bg-rose-600/95 border-rose-300' : ''}
              ${notification.type === 'info' ? 'bg-indigo-600/95 border-indigo-300' : ''}
              ${notification.type === 'warning' ? 'bg-amber-600/95 border-amber-300' : ''}
              text-white
            `}
          >
            <div className="flex items-center gap-3">
                <div className="shrink-0">
                    {notification.type === 'success' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    {notification.type === 'error' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    {notification.type === 'warning' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    {notification.type === 'info' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <span className="text-sm font-bold leading-tight">{notification.message}</span>
            </div>
            <button onClick={() => removeNotification(notification.id)} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};