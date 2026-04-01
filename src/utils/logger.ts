/**
 * Logger Utility
 * Simple logging utility for debugging and monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, context: string, ...args: any[]) {
    // 🔇 MOSTRAR APENAS ERROS (e warnings em desenvolvimento)
    if (level === 'debug' || level === 'info' || level === 'success') {
      return; // Suprimir logs de debug, info e success
    }

    // Warnings apenas em desenvolvimento
    if (!this.isDevelopment && level === 'warn') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

    switch (level) {
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  debug(context: string, ...args: any[]) {
    this.log('debug', context, ...args);
  }

  info(context: string, ...args: any[]) {
    this.log('info', context, ...args);
  }

  warn(context: string, ...args: any[]) {
    this.log('warn', context, ...args);
  }

  error(context: string, ...args: any[]) {
    this.log('error', context, ...args);
  }

  success(context: string, ...args: any[]) {
    this.log('success', context, ...args);
  }
}

// Singleton instance
export const logger = new Logger();