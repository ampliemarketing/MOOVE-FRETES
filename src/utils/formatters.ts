// Utility functions for formatting and validation

export const cleanNumbers = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const formatCPF = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (value: string): string => {
  const cleaned = cleanNumbers(value);
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

export const formatCEP = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const formatRG = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
};

export const formatCNH = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{11})/, '$1');
};

export const formatRNTRC = (value: string): string => {
  const cleaned = cleanNumbers(value);
  return cleaned.replace(/(\d{8})(\d{1})/, '$1-$2');
};

// Validation functions
export const validateCPF = (cpf: string): boolean => {
  const cleaned = cleanNumbers(cpf);
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // All same digits
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cleanNumbers(cnpj);
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false; // All same digits
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit2 !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = cleanNumbers(phone);
  return cleaned.length >= 10 && cleaned.length <= 11;
};

export const validateCEP = (cep: string): boolean => {
  const cleaned = cleanNumbers(cep);
  return cleaned.length === 8;
};

// CEP lookup function (mock implementation)
export const lookupCEP = async (cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
} | null> => {
  const cleaned = cleanNumbers(cep);
  
  if (!validateCEP(cleaned)) {
    return null;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

// CNPJ lookup — consulta a BrasilAPI, que espelha os dados públicos da
// Receita Federal (CNPJ, razão social, endereço, situação cadastral).
// API pública, sem chave/custo: https://brasilapi.com.br/docs#tag/CNPJ
export const lookupCNPJ = async (cnpj: string): Promise<{
  razao_social: string;
  nome_fantasia?: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  situacao: string;
} | null> => {
  const cleaned = cleanNumbers(cnpj);

  if (!validateCNPJ(cleaned)) {
    return null;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);

    if (!response.ok) {
      // 404 = CNPJ válido no dígito verificador mas não encontrado na base
      // da Receita (ex: CNPJ de teste). Outros códigos = serviço indisponível.
      return null;
    }

    const data = await response.json();

    return {
      razao_social: data.razao_social || '',
      nome_fantasia: data.nome_fantasia || undefined,
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      bairro: data.bairro || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep ? formatCEP(String(data.cep)) : '',
      telefone: data.ddd_telefone_1 || undefined,
      email: data.email || undefined,
      situacao: data.descricao_situacao_cadastral || '',
    };
  } catch (error) {
    console.error('Erro ao consultar CNPJ na BrasilAPI:', error);
    return null;
  }
};

// File validation
export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

export const validateFileType = (file: File, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg']): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!validateFileType(file)) {
    return { valid: false, error: 'Arquivo deve ser uma imagem (JPG ou PNG)' };
  }
  
  if (!validateFileSize(file, 5)) {
    return { valid: false, error: 'Arquivo deve ter no máximo 5MB' };
  }
  
  return { valid: true };
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};