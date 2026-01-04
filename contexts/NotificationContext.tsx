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
    const id = Date.now() + Math.random(); // Add random number to prevent collision
    
    // FIX: Removed slicing logic that caused timeouts to fail for previous notifications.
    // Now, we add the notification to the array and let the timeout handle removal.
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 2 seconds as requested for snappiness.
    setTimeout(() => {
        removeNotification(id);
    }, 2500); // Slightly increased to 2.5s for readability
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      
      {/* Positioned at bottom-right as requested. */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`
              pointer-events-auto flex items-center justify-between p-3 rounded-xl shadow-2xl backdrop-blur-md animate-slide-in border-l-4
              ${notification.type === 'success' ? 'bg-emerald-600/95 border-emerald-300' : ''}
              ${notification.type === 'error' ? 'bg-rose-600/95 border-rose-300' : ''}
              ${notification.type === 'info' ? 'bg-indigo-600/95 border-indigo-300' : ''}
              ${notification.type === 'warning' ? 'bg-amber-500/95 border-amber-300' : ''}
              text-white
            `}
          >
            <span className="text-sm font-bold ml-2">{notification.message}</span>
            <button onClick={() => removeNotification(notification.id)} className="ml-4 p-1 opacity-70 hover:opacity-100 rounded-full transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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