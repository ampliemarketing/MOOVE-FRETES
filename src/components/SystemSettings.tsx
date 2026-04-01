import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Smartphone,
  Mail,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  User as UserIcon,
  Lock,
  Database,
  Wifi,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { User as AppUser } from './contexts/AppContext';

interface SystemSettingsProps {
  user: AppUser;
  onBack?: () => void;
}

interface SystemSettings {
  // Notificações
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  soundEnabled: boolean;
  
  // Aparência
  theme: 'light' | 'dark' | 'system';
  language: 'pt';
  fontSize: 'small' | 'medium' | 'large';
  
  // Segurança
  twoFactorEnabled: boolean;
  sessionTimeout: '30' | '60' | '120' | 'never';
  
  // Sistema
  autoSync: boolean;
  offlineMode: boolean;
  dataUsage: 'low' | 'medium' | 'high';
  
  // Privacidade
  shareLocation: boolean;
  shareActivity: boolean;
  profileVisibility: 'public' | 'private' | 'contacts';
}

export function SystemSettings({ user, onBack }: SystemSettingsProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    theme: 'light',
    language: 'pt',
    fontSize: 'medium',
    twoFactorEnabled: false,
    sessionTimeout: '60',
    autoSync: true,
    offlineMode: false,
    dataUsage: 'medium',
    shareLocation: true,
    shareActivity: true,
    profileVisibility: 'public'
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Simular salvamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações salvas com sucesso!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleReset = () => {
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      soundEnabled: true,
      theme: 'light',
      language: 'pt',
      fontSize: 'medium',
      twoFactorEnabled: false,
      sessionTimeout: '60',
      autoSync: true,
      offlineMode: false,
      dataUsage: 'medium',
      shareLocation: true,
      shareActivity: true,
      profileVisibility: 'public'
    });
    setHasChanges(true);
    toast.info('Configurações resetadas para o padrão');
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <Settings className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1>Configurações do Sistema</h1>
                <p className="text-sm text-muted-foreground">
                  Personalize sua experiência no MaisFrete
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {user.userType}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Seção de Notificações */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Configure como você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Notificações por email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações importantes por email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Notificações push</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações em tempo real
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Notificações por SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações críticas por SMS
                </p>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Sons de notificação</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduzir som ao receber notificações
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção de Aparência */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Aparência</CardTitle>
            </div>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tema</Label>
              <Select value={settings.theme} onValueChange={(value: 'light' | 'dark' | 'system') => updateSetting('theme', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={settings.language} onValueChange={(value: 'pt') => updateSetting('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português (Brasil)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tamanho da fonte</Label>
              <Select value={settings.fontSize} onValueChange={(value: 'small' | 'medium' | 'large') => updateSetting('fontSize', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequena</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Segurança */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Configure as opções de segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Autenticação de dois fatores</Label>
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança
                </p>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => updateSetting('twoFactorEnabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tempo limite da sessão</Label>
              <Select value={settings.sessionTimeout} onValueChange={(value: '30' | '60' | '120' | 'never') => updateSetting('sessionTimeout', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="never">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Sistema */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Sistema</CardTitle>
            </div>
            <CardDescription>
              Configure as opções de sistema e sincronização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Sincronização automática</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar dados automaticamente
                </p>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(checked) => updateSetting('autoSync', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Modo offline</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir uso offline com dados locais
                </p>
              </div>
              <Switch
                checked={settings.offlineMode}
                onCheckedChange={(checked) => updateSetting('offlineMode', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Uso de dados</Label>
              <Select value={settings.dataUsage} onValueChange={(value: 'low' | 'medium' | 'high') => updateSetting('dataUsage', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Privacidade */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <CardTitle>Privacidade</CardTitle>
            </div>
            <CardDescription>
              Configure suas preferências de privacidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Compartilhar localização</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir compartilhamento da sua localização
                </p>
              </div>
              <Switch
                checked={settings.shareLocation}
                onCheckedChange={(checked) => updateSetting('shareLocation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Compartilhar atividade</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar sua atividade para outros usuários
                </p>
              </div>
              <Switch
                checked={settings.shareActivity}
                onCheckedChange={(checked) => updateSetting('shareActivity', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibilidade do perfil</Label>
              <Select value={settings.profileVisibility} onValueChange={(value: 'public' | 'private' | 'contacts') => updateSetting('profileVisibility', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="contacts">Apenas contatos</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between gap-4 pt-6 pb-8">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar para Padrão
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}