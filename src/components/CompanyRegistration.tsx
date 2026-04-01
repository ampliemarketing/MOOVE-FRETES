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
import { Switch } from './ui/switch';
import { 
  CNPJInput,
  CPFInput,
  PhoneInput,
  CEPInput,
  EmailInput,
  FileUpload
} from './ui/enhanced-inputs';
import { 
  Building, 
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
  Navigation,
  X
} from 'lucide-react';
import { formatRG } from '../utils/formatters';
import logoMaisFrete from '../assets/logo-moovefretes.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { brazilianStates, getCitiesByState } from '../utils/brazil-locations';
import { toast } from 'sonner';

interface CompanyRegistrationProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

interface FormData {
  // Seleção do tipo de empresa
  companyType: 'transportadora' | 'agenciador';
  
  // Dados da empresa
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  isentoIE: boolean;
  inscricaoMunicipal: string;
  telefone: string;
  email: string;
  
  // Endereço
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  
  // Representante legal
  nomeRepresentante: string;
  cpfRepresentante: string;
  rgRepresentante: string;
  telefoneRepresentante: string;
  emailRepresentante: string;
  tipoVinculo: string;
  
  // Documentos específicos (apenas transportadora)
  rntrc?: string;
  validadeRNTRC?: string;
  
  // Pessoa física (agenciador)
  isPessoaFisica: boolean;
  cpfPrincipal?: string;
  cnhRepresentante?: string;
  
  // Uploads
  uploads: {
    fotoPerfil?: File;
    fotoContrato?: File;
    fotoCNPJ?: File;
    fotoIE?: File;
    fotoIM?: File;
    fotoRNTRC?: File;
    fotoRGRepresentante?: File;
    fotoCPFRepresentante?: File;
    fotoComprovanteVinculo?: File;
    fotoComprovanteEndereco?: File;
    fotoCNHRepresentante?: File;
  };
}

const initialFormData: FormData = {
  companyType: 'transportadora',
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  inscricaoEstadual: '',
  isentoIE: false,
  inscricaoMunicipal: '',
  telefone: '',
  email: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nomeRepresentante: '',
  cpfRepresentante: '',
  rgRepresentante: '',
  telefoneRepresentante: '',
  emailRepresentante: '',
  tipoVinculo: '',
  isPessoaFisica: false,
  uploads: {}
};

