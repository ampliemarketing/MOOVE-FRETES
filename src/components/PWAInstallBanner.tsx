import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { usePWAInstall } from '../utils/hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if user already dismissed the banner
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!canInstall || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-light p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground mb-1">
                Instalar MaisFrete
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Adicione à tela inicial para acesso rápido e modo offline
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Instalar
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                >
                  Agora não
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
