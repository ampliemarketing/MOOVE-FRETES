import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard-helper';

interface DatabaseErrorAlertProps {
  onClose?: () => void;
}

export function DatabaseErrorAlert({ onClose }: DatabaseErrorAlertProps) {
  const [copied, setCopied] = React.useState(false);
  const [copiedSQL, setCopiedSQL] = React.useState(false);

  const supabaseUrl = 'https://supabase.com/dashboard';
  
  // SQL completo para copiar
  const sqlContent = `Veja o arquivo: /EXECUTAR_ESTE_SQL_PRIMEIRO.sql

⚠️ EXECUTE ESTE SQL PRIMEIRO para criar as tabelas críticas (profiles, drivers, companies)
Depois execute: /SQL_COMPLEMENTAR_FALTANDO.sql para adicionar as demais tabelas

Ou veja: /LEIA_PRIMEIRO_ERRO_SUPABASE.md para guia completo.`;
  
  const handleCopyPath = () => {
    copyToClipboard('/EXECUTAR_ESTE_SQL_PRIMEIRO.sql', 'Caminho copiado!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySQL = () => {
    // Mostrar toast informando onde encontrar o SQL
    toast.info('📋 SQL Crítico disponível em: /EXECUTAR_ESTE_SQL_PRIMEIRO.sql', {
      description: 'Abra este arquivo e copie todo o conteúdo para colar no Supabase SQL Editor.',
      duration: 5000
    });
    copyToClipboard(sqlContent, 'Instruções copiadas!');
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  const handleOpenSupabase = () => {
    window.open(supabaseUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                Tabela "profiles" não encontrada
              </h2>
              <p className="text-muted-foreground mt-1">
                O banco de dados do Supabase precisa ser configurado antes de criar contas.
              </p>
            </div>
          </div>

          {/* Error Details */}
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro Detectado</AlertTitle>
            <AlertDescription>
              <code className="text-xs bg-red-100 px-2 py-1 rounded">
                AuthApiError: Database error saving new user
              </code>
              <p className="mt-2 text-sm">
                O banco de dados Supabase precisa ser configurado antes de criar contas.
              </p>
            </AlertDescription>
          </Alert>

          {/* New Feature Alert */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">✨ SQL Completo do Sistema!</AlertTitle>
            <AlertDescription className="text-green-800">
              <p className="font-medium mb-2">
                O SQL agora cria <strong>TODAS as 16 tabelas</strong> do MaisFrete de uma vez!
              </p>
              <div className="text-xs space-y-1">
                <p>✓ profiles, drivers, companies</p>
                <p>✓ freights, quotes, chats, messages</p>
                <p>✓ notifications, social_posts, comments</p>
                <p>✓ transactions, tracking_events, ratings</p>
                <p>✓ preferred_routes, activity_logs, collaborators</p>
                <p className="mt-2 font-medium">+ Triggers, RLS e Permissões completas</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Solution Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">✅ Solução (3 passos):</h3>
            
            {/* Step 1 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h4 className="font-medium text-gray-900">Abrir SQL Editor do Supabase</h4>
              </div>
              <Button
                onClick={handleOpenSupabase}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Supabase SQL Editor
              </Button>
            </div>

            {/* Step 2 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h4 className="font-medium text-gray-900">Copiar SQL de Correção</h4>
              </div>
              <Button
                onClick={handleCopySQL}
                variant="outline"
                className="w-full"
              >
                {copiedSQL ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    SQL Copiado! Cole no Supabase
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar SQL de Correção
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Ou copie do arquivo:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-800 text-white px-2 py-1 rounded font-mono">
                    /EXECUTAR_ESTE_SQL_PRIMEIRO.sql
                  </code>
                  <Button
                    onClick={handleCopyPath}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7"
                  >
                    {copied ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h4 className="font-medium text-gray-900">Executar o SQL</h4>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  No SQL Editor do Supabase:
                </p>
                <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
                  <li>Cole o SQL copiado (Ctrl+V)</li>
                  <li>Clique no botão <strong>"Run"</strong> (ou Ctrl+Enter)</li>
                  <li>Aguarde a mensagem: <code className="bg-green-100 text-green-800 px-1 rounded">✅ Success</code></li>
                </ol>
              </div>
            </div>

            {/* Final Step */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-gray-900">Pronto!</h4>
              </div>
              <p className="text-sm text-gray-700">
                Após executar o SQL, <strong>recarregue esta página</strong> (F5) e tente criar sua conta novamente.
              </p>
            </div>
          </div>

          {/* Additional Help */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">📚 Precisa de ajuda detalhada?</h4>
            <p className="text-sm text-muted-foreground">
              Consulte os guias completos no projeto:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• <code className="bg-gray-100 px-1 rounded">/EXECUTAR_SQL_AGORA.md</code> - Instruções passo-a-passo completas</li>
              <li>• <code className="bg-gray-100 px-1 rounded">/COPIE_E_COLE_ESTE_SQL.txt</code> - SQL completo para copiar</li>
              <li>• <code className="bg-gray-100 px-1 rounded">/supabase/schema.sql</code> - Schema original do banco</li>
            </ul>
          </div>

          {/* Close Button */}
          {onClose && (
            <div className="flex justify-end pt-2">
              <Button onClick={onClose} variant="outline">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}