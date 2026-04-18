import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert } from './ui/enhanced-components';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  CPFInput,
  PhoneInput,
  CEPInput,
  EmailInput,
  FileUpload
} from './ui/enhanced-inputs';
import { 
  Truck, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  Camera,
  Car,
  CreditCard,
  FileCheck,
  Container
} from 'lucide-react';
import { formatRG, formatCNH, validateCEP } from '../utils/formatters';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { brazilianStates, getCitiesByState } from '../utils/brazil-locations';
import { toast } from 'sonner@2.0.3';

interface TruckerRegistrationProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

interface FormData {
  // Dados pessoais
  nome: string;
  rg: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  
  // Endereço
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  
  // Documentos profissionais
  cnh: string;
  categoriaCNH: string;
  validadeCNH: string;
  rntrc: string;
  validadeRNTRC: string;
  
  // Veículo
  placaVeiculo: string;
  marcaModelo: string;
  anoVeiculo: string;
  renavam: string;
  anttVeiculo: string;
  
  // Tipos de veículos e carrocerias
  tiposVeiculos: string[];
  tiposCarrocerias: string[];
  
  // Uploads
  uploads: {
    fotoRG?: File;
    fotoCPF?: File;
    fotoCNH?: File;
    fotoRNTRC?: File;
    fotoCRLV?: File;
    fotoComprovanteEndereco?: File;
    selfie?: File;
  };
}

const initialFormData: FormData = {
  nome: '',
  rg: '',
  cpf: '',
  dataNascimento: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cnh: '',
  categoriaCNH: '',
  validadeCNH: '',
  rntrc: '',
  validadeRNTRC: '',
  placaVeiculo: '',
  marcaModelo: '',
  anoVeiculo: '',
  renavam: '',
  anttVeiculo: '',
  tiposVeiculos: [],
  tiposCarrocerias: [],
  uploads: {}
};

