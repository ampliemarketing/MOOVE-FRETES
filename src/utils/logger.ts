/**
 * Logger Utility
 * Em produção apenas erros são emitidos, evitando vazamento de dados
 * sensíveis e poluição do console. Em desenvolvimento todos os níveis
 * são exibidos normalmente.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

// import.meta.env.DEV é a forma correta no Vite (process.env não é confiável)
const isDev: boolean =
  typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.DEV === true
    : process.env.NODE_ENV === 'development';

class Logger {
  private emit(level: LogLevel, context: string, ...args: unknown[]) {
    // Em produção exibe apenas erros
    if (!isDev && level !== 'error') return;

    const prefix = `[${level.toUpperCase()}] [${context}]`;
    switch (level) {
      case 'warn':
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
      default:
    }
  }

  /** Log genérico de debug (suprimido em produção) */
  log(context: string, ...args: unknown[]) {
    this.emit('debug', context, ...args);
  }

  debug(context: string, ...args: unknown[]) {
    this.emit('debug', context, ...args);
  }

  info(context: string, ...args: unknown[]) {
    this.emit('info', context, ...args);
  }

  warn(context: string, ...args: unknown[]) {
    this.emit('warn', context, ...args);
  }

  /** Erros são sempre emitidos, mesmo em produção */
  error(context: string, ...args: unknown[]) {
    this.emit('error', context, ...args);
  }

  success(context: string, ...args: unknown[]) {
    this.emit('success', context, ...args);
  }
}

// Singleton instance
export const logger = new Logger();