import React from 'react';
import { Card, CardContent } from './ui/card';
import { AlertCircle } from 'lucide-react';

interface NoPermissionProps {
  message?: string;
}

export function NoPermission({ message = 'Você não tem permissão para acessar esta funcionalidade' }: NoPermissionProps) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-yellow-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="mb-4">Acesso Restrito</h3>
        <p className="text-muted-foreground">
          {message}
        </p>
        <p className="text-muted-foreground text-sm mt-4">
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </CardContent>
    </Card>
  );
}
