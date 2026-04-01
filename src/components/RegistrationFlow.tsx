import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserTypeSelection } from './UserTypeSelection';
import { UnifiedRegistration } from './UnifiedRegistration';
import { DatabaseErrorAlert } from './DatabaseErrorAlert';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Mail,
  FileText,
  Truck,
  Building,
  Navigation,
  Phone,
  MessageCircle
} from 'lucide-react';
import logoMaisFrete from '../assets/logo-moovefretes.png';

type RegistrationStep = 'type-selection' | 'unified-registration' | 'success' | 'pending-approval';
type UserType = 'caminhoneiro' | 'transportadora' | 'agenciador';

interface RegistrationFlowProps {
  onComplete: (userData: any) => void;
  onBackToAuth: () => void;
  selectedUserType?: 'caminhoneiro' | 'transportadora' | null;
}

export function RegistrationFlow({ onComplete, onBackToAuth, selectedUserType = null }: RegistrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(selectedUserType ? 'unified-registration' : 'type-selection');
  const [selectedUserTypeInternal, setSelectedUserTypeInternal] = useState<UserType | null>(selectedUserType);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [showDatabaseError, setShowDatabaseError] = useState(false);

  const handleUserTypeSelect = (userType: 'caminhoneiro' | 'transportadora' | 'agenciador') => {
    setSelectedUserTypeInternal(userType);
    setCurrentStep('unified-registration');
  };

  const handleRegistrationComplete = async (data: any) => {
    setRegistrationData(data);
    console.log('✅ Registro completo - redirecionando para onComplete');
    await onComplete(data);
  };

  const getUserTypeInfo = (type: UserType) => {
    const configs = {
      caminhoneiro: {
        icon: Truck,
        label: 'Caminhoneiro',
        description: 'Motorista Profissional',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      transportadora: {
        icon: Building,
        label: 'Transportadora',
        description: 'Empresa de Transporte',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      agenciador: {
        icon: Navigation,
        label: 'Agenciador',
        description: 'Intermediador de Cargas',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    };
    return configs[type];
  };

  const renderPendingApproval = () => (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="min-h-full flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoMaisFrete} 
              alt="MaisFrete" 
              className="h-16 w-auto"
            />
          </div>

          <Card className="bg-white shadow-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Analisando Documentos
              </h2>
              <p className="text-muted-foreground mb-6">
                Estamos validando suas informações e documentos. Este processo pode levar alguns minutos.
              </p>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Documentos recebidos</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Validando informações...</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Aprovação final</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => {
    if (!selectedUserTypeInternal) return null;
    
    const typeInfo = getUserTypeInfo(selectedUserTypeInternal);
    const TypeIcon = typeInfo.icon;

    return (
      <div className="fixed inset-0 bg-background overflow-y-auto">
        <div className="min-h-full flex items-center justify-center py-8 px-4">
          <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <img 
                src={logoMaisFrete} 
                alt="MaisFrete" 
                className="h-16 w-auto"
              />
            </div>

            <Card className="bg-white shadow-card">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: 1 }}
                  >
                    <CheckCircle className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
                
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Cadastro Aprovado!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Parabéns! Seu cadastro como {typeInfo.label.toLowerCase()} foi aprovado com sucesso.
                </p>

                <div className={`${typeInfo.bgColor} border border-light rounded-lg p-4 mb-6`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-white flex items-center justify-center ${typeInfo.color}`}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{typeInfo.label}</p>
                      <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Documentos validados</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Perfil ativado</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Pronto para usar</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-accent mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-medium text-accent mb-1">E-mail de Confirmação Enviado</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviamos um e-mail de boas-vindas com informações importantes para {registrationData?.email || 'seu e-mail'}.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white"
                  onClick={() => onComplete({ userType: selectedUserTypeInternal, ...registrationData })}
                >
                  Começar a Usar MaisFrete
                </Button>
              </CardContent>
            </Card>

            {/* Support info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Precisa de ajuda? Entre em contato conosco:
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>(11) 3000-0000</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>Chat 24/7</span>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {currentStep === 'type-selection' && (
        <motion.div
          key="type-selection"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <UserTypeSelection 
            onSelectType={handleUserTypeSelect}
            onBack={onBackToAuth}
          />
        </motion.div>
      )}

      {currentStep === 'unified-registration' && selectedUserTypeInternal && (
        <motion.div
          key="unified-registration"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <UnifiedRegistration
            userType={selectedUserTypeInternal}
            onComplete={handleRegistrationComplete}
            onBack={selectedUserType ? onBackToAuth : () => setCurrentStep('type-selection')}
          />
        </motion.div>
      )}

      {currentStep === 'pending-approval' && (
        <motion.div
          key="pending-approval"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {renderPendingApproval()}
        </motion.div>
      )}

      {currentStep === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {renderSuccess()}
        </motion.div>
      )}

      {showDatabaseError && (
        <DatabaseErrorAlert
          onClose={() => setShowDatabaseError(false)}
        />
      )}
    </AnimatePresence>
  );
}