import React, { useState, useEffect } from 'react';
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
import { getSupabaseClient } from '../utils/supabase/client';

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

  // ── Alterar senha — única seção desta tela que é de verdade (o resto
  // ainda não persiste em lugar nenhum, ver handleSave abaixo) ───────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  function isPasswordStrong(pwd: string): boolean {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  }

  async function handleChangePassword() {
    if (!currentPassword) {
      toast.error('Informe sua senha atual.');
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      toast.error('A nova senha precisa ter no mínimo 8 caracteres, com letra maiúscula, minúscula e número.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = getSupabaseClient();

      // Confirma a senha atual reautenticando antes de trocar — supabase-js
      // não tem um "changePassword(old, new)" direto, então o jeito de
      // validar a senha atual é tentar logar com ela.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Senha atual incorreta.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha: ' + (error?.message || 'tente novamente.'));
    } finally {
      setChangingPassword(false);
    }
  }

  // ── Notificações, Aparência e Privacidade — também de verdade, persistidas
  // em public.user_preferences (RLS: cada usuário só vê/edita a própria
  // linha). Segurança (2FA/sessão) e Sistema continuam decorativas — não têm
  // nenhuma funcionalidade real por trás pra salvar ainda. ─────────────────
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // notification_settings / privacy_settings / ui_settings são jsonb
  // compartilhados com o app mobile (SettingsScreen.tsx) — cada um grava só
  // as chaves que conhece. Um upsert "ingênuo" ({sound_enabled: x}) SUBSTITUI
  // o jsonb inteiro e apagaria as chaves que o outro app gravou (ex:
  // vibration_enabled, rating_alerts, que só existem no mobile). Por isso
  // guardamos o blob cru carregado do servidor e sempre fazemos
  // {...blobCru, minhaChave: novoValor} antes de salvar.
  const [rawNotificationSettings, setRawNotificationSettings] = useState<Record<string, any>>({});
  const [rawPrivacySettings, setRawPrivacySettings] = useState<Record<string, any>>({});
  const [rawUiSettings, setRawUiSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadPreferences() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar preferências:', error);
          return;
        }
        if (!data || cancelled) return;

        setRawNotificationSettings(data.notification_settings || {});
        setRawPrivacySettings(data.privacy_settings || {});
        setRawUiSettings(data.ui_settings || {});

        setSettings(prev => ({
          ...prev,
          emailNotifications: data.email_alerts ?? prev.emailNotifications,
          pushNotifications: data.push_notifications ?? prev.pushNotifications,
          smsNotifications: data.sms_alerts ?? prev.smsNotifications,
          soundEnabled: data.notification_settings?.sound_enabled ?? prev.soundEnabled,
          theme: (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system') ? data.theme : prev.theme,
          fontSize: data.ui_settings?.font_size ?? prev.fontSize,
          shareLocation: data.privacy_settings?.share_location ?? prev.shareLocation,
          shareActivity: data.privacy_settings?.share_activity ?? prev.shareActivity,
          profileVisibility: data.privacy_settings?.profile_visibility ?? prev.profileVisibility,
        }));
      } finally {
        if (!cancelled) setLoadingPrefs(false);
      }
    }
    loadPreferences();
    return () => { cancelled = true; };
  }, [user.id]);

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      const supabase = getSupabaseClient();
      const mergedNotificationSettings = { ...rawNotificationSettings, sound_enabled: settings.soundEnabled };
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        email_alerts: settings.emailNotifications,
        push_notifications: settings.pushNotifications,
        sms_alerts: settings.smsNotifications,
        notification_settings: mergedNotificationSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setRawNotificationSettings(mergedNotificationSettings);
      toast.success('Preferências de notificação salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar notificações: ' + (error?.message || 'tente novamente.'));
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleSaveAppearance() {
    setSavingAppearance(true);
    try {
      const supabase = getSupabaseClient();
      const mergedUiSettings = { ...rawUiSettings, font_size: settings.fontSize };
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        theme: settings.theme,
        language: 'pt-BR',
        ui_settings: mergedUiSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setRawUiSettings(mergedUiSettings);
      toast.success('Preferências de aparência salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar aparência: ' + (error?.message || 'tente novamente.'));
    } finally {
      setSavingAppearance(false);
    }
  }

  async function handleSavePrivacy() {
    setSavingPrivacy(true);
    try {
      const supabase = getSupabaseClient();
      const mergedPrivacySettings = {
        ...rawPrivacySettings,
        share_location: settings.shareLocation,
        share_activity: settings.shareActivity,
        profile_visibility: settings.profileVisibility,
      };
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        privacy_settings: mergedPrivacySettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setRawPrivacySettings(mergedPrivacySettings);
      toast.success('Preferências de privacidade salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar privacidade: ' + (error?.message || 'tente novamente.'));
    } finally {
      setSavingPrivacy(false);
    }
  }

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
        {/* Seção de Senha */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Senha</CardTitle>
            </div>
            <CardDescription>
              Altere a senha usada para entrar na sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                maxLength={72}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  maxLength={72}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
              <Input
                id="confirm-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                maxLength={72}
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            >
              <Lock className="w-4 h-4 mr-2" />
              {changingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </CardContent>
        </Card>

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

            <Button onClick={handleSaveNotifications} disabled={savingNotifications || loadingPrefs}>
              <Save className="w-4 h-4 mr-2" />
              {savingNotifications ? 'Salvando...' : 'Salvar Notificações'}
            </Button>
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

            <Button onClick={handleSaveAppearance} disabled={savingAppearance || loadingPrefs}>
              <Save className="w-4 h-4 mr-2" />
              {savingAppearance ? 'Salvando...' : 'Salvar Aparência'}
            </Button>
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

            <Button onClick={handleSavePrivacy} disabled={savingPrivacy || loadingPrefs}>
              <Save className="w-4 h-4 mr-2" />
              {savingPrivacy ? 'Salvando...' : 'Salvar Privacidade'}
            </Button>
          </CardContent>
        </Card>

        {/* Botões de Ação — só cobrem Segurança e Sistema, que ainda não têm
            nenhuma funcionalidade real por trás (2FA, sincronização, modo
            offline...). Notificações, Aparência e Privacidade já salvam
            direto pelos próprios botões, acima. */}
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