export function TruckerRegistration({ onBack, onComplete }: TruckerRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidatingCPF, setIsValidatingCPF] = useState(false);
  const [isValidatingCNH, setIsValidatingCNH] = useState(false);

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const steps = [
    { id: 1, title: 'Dados Pessoais', icon: User },
    { id: 2, title: 'Endereço', icon: MapPin },
    { id: 3, title: 'CNH & RNTRC', icon: FileText },
    { id: 4, title: 'Dados do Veículo', icon: Truck },
    { id: 5, title: 'Tipo do Veículo', icon: Container },
    { id: 6, title: 'Upload de Documentos', icon: Upload }
  ];

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    // Permitir avançar sem validar campos obrigatórios
    setValidationErrors({});
    return true;
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFileUpload = (field: keyof FormData['uploads'], file: File) => {
    setFormData(prev => ({
      ...prev,
      uploads: {
        ...prev.uploads,
        [field]: file
      }
    }));
  };

  const validateCPF = async (cpf: string) => {
    if (cpf.length === 11) {
      setIsValidatingCPF(true);
      // Simular validação na Receita Federal
      setTimeout(() => {
        setIsValidatingCPF(false);
        // Aqui você faria a integração real com a API da Receita Federal
      }, 1500);
    }
  };

  const validateCNH = async (cnh: string) => {
    if (cnh.length >= 9) {
      setIsValidatingCNH(true);
      // Simular validação no DETRAN
      setTimeout(() => {
        setIsValidatingCNH(false);
        // Aqui você faria a integração real com a API do DETRAN
      }, 1500);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => updateFormData('nome', e.target.value)}
                  placeholder="Digite seu nome completo"
                  className={validationErrors.nome ? 'border-destructive' : ''}
                />
                {validationErrors.nome && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.nome}</p>
                )}
              </div>

              <div>
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => {
                    const formatted = formatRG(e.target.value);
                    if (formatted.length <= 12) {
                      updateFormData('rg', formatted);
                    }
                  }}
                  placeholder="00.000.000-0"
                  className={validationErrors.rg ? 'border-destructive' : ''}
                />
                {validationErrors.rg && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.rg}</p>
                )}
              </div>

              <CPFInput
                label="CPF"
                value={formData.cpf}
                onChange={(value) => updateFormData('cpf', value)}
                required
                error={validationErrors.cpf}
              />

              <div>
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => updateFormData('dataNascimento', e.target.value)}
                  className={validationErrors.dataNascimento ? 'border-destructive' : ''}
                />
                {validationErrors.dataNascimento && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.dataNascimento}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <PhoneInput
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(value) => updateFormData('telefone', value)}
                  required
                  error={validationErrors.telefone}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CEPInput
                label="CEP"
                value={formData.cep}
                onChange={(value) => updateFormData('cep', value)}
                onAddressData={(data) => {
                  updateFormData('endereco', data.logradouro);
                  updateFormData('bairro', data.bairro);
                  updateFormData('cidade', data.localidade);
                  updateFormData('estado', data.uf);
                }}
                required
                error={validationErrors.cep}
              />

              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => updateFormData('endereco', e.target.value)}
                  placeholder="Rua, Avenida..."
                  className={validationErrors.endereco ? 'border-destructive' : ''}
                />
                {validationErrors.endereco && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.endereco}</p>
                )}
              </div>

              <div>
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => updateFormData('numero', e.target.value)}
                  placeholder="123"
                  className={validationErrors.numero ? 'border-destructive' : ''}
                />
                {validationErrors.numero && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.numero}</p>
                )}
              </div>

              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento}
                  onChange={(e) => updateFormData('complemento', e.target.value)}
                  placeholder="Apto, Bloco..."
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => updateFormData('bairro', e.target.value)}
                  placeholder="Nome do bairro"
                  className={validationErrors.bairro ? 'border-destructive' : ''}
                />
                {validationErrors.bairro && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.bairro}</p>
                )}
              </div>

              <div>
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => {
                    updateFormData('estado', value);
                    // Limpar cidade se o estado mudar
                    if (formData.estado !== value) {
                      updateFormData('cidade', '');
                    }
                  }}
                >
                  <SelectTrigger className={validationErrors.estado ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label} ({state.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.estado && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.estado}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cidade">Cidade *</Label>
                <Select
                  value={formData.cidade}
                  onValueChange={(value) => updateFormData('cidade', value)}
                  disabled={!formData.estado}
                >
                  <SelectTrigger className={validationErrors.cidade ? 'border-destructive' : ''}>
                    <SelectValue placeholder={formData.estado ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.estado && getCitiesByState(formData.estado).map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.cidade && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.cidade}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnh">Número da CNH *</Label>
                <div className="relative">
                  <Input
                    id="cnh"
                    value={formData.cnh}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateFormData('cnh', value);
                      validateCNH(value);
                    }}
                    placeholder="00000000000"
                    className={validationErrors.cnh ? 'border-destructive' : ''}
                  />
                  {isValidatingCNH && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {validationErrors.cnh && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.cnh}</p>
                )}
              </div>

              <div>
                <Label htmlFor="categoriaCNH">Categoria da CNH *</Label>
                <Input
                  id="categoriaCNH"
                  value={formData.categoriaCNH}
                  onChange={(e) => updateFormData('categoriaCNH', e.target.value)}
                  placeholder="E"
                  className={validationErrors.categoriaCNH ? 'border-destructive' : ''}
                />
                {validationErrors.categoriaCNH && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.categoriaCNH}</p>
                )}
              </div>

              <div>
                <Label htmlFor="validadeCNH">Validade da CNH *</Label>
                <Input
                  id="validadeCNH"
                  type="date"
                  value={formData.validadeCNH}
                  onChange={(e) => updateFormData('validadeCNH', e.target.value)}
                  className={validationErrors.validadeCNH ? 'border-destructive' : ''}
                />
                {validationErrors.validadeCNH && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.validadeCNH}</p>
                )}
              </div>

              <div>
                <Label htmlFor="rntrc">RNTRC *</Label>
                <Input
                  id="rntrc"
                  value={formData.rntrc}
                  onChange={(e) => updateFormData('rntrc', e.target.value)}
                  placeholder="00000000000"
                  className={validationErrors.rntrc ? 'border-destructive' : ''}
                />
                {validationErrors.rntrc && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.rntrc}</p>
                )}
              </div>

              <div>
                <Label htmlFor="validadeRNTRC">Validade do RNTRC *</Label>
                <Input
                  id="validadeRNTRC"
                  type="date"
                  value={formData.validadeRNTRC}
                  onChange={(e) => updateFormData('validadeRNTRC', e.target.value)}
                  className={validationErrors.validadeRNTRC ? 'border-destructive' : ''}
                />
                {validationErrors.validadeRNTRC && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.validadeRNTRC}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="placaVeiculo">Placa do Veículo *</Label>
                <Input
                  id="placaVeiculo"
                  value={formData.placaVeiculo}
                  onChange={(e) => updateFormData('placaVeiculo', e.target.value)}
                  placeholder="ABC-1234 ou ABC1D23"
                  className={validationErrors.placaVeiculo ? 'border-destructive' : ''}
                />
                {validationErrors.placaVeiculo && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.placaVeiculo}</p>
                )}
              </div>

              <div>
                <Label htmlFor="marcaModelo">Marca/Modelo *</Label>
                <Input
                  id="marcaModelo"
                  value={formData.marcaModelo}
                  onChange={(e) => updateFormData('marcaModelo', e.target.value)}
                  placeholder="Scania R450"
                  className={validationErrors.marcaModelo ? 'border-destructive' : ''}
                />
                {validationErrors.marcaModelo && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.marcaModelo}</p>
                )}
              </div>

              <div>
                <Label htmlFor="anoVeiculo">Ano do Veículo *</Label>
                <Input
                  id="anoVeiculo"
                  value={formData.anoVeiculo}
                  onChange={(e) => updateFormData('anoVeiculo', e.target.value)}
                  placeholder="2020"
                  className={validationErrors.anoVeiculo ? 'border-destructive' : ''}
                />
                {validationErrors.anoVeiculo && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.anoVeiculo}</p>
                )}
              </div>

              <div>
                <Label htmlFor="renavam">RENAVAM *</Label>
                <Input
                  id="renavam"
                  value={formData.renavam}
                  onChange={(e) => updateFormData('renavam', e.target.value)}
                  placeholder="00000000000"
                  className={validationErrors.renavam ? 'border-destructive' : ''}
                />
                {validationErrors.renavam && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.renavam}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="anttVeiculo">ANTT do Veículo *</Label>
                <Input
                  id="anttVeiculo"
                  value={formData.anttVeiculo}
                  onChange={(e) => updateFormData('anttVeiculo', e.target.value)}
                  placeholder="Número do registro ANTT do veículo"
                  className={validationErrors.anttVeiculo ? 'border-destructive' : ''}
                />
                {validationErrors.anttVeiculo && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.anttVeiculo}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <VehicleTypeSelector
              selectedVehicles={formData.tiposVeiculos}
              selectedTrailers={formData.tiposCarrocerias}
              onVehiclesChange={(vehicles) => updateFormData('tiposVeiculos', vehicles)}
              onTrailersChange={(trailers) => updateFormData('tiposCarrocerias', trailers)}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUpload
                label="Foto do RG"
                onFileSelect={(file) => handleFileUpload('fotoRG', file)}
                file={formData.uploads.fotoRG}
                onRemove={() => handleFileUpload('fotoRG', undefined as any)}
                required
              />

              <FileUpload
                label="Foto do CPF"
                onFileSelect={(file) => handleFileUpload('fotoCPF', file)}
                file={formData.uploads.fotoCPF}
                onRemove={() => handleFileUpload('fotoCPF', undefined as any)}
                required
              />

              <FileUpload
                label="Foto da CNH"
                onFileSelect={(file) => handleFileUpload('fotoCNH', file)}
                file={formData.uploads.fotoCNH}
                onRemove={() => handleFileUpload('fotoCNH', undefined as any)}
                required
              />

              <FileUpload
                label="Foto do RNTRC"
                onFileSelect={(file) => handleFileUpload('fotoRNTRC', file)}
                file={formData.uploads.fotoRNTRC}
                onRemove={() => handleFileUpload('fotoRNTRC', undefined as any)}
                required
              />

              <FileUpload
                label="Foto do CRLV"
                onFileSelect={(file) => handleFileUpload('fotoCRLV', file)}
                file={formData.uploads.fotoCRLV}
                onRemove={() => handleFileUpload('fotoCRLV', undefined as any)}
                required
              />

              <FileUpload
                label="Comprovante de Endereço"
                onFileSelect={(file) => handleFileUpload('fotoComprovanteEndereco', file)}
                file={formData.uploads.fotoComprovanteEndereco}
                onRemove={() => handleFileUpload('fotoComprovanteEndereco', undefined as any)}
                required
              />

              <div className="md:col-span-2">
                <FileUpload
                  label="Selfie com RG"
                  onFileSelect={(file) => handleFileUpload('selfie', file)}
                  file={formData.uploads.selfie}
                  onRemove={() => handleFileUpload('selfie', undefined as any)}
                  required
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    
    // ✅ NÃO fazer upload aqui - será feito APÓS signUp no AuthScreen
    // Os Files serão passados no objeto e uploadados quando o usuário já existir
    
    // Preparar dados para salvar no banco COM Files (não paths ainda)
    const dataToSubmit = {
      ...formData,
      // ✅ Manter Files no objeto - serão uploadados no AuthScreen após signUp
      uploads: formData.uploads,
    };
    
    
    onComplete(dataToSubmit);
  };

  const handleBackToSelection = () => {
    // Volta para a tela de seleção de tipo de usuário
    onBack();
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoMaisFrete} 
              alt="MaisFrete" 
              className="h-16 w-auto"
            />
          </div>

          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={onBack} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Truck className="w-6 h-6 text-primary" />
                <h1 className="text-2xl xl:text-3xl font-semibold text-foreground">
                  Cadastro de Caminhoneiro
                </h1>
              </div>
              <p className="text-muted-foreground">
                Etapa {currentStep} de {totalSteps}
              </p>
            </div>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-6">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </motion.div>

        {/* Form Content */}
        <Card className="bg-white shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5 text-accent" })}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[calc(100vh-32rem)] overflow-y-auto px-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </CardContent>
          
          {/* Navigation buttons - OUTSIDE CardContent to always be visible */}
          <div className="px-6 pb-6">
            <div className="flex justify-between pt-6 border-t border-light">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? onBack : prevStep}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>

              {currentStep === totalSteps ? (
                <Button
                  onClick={handleSubmit}
                  className="bg-accent hover:bg-accent/90 text-white flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalizar Cadastro
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                >
                  Próxima Etapa
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}