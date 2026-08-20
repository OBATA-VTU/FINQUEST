
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';

interface DriveContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const DriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('drive_token'));
  const { showNotification } = useNotification();

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('drive_token', accessToken);
    } else {
      localStorage.removeItem('drive_token');
    }
  }, [accessToken]);

  const connect = () => {
    try {
      // @ts-ignore
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-id', // We rely on the platform's client ID if possible
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            showNotification("Google Drive Connected", "success");
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error("GSI Error:", e);
      showNotification("Failed to initialize Google Auth", "error");
    }
  };

  const disconnect = () => {
    setAccessToken(null);
    showNotification("Google Drive Disconnected", "info");
  };

  return (
    <DriveContext.Provider value={{ accessToken, setAccessToken, connect, disconnect, isConnected: !!accessToken }}>
      {children}
    </DriveContext.Provider>
  );
};

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) throw new Error("useDrive must be used within a DriveProvider");
  return context;
};
