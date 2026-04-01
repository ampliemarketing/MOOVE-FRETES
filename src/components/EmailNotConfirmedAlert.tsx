import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, ExternalLink, CheckCircle, Copy, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard-helper';

interface EmailNotConfirmedAlertProps {
  onClose: () => void;
}

export function EmailNotConfirmedAlert({ onClose }: EmailNotConfirmedAlertProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const projectUrl = 'https://supabase.com/dashboard/project/hjdykjdhxepgfnkurvgr';
  const authProvidersUrl = `${projectUrl}/auth/providers`;
  const sqlEditorUrl = `${projectUrl}/sql/new`;
  
  const sqlScript = `-- Confirmar TODOS os emails de usuários
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE 
  email_confirmed_at IS NULL 
  OR confirmed_at IS NULL;

-- Ver resultado
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Não confirmado'
  END as status
FROM auth.users
ORDER BY created_at DESC;`;

  const copySQL = () => {
    copyToClipboard(sqlScript, 'SQL copiado! Cole no SQL Editor do Supabase');
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl"
        >
          <Card className="p-6 shadow-2xl border-2 border-red-500">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-900">
                    🚨 Email Não Confirmado
                  </h2>
                  <p className="text-sm text-red-700">
                    Correção rápida - 2 minutos
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Steps Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <div className={`w-16 h-0.5 ${step > 1 ? 'bg-primary' : 'bg-gray-200'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <div className={`w-16 h-0.5 ${step > 2 ? 'bg-primary' : 'bg-gray-200'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {/* Step 1: Desabilitar confirmação */}
              <div className={`p-4 rounded-lg border-2 ${
                step === 1 ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">
                      1
                    </span>
                    Desabilitar Confirmação de Email
                  </h3>
                  {step === 1 && (
                    <Button
                      size="sm"
                      onClick={() => setStep(2)}
                      variant="ghost"
                      className="text-xs"
                    >
                      Feito →
                    </Button>
                  )}
                </div>
                <ol className="space-y-2 text-sm text-gray-700 ml-8">
                  <li>1. Abra o Dashboard do Supabase</li>
                  <li>2. Role até encontrar "Email"</li>
                  <li>3. <strong>DESMARQUE</strong> o toggle "Confirm email"</li>
                  <li>4. Clique em "Save"</li>
                </ol>
                <Button
                  onClick={() => {
                    window.open(authProvidersUrl, '_blank');
                  }}
                  className="w-full mt-4 bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Dashboard do Supabase
                </Button>
              </div>

              {/* Step 2: Executar SQL */}
              <div className={`p-4 rounded-lg border-2 ${
                step === 2 ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">
                      2
                    </span>
                    Confirmar Usuários Existentes
                  </h3>
                  {step === 2 && (
                    <Button
                      size="sm"
                      onClick={() => setStep(3)}
                      variant="ghost"
                      className="text-xs"
                    >
                      Feito →
                    </Button>
                  )}
                </div>
                <ol className="space-y-2 text-sm text-gray-700 ml-8 mb-3">
                  <li>1. Abra o SQL Editor do Supabase</li>
                  <li>2. Cole o SQL abaixo</li>
                  <li>3. Clique em "Run"</li>
                </ol>
                
                {/* SQL Code Block */}
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                    {sqlScript}
                  </pre>
                  <Button
                    onClick={copySQL}
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                  >
                    {copiedSQL ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar SQL
                      </>
                    )}
                  </Button>
                </div>
                
                <Button
                  onClick={() => {
                    copySQL();
                    window.open(sqlEditorUrl, '_blank');
                  }}
                  className="w-full mt-4 bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Copiar SQL e Abrir Editor
                </Button>
              </div>

              {/* Step 3: Testar */}
              <div className={`p-4 rounded-lg border-2 ${
                step === 3 ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm">
                    3
                  </span>
                  Recarregar e Testar
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 ml-8">
                  <li>1. Recarregue esta página (F5)</li>
                  <li>2. Tente fazer login novamente</li>
                  <li>3. ✅ Deve funcionar!</li>
                </ol>
                {step === 3 && (
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Recarregar Página Agora
                  </Button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Dica:</strong> Após executar os passos 1 e 2, o login funcionará para todos os usuários (novos e existentes).
              </p>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Fechar (já executei os passos)
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
