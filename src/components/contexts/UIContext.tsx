/**
 * UIContext — estado de interface que muda frequentemente
 * Separado do AppContext para evitar re-renders desnecessários em
 * componentes que só precisam de dados de usuário/negócio.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface UIState {
  darkMode: boolean;
  activeScreen: string;
  connectionStatus: 'online' | 'offline' | 'syncing';
  lastSync: string | null;
}

interface UIContextValue {
  uiState: UIState;
  toggleDarkMode: () => void;
  setActiveScreen: (screen: string) => void;
  setConnectionStatus: (status: 'online' | 'offline' | 'syncing') => void;
  setLastSync: (ts: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

function getStoredDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('maisfrete-dark-mode') === 'true';
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [uiState, setUIState] = useState<UIState>({
    darkMode: getStoredDarkMode(),
    activeScreen: 'dashboard',
    connectionStatus: 'online',
    lastSync: null,
  });

  // Persistência e aplicação do dark mode
  useEffect(() => {
    localStorage.setItem('maisfrete-dark-mode', uiState.darkMode.toString());
    if (uiState.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [uiState.darkMode]);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline = () =>
      setUIState((prev) => ({ ...prev, connectionStatus: 'online' }));
    const handleOffline = () =>
      setUIState((prev) => ({ ...prev, connectionStatus: 'offline' }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: UIContextValue = {
    uiState,
    toggleDarkMode: () => setUIState((prev) => ({ ...prev, darkMode: !prev.darkMode })),
    setActiveScreen: (screen) => setUIState((prev) => ({ ...prev, activeScreen: screen })),
    setConnectionStatus: (status) => setUIState((prev) => ({ ...prev, connectionStatus: status })),
    setLastSync: (ts) => setUIState((prev) => ({ ...prev, lastSync: ts })),
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
