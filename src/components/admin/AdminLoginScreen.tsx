import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Lock, Mail, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackgroundPaths } from '../ui/background-paths';
import { useAuth } from '../contexts/AuthContext';
import { SUPER_ADMIN_EMAILS } from './admin-mock-data';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onExit: () => void;
}

export function AdminLoginScreen({ onSuccess, onExit }: AdminLoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      
      if (SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
        toast.success('Acesso administrativo autorizado');
        onSuccess();
      } else {
        toast.error('Este usuário não tem permissões de administrador');
      }
    } catch (error: any) {
      toast.error(error.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundPaths>
      <div className="max-w-md mx-auto relative z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <ShieldAlert className="w-10 h-10" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">Painel Admin</CardTitle>
              <CardDescription>
                Acesso restrito para administradores do sistema MooveFretes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Administrativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@moovefretes.com.br"
                      className="pl-10 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-lg font-medium" disabled={loading}>
                  {loading ? 'Verificando...' : 'Entrar no Sistema'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  onClick={onExit}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o site
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
