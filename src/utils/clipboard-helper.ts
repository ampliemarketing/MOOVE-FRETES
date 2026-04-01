/**
 * Helper para copiar texto para a área de transferência com tratamento de erro
 */

import { toast } from 'sonner@2.0.3';

export async function copyToClipboard(text: string, successMessage: string = 'Copiado!'): Promise<boolean> {
  // Método 1: Clipboard API moderna (requer HTTPS e foco)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard API falhou, tentando fallback...', e);
  }

  // Método 2: Fallback com textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Tornar visível mas fora da tela para garantir foco
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '0';
    textArea.style.top = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      toast.success(successMessage);
      return true;
    }
  } catch (e) {
    console.warn('execCommand fallback falhou:', e);
  }

  // Método 3: Último recurso - mostrar prompt para copiar manualmente
  try {
    window.prompt('Copie o link abaixo (Ctrl+C / Cmd+C):', text);
    toast.info('Use Ctrl+C para copiar o link acima.');
    return true;
  } catch (e) {
    console.error('Todos os métodos de cópia falharam:', e);
    toast.error('Não foi possível copiar. Tente copiar manualmente.');
    return false;
  }
}