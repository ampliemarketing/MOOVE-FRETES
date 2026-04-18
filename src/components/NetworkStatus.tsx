import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';
import { setupNetworkListeners, isOnline } from '../utils/pwa';

export function NetworkStatus() {
  const [online, setOnline] = React.useState(isOnline());
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    const cleanup = setupNetworkListeners(
      () => {
        setOnline(true);
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 3000);
      },
      () => {
        setOnline(false);
        setShowBanner(true);
      }
    );

    return cleanup;
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl ${
              online
                ? 'bg-green-50 border border-green-200'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            {online ? (
              <>
                <Wifi className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Conexão restaurada</p>
                  <p className="text-sm text-green-700">Você está online novamente</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Sem conexão</p>
                  <p className="text-sm text-orange-700">Alguns recursos podem estar limitados</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
