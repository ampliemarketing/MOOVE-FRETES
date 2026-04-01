// MooveFretes - Sistema Completo de Logística v3.0 - React Router Migration
import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { NetworkStatus } from './components/NetworkStatus';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineModeBanner } from './components/OfflineModeBanner';
import { NotificationProvider } from './components/NotificationProvider';
import { AppProvider } from './components/contexts/AppContext';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { useGlobalMessageNotifications } from './hooks/useGlobalMessageNotifications';
import './utils/offline-mode';
import './utils/debug-driver-check';

// Component to hook into auth context for global notifications
function GlobalNotifications() {
  const { user, authenticated } = useAuth();
  useGlobalMessageNotifications(user?.id);

  return (
    <>
      <NetworkStatus />
      {authenticated && <PWAInstallBanner />}
      <OfflineModeBanner />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <NotificationProviderWrapper>
          <RouterProvider router={router} />
          <GlobalNotifications />
          <Toaster position="top-right" />
        </NotificationProviderWrapper>
      </AuthProvider>
    </AppProvider>
  );
}

// Wrapper that reads userId from AuthContext for NotificationProvider
function NotificationProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <NotificationProvider userId={user?.id}>
      <div className="relative min-h-screen">
        {children}
      </div>
    </NotificationProvider>
  );
}

export default App;
