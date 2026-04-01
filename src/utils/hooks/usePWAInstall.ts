import { useState, useEffect } from 'react';
import { setupInstallPrompt, showInstallPrompt, isPWA } from '../pwa';

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    setIsInstalled(isPWA());

    // Setup install prompt listener
    setupInstallPrompt((installable) => {
      setCanInstall(installable && !isPWA());
    });
  }, []);

  const install = async () => {
    if (!canInstall) {
      return false;
    }

    const accepted = await showInstallPrompt();
    if (accepted) {
      setCanInstall(false);
      setIsInstalled(true);
    }
    return accepted;
  };

  return {
    canInstall,
    isInstalled,
    install,
  };
}
