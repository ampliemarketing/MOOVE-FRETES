import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Error Boundary específico para erros relacionados a dados de fretes
 * 
 * Captura erros como:
 * - Cannot read properties of null (reading 'city')
 * - Cannot read properties of undefined
 * - Outros erros relacionados a dados faltantes
 * 
 * @example
 * ```tsx
 * <FreightErrorBoundary>
 *   <FreightManagement />
 * </FreightErrorBoundary>
 * ```
 */
export class FreightErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Detectar erros comuns relacionados a dados
    const errorMessage = error.message.toLowerCase();
    const isDataError = 
      errorMessage.includes("cannot read properties of null") ||
      errorMessage.includes("cannot read properties of undefined") ||
      errorMessage.includes("reading 'city'") ||
      errorMessage.includes("reading 'state'") ||
      errorMessage.includes("reading 'origin'") ||
      errorMessage.includes("reading 'destination'");
    
    if (isDataError) {
      console.error('🚨 [FreightErrorBoundary] Erro de dados capturado:', {
        message: error.message,
        type: error.name
      });
      
      return { 
        hasError: true, 
        error,
        errorCount: 0 // Será incrementado em componentDidCatch
      };
    }
    
    // Deixar outros erros passarem para Error Boundary pai
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Incrementar contador de erros
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));

    // Log detalhado do erro
    console.error('🔴 [FreightErrorBoundary] Erro capturado:', {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      componentStack: errorInfo.componentStack,
      errorCount: this.state.errorCount + 1
    });

    // Chamar callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Se muitos erros consecutivos, alertar no console
    if (this.state.errorCount >= 3) {
      console.error(
        '⚠️ [FreightErrorBoundary] Múltiplos erros detectados! Pode haver problema sistêmico.'
      );
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorCount: 0
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Se fornecido um fallback customizado, usar
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 shadow-lg">
            {/* Ícone */}
            <div className="flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
            </div>

            {/* Título */}
            <h3 className="text-lg font-semibold text-yellow-900 text-center mb-2">
              Erro ao Carregar Dados
            </h3>

            {/* Mensagem */}
            <p className="text-sm text-yellow-700 text-center mb-4">
              Alguns dados estão incompletos ou em formato inesperado. 
              Isso pode acontecer temporariamente durante atualizações do sistema.
            </p>

            {/* Detalhes técnicos (colapsável) */}
            {this.state.error && (
              <details className="mb-4 text-xs">
                <summary className="cursor-pointer text-yellow-600 hover:text-yellow-700 font-medium">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleReset}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>

              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Recarregar Página
              </Button>
            </div>

            {/* Informação adicional */}
            {this.state.errorCount > 1 && (
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ Este erro ocorreu {this.state.errorCount} vezes.
                  {this.state.errorCount >= 3 && (
                    <span className="block mt-1 font-medium">
                      Recomendamos recarregar a página.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
