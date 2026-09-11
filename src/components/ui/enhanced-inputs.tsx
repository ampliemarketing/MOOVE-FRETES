import React, { useState, useCallback, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Badge } from './badge';
import { Progress } from './progress';
import { 
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Eye, 
  EyeOff, 
  Upload,
  X,
  FileImage,
  Loader2,
  MapPin,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  formatCPF, 
  formatCNPJ, 
  formatPhone, 
  formatCEP, 
  formatRG,
  validateCPF, 
  validateCNPJ, 
  validateEmail, 
  validatePhone,
  validateCEP,
  lookupCEP,
  lookupCNPJ,
  validateImageFile,
  debounce
} from '../../utils/formatters';

interface BaseInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  className?: string;
}

interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  message?: string;
  /** Formato válido, mas com uma ressalva a destacar em âmbar (ex: CNPJ não está ATIVO). */
  isWarning?: boolean;
}

// Enhanced CPF Input
export function CPFInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "000.000.000-00",
  required = false,
  disabled = false,
  error,
  className 
}: BaseInputProps) {
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, isValidating: false });
  const [hasBlurred, setHasBlurred] = useState(false);

  const validateField = useCallback((cpf: string) => {
    if (!cpf.trim()) {
      setValidation({ isValid: false, isValidating: false });
      return;
    }
    
    const isValid = validateCPF(cpf);
    setValidation({ 
      isValid, 
      isValidating: false,
      message: isValid ? 'CPF válido' : 'CPF inválido'
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.length <= 14) {
      onChange(formatted);
      // Only validate while typing if field has been blurred before
      if (hasBlurred) {
        validateField(formatted);
      }
    }
  };

  const handleBlur = () => {
    setHasBlurred(true);
    validateField(value);
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            error ? 'border-destructive focus:border-destructive' :
            validation.isValid ? 'border-green-500 focus:border-green-500' :
            validation.isValidating ? 'border-accent' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validation.isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : hasBlurred && value.trim() && !validation.isValid ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {hasBlurred && (error || validation.message) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm mt-1 ${
              error ? 'text-destructive' : validation.isValid ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {error || validation.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced CNPJ Input with auto-lookup
export function CNPJInput({ 
  label, 
  value, 
  onChange, 
  onCompanyData,
  placeholder = "00.000.000/0001-00",
  required = false,
  disabled = false,
  error,
  className 
}: BaseInputProps & { onCompanyData?: (data: any) => void }) {
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, isValidating: false });
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  const validateAndLookup = useCallback(async (cnpj: string) => {
    if (!cnpj.trim()) {
      setValidation({ isValid: false, isValidating: false });
      return;
    }
    
    setValidation({ isValid: false, isValidating: true });
    
    const isValid = validateCNPJ(cnpj);
    
    if (isValid && !hasLookedUp) {
      setIsLookingUp(true);
      try {
        const companyData = await lookupCNPJ(cnpj);
        if (companyData && onCompanyData) {
          onCompanyData(companyData);
        }
        const situacaoAtiva = !companyData?.situacao || companyData.situacao.toUpperCase() === 'ATIVA';
        setValidation({
          isValid: true,
          isValidating: false,
          isWarning: !!companyData && !situacaoAtiva,
          message: companyData
            ? situacaoAtiva
              ? 'CNPJ válido - dados encontrados'
              : `Atenção: situação cadastral "${companyData.situacao}" na Receita Federal`
            : 'CNPJ válido'
        });
        setHasLookedUp(true);
      } catch (error) {
        setValidation({ 
          isValid: true, 
          isValidating: false,
          message: 'CNPJ válido'
        });
        setHasLookedUp(true);
      } finally {
        setIsLookingUp(false);
      }
    } else if (isValid) {
      setValidation({ 
        isValid: true, 
        isValidating: false,
        message: 'CNPJ válido'
      });
    } else {
      setValidation({ 
        isValid: false, 
        isValidating: false,
        message: 'CNPJ inválido'
      });
    }
  }, [hasLookedUp, onCompanyData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    if (formatted.length <= 18) {
      onChange(formatted);
      // Reset lookup flag when user changes value
      if (formatted !== value) {
        setHasLookedUp(false);
      }
      // Only validate while typing if field has been blurred before
      if (hasBlurred && formatted.length === 18) {
        validateAndLookup(formatted);
      }
    }
  };

  const handleBlur = () => {
    setHasBlurred(true);
    if (value.length === 18) {
      validateAndLookup(value);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
        {isLookingUp && (
          <Badge variant="outline" className="text-xs">
            <Building2 className="w-3 h-3 mr-1" />
            Buscando dados...
          </Badge>
        )}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            error ? 'border-destructive focus:border-destructive' :
            validation.isWarning ? 'border-amber-500 focus:border-amber-500' :
            validation.isValid ? 'border-green-500 focus:border-green-500' :
            validation.isValidating ? 'border-accent' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validation.isValidating || isLookingUp ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : validation.isWarning ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : hasBlurred && value.trim() && !validation.isValid ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {hasBlurred && (error || validation.message) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm mt-1 ${
              error ? 'text-destructive' : validation.isWarning ? 'text-amber-600' : validation.isValid ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {error || validation.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Phone Input
export function PhoneInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "(11) 99999-9999",
  required = false,
  disabled = false,
  error,
  className 
}: BaseInputProps) {
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, isValidating: false });

  useEffect(() => {
    if (!value.trim()) {
      setValidation({ isValid: false, isValidating: false });
      return;
    }
    
    const isValid = validatePhone(value);
    setValidation({ 
      isValid, 
      isValidating: false,
      message: isValid ? 'Telefone válido' : 'Telefone inválido'
    });
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 15) {
      onChange(formatted);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            error ? 'border-destructive focus:border-destructive' :
            validation.isValid ? 'border-green-500 focus:border-green-500' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : value.trim() && !validation.isValid ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {(error || validation.message) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm mt-1 ${
              error ? 'text-destructive' : validation.isValid ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {error || validation.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced CEP Input with auto-lookup
export function CEPInput({ 
  label, 
  value, 
  onChange, 
  onAddressData,
  placeholder = "00000-000",
  required = false,
  disabled = false,
  error,
  className 
}: BaseInputProps & { onAddressData?: (data: any) => void }) {
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, isValidating: false });
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  const validateAndLookup = useCallback(async (cep: string) => {
    if (!cep.trim()) {
      setValidation({ isValid: false, isValidating: false });
      return;
    }
    
    setValidation({ isValid: false, isValidating: true });
    
    const isValid = validateCEP(cep);
    
    if (isValid && !hasLookedUp) {
      setIsLookingUp(true);
      try {
        const addressData = await lookupCEP(cep);
        if (addressData && onAddressData) {
          onAddressData(addressData);
        }
        setValidation({ 
          isValid: true, 
          isValidating: false,
          message: addressData ? 'CEP válido - endereço encontrado' : 'CEP válido'
        });
        setHasLookedUp(true);
      } catch (error) {
        setValidation({ 
          isValid: true, 
          isValidating: false,
          message: 'CEP válido'
        });
        setHasLookedUp(true);
      } finally {
        setIsLookingUp(false);
      }
    } else if (isValid) {
      setValidation({ 
        isValid: true, 
        isValidating: false,
        message: 'CEP válido'
      });
    } else {
      setValidation({ 
        isValid: false, 
        isValidating: false,
        message: 'CEP inválido'
      });
    }
  }, [hasLookedUp, onAddressData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    if (formatted.length <= 9) {
      onChange(formatted);
      // Reset lookup flag when user changes value
      if (formatted !== value) {
        setHasLookedUp(false);
      }
      // Only validate while typing if field has been blurred before AND CEP is complete
      if (hasBlurred && formatted.length === 9) {
        validateAndLookup(formatted);
      }
    }
  };

  const handleBlur = () => {
    setHasBlurred(true);
    if (value.length === 9) {
      validateAndLookup(value);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
        {isLookingUp && (
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            Buscando endereço...
          </Badge>
        )}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            error ? 'border-destructive focus:border-destructive' :
            validation.isWarning ? 'border-amber-500 focus:border-amber-500' :
            validation.isValid ? 'border-green-500 focus:border-green-500' :
            validation.isValidating ? 'border-accent' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validation.isValidating || isLookingUp ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : validation.isWarning ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : hasBlurred && value.trim() && !validation.isValid ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {hasBlurred && (error || validation.message) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm mt-1 ${
              error ? 'text-destructive' : validation.isWarning ? 'text-amber-600' : validation.isValid ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {error || validation.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Email Input
export function EmailInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "email@exemplo.com",
  required = false,
  disabled = false,
  error,
  className 
}: BaseInputProps) {
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, isValidating: false });

  const debouncedValidate = useCallback(
    debounce((email: string) => {
      if (!email.trim()) {
        setValidation({ isValid: false, isValidating: false });
        return;
      }
      
      const isValid = validateEmail(email);
      setValidation({ 
        isValid, 
        isValidating: false,
        message: isValid ? 'E-mail válido' : 'E-mail inválido'
      });
    }, 300),
    []
  );

  useEffect(() => {
    debouncedValidate(value);
  }, [value, debouncedValidate]);

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            error ? 'border-destructive focus:border-destructive' :
            validation.isValid ? 'border-green-500 focus:border-green-500' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : value.trim() && !validation.isValid ? (
            <XCircle className="w-4 h-4 text-destructive" />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {(error || validation.message) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-sm mt-1 ${
              error ? 'text-destructive' : validation.isValid ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {error || validation.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced File Upload with Preview
export function FileUpload({ 
  label, 
  onFileSelect,
  file,
  onRemove,
  required = false,
  error,
  className,
  accept = "image/*",
  maxSize = 5
}: {
  label: string;
  onFileSelect: (file: File) => void;
  file?: File;
  onRemove?: () => void;
  required?: boolean;
  error?: string;
  className?: string;
  accept?: string;
  maxSize?: number;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setUploadError(null);
    
    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      setUploadError(validation.error!);
      return;
    }
    
    if (selectedFile.size > maxSize * 1024 * 1024) {
      setUploadError(`Arquivo deve ter no máximo ${maxSize}MB`);
      return;
    }
    
    if (onFileSelect) {
      onFileSelect(selectedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2 mb-2">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {file && preview ? (
        <div className="border border-light rounded-lg p-4 bg-white">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg border border-light"
              />
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                  onClick={() => {
                    onRemove();
                    setPreview(null);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Arquivo válido</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive 
              ? 'border-accent bg-accent/5' 
              : error || uploadError
                ? 'border-destructive bg-destructive/5'
                : 'border-muted hover:border-accent hover:bg-accent/5'
          }`}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById(`file-input-${label}`)?.click()}
        >
          <input
            id={`file-input-${label}`}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              dragActive ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <FileImage className="w-6 h-6" />
            </div>
            <h4 className="font-medium mb-1">
              {dragActive ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo'}
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              PNG, JPG até {maxSize}MB
            </p>
            <Button type="button" variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Escolher Arquivo
            </Button>
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {(error || uploadError) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive mt-2"
          >
            {error || uploadError}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Password Input with strength meter
export function PasswordInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "Digite sua senha",
  required = false,
  disabled = false,
  error,
  showStrength = false,
  className 
}: BaseInputProps & { showStrength?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState({ score: 0, feedback: '' });

  useEffect(() => {
    if (!showStrength || !value) {
      setStrength({ score: 0, feedback: '' });
      return;
    }

    let score = 0;
    let feedback = 'Muito fraca';

    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Muito fraca';
        break;
      case 2:
        feedback = 'Fraca';
        break;
      case 3:
        feedback = 'Boa';
        break;
      case 4:
        feedback = 'Forte';
        break;
    }

    setStrength({ score, feedback });
  }, [value, showStrength]);

  const getStrengthColor = () => {
    switch (strength.score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${error ? 'border-destructive focus:border-destructive' : ''}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full w-10"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Força:</span>
            <span className={`text-sm font-medium ${
              strength.score <= 1 ? 'text-red-500' :
              strength.score === 2 ? 'text-yellow-500' :
              strength.score === 3 ? 'text-blue-500' : 'text-green-500'
            }`}>
              {strength.feedback}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
              style={{ width: `${(strength.score / 4) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-destructive mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}