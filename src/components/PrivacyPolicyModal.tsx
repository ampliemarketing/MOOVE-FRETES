import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { X, Shield } from 'lucide-react';
import { PRIVACY_POLICY_CONTENT } from './PrivacyPolicyContent';

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyModal({ 
  open, 
  onOpenChange
}: PrivacyPolicyModalProps) {
  const [policyContent] = useState<string>(PRIVACY_POLICY_CONTENT);
  const [loading] = useState(false);

  // Converter Markdown para HTML de forma simples
  const formatMarkdown = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        // Título principal (sem #)
        if (line.match(/^[A-Z\s]+$/) && line.length > 10 && line.length < 150) {
          return <h1 key={index} className="text-center font-medium mb-6 mt-8 text-base">{line}</h1>;
        }

        // Numeração principal (1, 2, 3...)
        if (line.match(/^(\d+)\s+[A-Z]/)) {
          return <h2 key={index} className="font-medium mb-3 mt-6 text-sm uppercase">{line}</h2>;
        }

        // Numeração secundária (1.1, 1.2, etc)
        if (line.match(/^(\d+\.\d+)\s/)) {
          return <h3 key={index} className="font-medium mb-2 mt-4 text-sm">{line}</h3>;
        }

        // Numeração terciária (1.1.1, 1.1.2, etc)
        if (line.match(/^(\d+\.\d+\.\d+)\s/)) {
          return <h4 key={index} className="font-normal mb-2 mt-3 text-sm">{line}</h4>;
        }

        // Numeração quaternária (1.1.1.1, etc)
        if (line.match(/^(\d+\.\d+\.\d+\.\d+)\s/)) {
          return <h5 key={index} className="font-normal mb-1.5 mt-2 text-sm ml-4">{line}</h5>;
        }

        // Listas com letras
        if (line.match(/^[a-z]\)/)) {
          return <li key={index} className="ml-8 mb-1.5 text-sm">{line}</li>;
        }

        // Linha horizontal
        if (line.trim() === '_______________________________________________') {
          return <hr key={index} className="my-6 border-neutral-300" />;
        }

        // Parágrafo normal com justificação
        if (line.trim()) {
          const isUpperCase = line === line.toUpperCase() && line.length > 20;
          return (
            <p 
              key={index} 
              className={`mb-2.5 text-sm leading-relaxed ${isUpperCase ? 'font-medium text-center' : 'text-justify'}`}
            >
              {line}
            </p>
          );
        }

        // Linha vazia
        return <br key={index} />;
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 bg-white flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#253663] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="font-medium">Política de Privacidade</DialogTitle>
                <DialogDescription className="text-neutral-500">
                  MaisFrete - Proteção de Dados e LGPD
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-[#253663] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {formatMarkdown(policyContent)}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#253663] hover:bg-[#1d2a4d] text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}