export function CompanyRegistration({ onBack, onComplete }: CompanyRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidatingCNPJ, setIsValidatingCNPJ] = useState(false);

  const isTransportadora = formData.companyType === 'transportadora';
  const totalSteps = isTransportadora ? 5 : 4; // Transportadora tem step extra para RNTRC
  const progressPercentage = (currentStep / totalSteps) * 100;

  const getSteps = () => {
    const baseSteps = [
      { id: 1, title: 'Dados da Empresa', icon: Building },
      { id: 2, title: 'Endereço', icon: MapPin },
      { id: 3, title: 'Representante Legal', icon: User }
    ];

    if (isTransportadora) {
      baseSteps.push({ id: 4, title: 'RNTRC', icon: Shield });
    }
    
    baseSteps.push({ 
      id: isTransportadora ? 5 : 4, 
      title: 'Upload de Documentos', 
      icon: Upload 
    });

    return baseSteps;
  };

  const steps = getSteps();

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

  const validateCNPJ = async (cnpj: string) => {
    if (cnpj.length === 14) {
      setIsValidatingCNPJ(true);
      // Simular validação na Receita Federal
      setTimeout(() => {
        setIsValidatingCNPJ(false);
        // Aqui você faria a integração real com a API da Receita Federal
      }, 1500);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.isPessoaFisica) {
          if (!formData.razaoSocial?.trim()) errors.razaoSocial = 'Razão social é obrigatória';
          if (!formData.cnpj?.trim()) errors.cnpj = 'CNPJ é obrigatório';
          if (!formData.isentoIE && !formData.inscricaoEstadual?.trim()) {
            errors.inscricaoEstadual = 'Inscrição Estadual é obrigatória';
          }
        } else {
          if (!formData.razaoSocial?.trim()) errors.razaoSocial = 'Nome completo é obrigatório';
          if (!formData.cpfPrincipal?.trim()) errors.cpfPrincipal = 'CPF é obrigatório';
        }
        if (!formData.telefone?.trim()) errors.telefone = 'Telefone é obrigatório';
        if (!formData.email?.trim()) errors.email = 'E-mail é obrigatório';
        break;
      
      case 2:
        if (!formData.cep?.trim()) errors.cep = 'CEP é obrigatório';
        if (!formData.endereco?.trim()) errors.endereco = 'Endereço é obrigatório';
        if (!formData.numero?.trim()) errors.numero = 'Número é obrigatório';
        if (!formData.bairro?.trim()) errors.bairro = 'Bairro é obrigatório';
        if (!formData.cidade?.trim()) errors.cidade = 'Cidade é obrigatória';
        if (!formData.estado?.trim()) errors.estado = 'Estado é obrigatório';
        break;
      
      case 3:
        if (!formData.nomeRepresentante?.trim()) errors.nomeRepresentante = 'Nome do representante é obrigatório';
        if (!formData.cpfRepresentante?.trim()) errors.cpfRepresentante = 'CPF do representante é obrigatório';
        if (!formData.rgRepresentante?.trim()) errors.rgRepresentante = 'RG do representante é obrigatório';
        if (!formData.tipoVinculo?.trim()) errors.tipoVinculo = 'Tipo de vínculo é obrigatório';
        break;
      
      case 4:
        if (isTransportadora) {
          if (!formData.rntrc?.trim()) errors.rntrc = 'RNTRC é obrigatório para transportadoras';
          if (!formData.validadeRNTRC) errors.validadeRNTRC = 'Validade do RNTRC é obrigatória';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
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

  const handleBackToSelection = () => {
    // Volta para a tela de seleção de tipo de usuário
    onBack();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Seleção do tipo de empresa */}
            <div className="bg-surface-50 border border-light rounded-lg p-4">
              <Label className="text-sm font-medium mb-3 block">Tipo de Atividade *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData('companyType', 'transportadora')}
                  className={`p-4 rounded-lg border transition-all ${
                    formData.companyType === 'transportadora'
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-light bg-white text-muted-foreground hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building className={`w-5 h-5 ${
                      formData.companyType === 'transportadora' ? 'text-purple-600' : 'text-muted-foreground'
                    }`} />
                    <div className="text-left">
                      <div className="font-medium">Transportadora</div>
                      <div className="text-xs opacity-70">Empresa com frota própria</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateFormData('companyType', 'agenciador')}
                  className={`p-4 rounded-lg border transition-all ${
                    formData.companyType === 'agenciador'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-light bg-white text-muted-foreground hover:border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Navigation className={`w-5 h-5 ${
                      formData.companyType === 'agenciador' ? 'text-green-600' : 'text-muted-foreground'
                    }`} />
                    <div className="text-left">
                      <div className="font-medium">Agenciador</div>
                      <div className="text-xs opacity-70">Intermediador de cargas</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tipo de pessoa (apenas para agenciador) */}
            {formData.companyType === 'agenciador' && (
              <div className="bg-surface-50 border border-light rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tipo de pessoa</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.isPessoaFisica ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.isPessoaFisica}
                    onCheckedChange={(checked) => updateFormData('isPessoaFisica', checked)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={formData.isPessoaFisica && formData.companyType === 'agenciador' ? 'md:col-span-2' : ''}>
                <Label htmlFor="razaoSocial">
                  {formData.isPessoaFisica && formData.companyType === 'agenciador' ? 'Nome Completo *' : 'Razão Social *'}
                </Label>
                <Input
                  id="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={(e) => updateFormData('razaoSocial', e.target.value)}
                  placeholder={formData.isPessoaFisica ? "Seu nome completo" : "Nome da empresa"}
                  className={validationErrors.razaoSocial ? 'border-destructive' : ''}
                />
                {validationErrors.razaoSocial && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.razaoSocial}</p>
                )}
              </div>

              {!formData.isPessoaFisica && (
                <div>
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input
                    id="nomeFantasia"
                    value={formData.nomeFantasia}
                    onChange={(e) => updateFormData('nomeFantasia', e.target.value)}
                    placeholder="Nome comercial"
                  />
                </div>
              )}

              <div>
                <Label htmlFor={formData.isPessoaFisica ? "cpfPrincipal" : "cnpj"}>
                  {formData.isPessoaFisica ? 'CPF *' : 'CNPJ *'}
                </Label>
                {formData.isPessoaFisica ? (
                  <CPFInput
                    label=""
                    value={formData.cpfPrincipal || ''}
                    onChange={(value) => updateFormData('cpfPrincipal', value)}
                    error={validationErrors.cpfPrincipal}
                  />
                ) : (
                  <CNPJInput
                    label=""
                    value={formData.cnpj}
                    onChange={(value) => updateFormData('cnpj', value)}
                    onCompanyData={(data) => {
                      // Auto-preencher dados da empresa
                      updateFormData('razaoSocial', data.razao_social);
                      updateFormData('nomeFantasia', data.nome_fantasia || '');
                      updateFormData('endereco', data.logradouro);
                      updateFormData('numero', data.numero);
                      updateFormData('bairro', data.bairro);
                      updateFormData('cidade', data.municipio);
                      updateFormData('estado', data.uf);
                      updateFormData('cep', data.cep);
                      updateFormData('telefone', data.telefone || '');
                    }}
                    error={validationErrors.cnpj}
                  />
                )}
              </div>

              {!formData.isPessoaFisica && (
                <>
                  <div>
                    <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricaoEstadual"
                      value={formData.inscricaoEstadual}
                      onChange={(e) => updateFormData('inscricaoEstadual', e.target.value)}
                      placeholder="000.000.000.000"
                      disabled={formData.isentoIE}
                      className={validationErrors.inscricaoEstadual ? 'border-destructive' : ''}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={formData.isentoIE}
                        onCheckedChange={(checked) => {
                          updateFormData('isentoIE', checked);
                          if (checked) updateFormData('inscricaoEstadual', '');
                        }}
                      />
                      <Label className="text-sm">Isento de Inscrição Estadual</Label>
                    </div>
                    {validationErrors.inscricaoEstadual && (
                      <p className="text-destructive text-sm mt-1">{validationErrors.inscricaoEstadual}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                    <Input
                      id="inscricaoMunicipal"
                      value={formData.inscricaoMunicipal}
                      onChange={(e) => updateFormData('inscricaoMunicipal', e.target.value)}
                      placeholder="000000"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="telefone">Telefone Comercial *</Label>
                <PhoneInput
                  label=""
                  value={formData.telefone}
                  onChange={(value) => updateFormData('telefone', value)}
                  error={validationErrors.telefone}
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail Corporativo *</Label>
                <EmailInput
                  label=""
                  value={formData.email}
                  onChange={(value) => updateFormData('email', value)}
                  error={validationErrors.email}
                />
              </div>
              
              {/* Foto de Perfil */}
              <div className="md:col-span-2">
                <Label htmlFor="fotoPerfil">Foto de Perfil do Representante</Label>
                <div className="mt-2 flex items-center gap-4">
                  {formData.uploads.fotoPerfil ? (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(formData.uploads.fotoPerfil)}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleFileUpload('fotoPerfil', undefined as any)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('fotoPerfil', file);
                        }
                      }}
                      className="hidden"
                      id="fotoPerfil"
                    />
                    <label htmlFor="fotoPerfil">
                      <Button type="button" variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {formData.uploads.fotoPerfil ? 'Alterar Foto' : 'Selecionar Foto'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formato: JPG, PNG. Tamanho máximo: 5MB.
                    </p>
                  </div>
                </div>
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
                <Label htmlFor="endereco">Endereço *</Label>
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
                  placeholder="Sala, Andar..."
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
              <div className="md:col-span-2">
                <Label htmlFor="nomeRepresentante">Nome do Representante Legal *</Label>
                <Input
                  id="nomeRepresentante"
                  value={formData.nomeRepresentante}
                  onChange={(e) => updateFormData('nomeRepresentante', e.target.value)}
                  placeholder="Nome completo do representante"
                  className={validationErrors.nomeRepresentante ? 'border-destructive' : ''}
                />
                {validationErrors.nomeRepresentante && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.nomeRepresentante}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpfRepresentante">CPF do Representante *</Label>
                <Input
                  id="cpfRepresentante"
                  value={formData.cpfRepresentante}
                  onChange={(e) => updateFormData('cpfRepresentante', e.target.value)}
                  placeholder="000.000.000-00"
                  className={validationErrors.cpfRepresentante ? 'border-destructive' : ''}
                />
                {validationErrors.cpfRepresentante && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.cpfRepresentante}</p>
                )}
              </div>

              <div>
                <Label htmlFor="rgRepresentante">RG do Representante *</Label>
                <Input
                  id="rgRepresentante"
                  value={formData.rgRepresentante}
                  onChange={(e) => updateFormData('rgRepresentante', e.target.value)}
                  placeholder="00.000.000-0"
                  className={validationErrors.rgRepresentante ? 'border-destructive' : ''}
                />
                {validationErrors.rgRepresentante && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.rgRepresentante}</p>
                )}
              </div>

              <div>
                <Label htmlFor="telefoneRepresentante">Telefone do Representante</Label>
                <Input
                  id="telefoneRepresentante"
                  value={formData.telefoneRepresentante}
                  onChange={(e) => updateFormData('telefoneRepresentante', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label htmlFor="emailRepresentante">E-mail do Representante</Label>
                <Input
                  id="emailRepresentante"
                  type="email"
                  value={formData.emailRepresentante}
                  onChange={(e) => updateFormData('emailRepresentante', e.target.value)}
                  placeholder="representante@email.com"
                />
              </div>

              <div>
                <Label htmlFor="tipoVinculo">Tipo de Vínculo *</Label>
                <Input
                  id="tipoVinculo"
                  value={formData.tipoVinculo}
                  onChange={(e) => updateFormData('tipoVinculo', e.target.value)}
                  placeholder="Sócio, Diretor, Procurador..."
                  className={validationErrors.tipoVinculo ? 'border-destructive' : ''}
                />
                {validationErrors.tipoVinculo && (
                  <p className="text-destructive text-sm mt-1">{validationErrors.tipoVinculo}</p>
                )}
              </div>

              {formData.companyType === 'agenciador' && (
                <div>
                  <Label htmlFor="cnhRepresentante">CNH (se também atua como motorista)</Label>
                  <Input
                    id="cnhRepresentante"
                    value={formData.cnhRepresentante || ''}
                    onChange={(e) => updateFormData('cnhRepresentante', e.target.value)}
                    placeholder="00000000000"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        if (isTransportadora) {
          return (
            <div className="space-y-6">
              <Alert type="info" message="O RNTRC é obrigatório para transportadoras e deve estar válido e ativo na ANTT." />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rntrc">Número do RNTRC *</Label>
                  <Input
                    id="rntrc"
                    value={formData.rntrc || ''}
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
                    value={formData.validadeRNTRC || ''}
                    onChange={(e) => updateFormData('validadeRNTRC', e.target.value)}
                    className={validationErrors.validadeRNTRC ? 'border-destructive' : ''}
                  />
                  {validationErrors.validadeRNTRC && (
                    <p className="text-destructive text-sm mt-1">{validationErrors.validadeRNTRC}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Validação ANTT</h4>
                    <p className="text-sm text-blue-700">
                      Verificaremos automaticamente se o RNTRC está válido e ativo no sistema da ANTT.
                      Este processo pode levar alguns minutos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // Para agenciador, este é o step de upload
          return renderUploadStep();
        }

      case 5:
        // Step de upload (apenas para transportadora)
        return renderUploadStep();

      default:
        return null;
    }
  };

  const renderUploadStep = () => {
    const getRequiredUploads = () => {
      const baseUploads = [
        { key: 'fotoComprovanteEndereco', label: 'Comprovante de Endereço', required: true }
      ];

      if (!formData.isPessoaFisica) {
        baseUploads.push(
          { key: 'fotoContrato', label: 'Contrato Social', required: true },
          { key: 'fotoCNPJ', label: 'Cartão CNPJ', required: true }
        );

        if (!formData.isentoIE) {
          baseUploads.push(
            { key: 'fotoIE', label: 'Inscrição Estadual', required: true }
          );
        }

        if (formData.inscricaoMunicipal) {
          baseUploads.push(
            { key: 'fotoIM', label: 'Inscrição Municipal', required: false }
          );
        }
      }

      baseUploads.push(
        { key: 'fotoRGRepresentante', label: 'RG do Representante', required: true },
        { key: 'fotoCPFRepresentante', label: 'CPF do Representante', required: true },
        { key: 'fotoComprovanteVinculo', label: 'Comprovante de Vnculo', required: true }
      );

      if (isTransportadora) {
        baseUploads.push(
          { key: 'fotoRNTRC', label: 'Certificado RNTRC', required: true }
        );
      }

      if (formData.cnhRepresentante) {
        baseUploads.push(
          { key: 'fotoCNHRepresentante', label: 'CNH do Representante', required: false }
        );
      }

      return baseUploads;
    };

    return (
      <div className="space-y-6">
        <Alert type="warning" message="Faça upload de fotos nítidas dos documentos. Certifique-se de que todas as informações sejam legíveis e os documentos estejam dentro da validade." />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getRequiredUploads().map((upload) => (
            <div key={upload.key} className="border border-light rounded-lg p-4">
              <Label className="flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" />
                {upload.label}
                {upload.required && <span className="text-destructive">*</span>}
              </Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-accent transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(upload.key as keyof FormData['uploads'], file);
                    }
                  }}
                  className="hidden"
                  id={upload.key}
                />
                <label htmlFor={upload.key} className="cursor-pointer">
                  {formData.uploads[upload.key as keyof FormData['uploads']] ? (
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Arquivo selecionado
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm">Clique para selecionar</span>
                      <span className="text-xs mt-1">PNG, JPG até 5MB</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    console.log('📤 [CompanyRegistration] Preparando dados para registro...');
    
    // ✅ NÃO fazer upload aqui - será feito APÓS signUp no AuthScreen
    // Os Files serão passados no objeto e uploadados quando o usuário já existir
    
    // Preparar dados para salvar no banco COM Files (não paths ainda)
    const dataToSubmit = {
      ...formData,
      // ✅ Manter Files no objeto - serão uploadados no AuthScreen após signUp
      uploads: formData.uploads,
    };
    
    console.log('✅ [CompanyRegistration] Dados preparados:', {
      hasUploads: !!formData.uploads,
      uploadCount: Object.keys(formData.uploads || {}).length
    });
    
    // Enviando dados para o backend
    onComplete(dataToSubmit);
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
                <Building className="w-6 h-6 text-primary" />
                <h1 className="text-2xl xl:text-3xl font-semibold text-foreground">
                  Cadastro de Transportadora
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