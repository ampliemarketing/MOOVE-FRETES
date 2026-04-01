import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Truck, 
  Building, 
  User, 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Package,
  Navigation
} from 'lucide-react';
import logoMaisFrete from '../assets/logo-moovefretes.png';

interface UserTypeSelectionProps {
  onSelectType: (type: 'caminhoneiro' | 'transportadora' | 'agenciador') => void;
  onBack?: () => void;
}

export function UserTypeSelection({ onSelectType, onBack }: UserTypeSelectionProps) {
  const userTypes = [
    {
      id: 'caminhoneiro',
      title: 'Caminhoneiro',
      subtitle: 'Motorista Profissional',
      description: 'Sou um motorista autônomo ou trabalho para uma transportadora',
      icon: Truck,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      benefits: [
        'Encontre fretes diretamente',
        'Gerencie sua agenda',
        'Receba pagamentos seguros',
        'Aumente sua renda mensal'
      ],
      requirements: [
        'CNH categoria E',
        'RNTRC válido',
        'CRLV do veículo'
      ]
    },
    {
      id: 'transportadora',
      title: 'Transportadora',
      subtitle: 'Empresa de Transporte / Agenciador',
      description: 'Tenho uma empresa de transportes ou atuo como agenciador de cargas',
      icon: Building,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      benefits: [
        'Gerencie sua frota ou rede',
        'Encontre cargas rapidamente',
        'Controle de operações',
        'Relatórios financeiros completos'
      ],
      requirements: [
        'CNPJ ativo (empresas)',
        'CPF (pessoa física)',
        'Documentos do representante'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto py-8 px-4 min-h-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {onBack && (
            <div className="flex items-center mb-4">
              <Button variant="outline" onClick={onBack} className="p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1" />
            </div>
          )}
          <div className="flex items-center justify-center mb-4">
            <img 
              src={logoMaisFrete} 
              alt="MaisFrete" 
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-3xl xl:text-4xl font-semibold text-foreground mb-2">
            Junte-se ao MaisFrete
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha seu perfil e comece a fazer parte da maior plataforma de logística do Brasil
          </p>
        </motion.div>

        {/* User Type Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {userTypes.map((type, index) => {
            const Icon = type.icon;
            
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-white shadow-card hover:shadow-card-hover transition-all duration-300 border-light">
                  <CardContent className="p-0">
                    {/* Header Section */}
                    <div className={`${type.bgColor} p-6 rounded-t-xl`}>
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shadow-sm mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-semibold ${type.textColor} mb-1`}>
                          {type.title}
                        </h3>
                        <p className={`text-sm ${type.textColor} opacity-80 mb-3`}>
                          {type.subtitle}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>

                    {/* Benefits Section */}
                    <div className="p-6">
                      <div className="mb-6">
                        <h4 className="font-medium text-foreground mb-3 flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          Benefícios
                        </h4>
                        <ul className="space-y-2">
                          {type.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center text-sm text-muted-foreground">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Requirements */}
                      <div className="mb-6">
                        <h4 className="font-medium text-foreground mb-3 flex items-center">
                          <Package className="w-4 h-4 text-accent mr-2" />
                          Documentos Necessários
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {type.requirements.map((req, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => onSelectType(type.id as any)}
                        className={`w-full bg-gradient-to-r ${type.color} hover:opacity-90 text-white shadow-sm`}
                      >
                        Escolher {type.title}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Cadastro 100% Seguro e Gratuito
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Seus documentos são protegidos com criptografia de ponta e validados automaticamente. 
                O processo de cadastro é totalmente gratuito e você pode começar a usar imediatamente.
              </p>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  Verificação Automática
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  Dados Protegidos
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  Aprovação Rápida
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}