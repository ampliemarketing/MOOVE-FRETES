import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  User, 
  Star, 
  MessageCircle, 
  MapPin, 
  Route, 
  CheckCircle, 
  TrendingUp,
  Building2,
  FileText,
  Truck,
  Package,
  Info,
  Copy
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { generateDeepLinkUrl } from '../utils/deep-link';
import { FaWhatsapp } from 'react-icons/fa';
import type { UnifiedUserProfile } from '../utils/user-profile-helper';
import { 
  formatUserType, 
  getUserTypeColor, 
  formatStatus, 
  getStatusColor 
} from '../utils/user-profile-helper';
import { copyToClipboard } from '../utils/clipboard-helper';
import { ReviewListContainer } from './ReviewListContainer';
import { getAvatarUrl } from '../utils/storage-helper';

interface UnifiedUserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UnifiedUserProfile | null;
  showContactButton?: boolean;
  currentUser?: { id: string; name: string } | null;
  onOpenChat?: (userId: string, userName: string) => void;
}

export function UnifiedUserProfileSheet({ 
  open, 
  onOpenChange, 
  profile, 
  showContactButton = true,
  currentUser,
  onOpenChat
}: UnifiedUserProfileSheetProps) {
  // 🔍 DEBUG: Verificar dados do profile ao abrir o sheet
  React.useEffect(() => {
    if (open && profile) {
      console.log('🔍 [UnifiedUserProfileSheet] Sheet aberto com profile:', {
        id: profile.id,
        name: profile.name,
        userType: profile.userType,
        hasAvatar: !!profile.avatar,
        avatarPreview: profile.avatar?.substring(0, 100),
        hasAvatarUrl: !!profile.avatarUrl,
        avatarUrlPreview: profile.avatarUrl?.substring(0, 100),
        allFields: Object.keys(profile)
      });
    }
  }, [open, profile]);

  // ✅ Converter PATH → URL dinamicamente
  const avatarUrl = React.useMemo(() => {
    const path = profile?.avatar || profile?.avatarUrl;
    if (!path) return null;
    if (path.startsWith('http')) return path; // Compatibilidade legado
    return getAvatarUrl(path); // PATH → URL
  }, [profile?.avatar, profile?.avatarUrl]);

  if (!profile) return null;

  const handleWhatsApp = () => {
    if (!profile.phone) {
      toast.error('Telefone não disponível');
      return;
    }
    
    // Gerar saudação baseada na hora do dia
    const hour = new Date().getHours();
    let greeting = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde';
    } else if (hour >= 18) {
      greeting = 'Boa noite';
    }

    const currentUserName = currentUser?.name || 'Nossa Empresa';
    const currentUserId = currentUser?.id || '';
    const isDriverProfile = profile.userType === 'caminhoneiro';
    
    const message = `Olá, ${profile.name}, tudo bem? 😄👋

Vi seu perfil aqui na MooveFretes 🚚 e achei legal te chamar pra conversar.
🌐 moovefretes.com.br

Sou da empresa ${currentUserName} e usamos a plataforma pra publicar e negociar fretes 📦

Se quiser, esse é o perfil da nossa empresa na MooveFretes:
🏢🔗 ${generateDeepLinkUrl('profile', currentUserId)}

Seu perfil que encontrei na MooveFretes:
🔗 ${generateDeepLinkUrl('profile', profile.id)}

Queria trocar uma ideia pra ver se conseguimos transportar algumas cargas juntos 🚚😄
Quando puder, me chama aqui 😉

${greeting} ✨`;

    const phone = profile.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(`Abrindo WhatsApp para ${profile.name}`);
  };

  const handleCopyPhone = () => {
    if (!profile.phone) {
      toast.error('Telefone não disponível');
      return;
    }
    
    copyToClipboard(profile.phone, 'Número copiado para a área de transferência!');
  };

  const { driver, company, displayData } = profile;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetTitle className="sr-only">
          {`Perfil de ${profile.name}`}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {`Informações completas sobre ${profile.name}`}
        </SheetDescription>
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 pb-4 border-b">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden">
                    {avatarUrl ? (
                      <>
                        <img 
                          src={avatarUrl} 
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            console.log('✅ [UnifiedUserProfileSheet] Avatar carregado com sucesso:', avatarUrl?.substring(0, 50));
                          }}
                          onError={(e) => {
                            console.error('❌ [UnifiedUserProfileSheet] Erro ao carregar avatar:', avatarUrl);
                            // Esconder imagem e mostrar fallback
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none' }} className="w-full h-full flex items-center justify-center">
                          {profile.userType === 'caminhoneiro' ? (
                            <User className="w-8 h-8" />
                          ) : (
                            <Building2 className="w-8 h-8" />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {profile.userType === 'caminhoneiro' ? (
                          <User className="w-8 h-8" />
                        ) : (
                          <Building2 className="w-8 h-8" />
                        )}
                      </div>
                    )}
                  </div>
                  {displayData?.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h2 className="font-medium">{profile.name}</h2>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={getUserTypeColor(profile.userType)}>
                          {formatUserType(profile.userType)}
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span>{displayData?.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm font-medium">{displayData?.completedTrips || 0}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {profile.userType === 'caminhoneiro' ? 'Viagens' : 'Fretes'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-sm font-medium">{displayData?.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="text-xs text-muted-foreground">Avaliação</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <CheckCircle className="w-3 h-3 text-blue-500" />
                  <span className="text-sm font-medium">{displayData?.verified ? 'Sim' : 'Não'}</span>
                </div>
                <div className="text-xs text-muted-foreground">Verificado</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Informações de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.email && (
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground mb-1">Email</div>
                      <div className="font-medium">{profile.email}</div>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground mb-1">Telefone</div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{profile.phone}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPhone}
                          className="h-8 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {!profile.email && !profile.phone && (
                    <div className="text-sm text-muted-foreground">Informações de contato não disponíveis</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Driver Specific Info */}
            {profile.userType === 'caminhoneiro' && (
              <div className="space-y-4">
                <h3 className="font-medium">Informações do Motorista</h3>
                
                {driver ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">CNH</p>
                        <p className="font-medium">{driver.cnh || 'Não informado'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Categoria</p>
                        <p className="font-medium">{driver.cnhCategory || 'Não informado'}</p>
                      </div>
                    </div>

                    {driver.vehicle && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Veículo</p>
                        <div className="bg-muted p-3 rounded-lg space-y-1">
                          <p className="font-medium">{driver.vehicle.type || 'Não informado'}</p>
                          {driver.vehicle.plate && (
                            <p className="text-sm">Placa: {driver.vehicle.plate}</p>
                          )}
                          {driver.vehicle.model && (
                            <p className="text-sm">{driver.vehicle.model} - {driver.vehicle.year}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {driver.currentLocation && (
                      <div>
                        <p className="text-sm text-muted-foreground">Localização Atual</p>
                        <p className="font-medium">
                          {driver.currentLocation.city}, {driver.currentLocation.state}
                        </p>
                      </div>
                    )}

                    {driver.specializations && driver.specializations.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Especializações</p>
                        <div className="flex flex-wrap gap-2">
                          {driver.specializations.map((spec, i) => (
                            <Badge key={i} variant="secondary">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <Info className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 font-medium mb-1">
                      Cadastro em andamento
                    </p>
                    <p className="text-xs text-blue-600">
                      Este motorista ainda não completou o cadastro de CNH e veículo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Dados específicos de Empresa */}
            {company && ['transportadora', 'embarcador', 'agenciador'].includes(profile.userType) && (
              <>
                {/* Informações da Empresa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Informações da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {company.companyName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Razão Social</div>
                          <div className="font-medium">{company.companyName}</div>
                        </div>
                      )}
                      {company.cnpj && (
                        <div>
                          <div className="text-xs text-muted-foreground">CNPJ</div>
                          <div className="font-medium">{company.cnpj}</div>
                        </div>
                      )}
                      {company.description && (
                        <div>
                          <div className="text-xs text-muted-foreground">Descrição</div>
                          <div className="font-medium">{company.description}</div>
                        </div>
                      )}
                      {company.website && (
                        <div>
                          <div className="text-xs text-muted-foreground">Website</div>
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Endereço */}
                {company.address && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <div>
                          {company.address?.street}, {company.address?.number}
                          {company.address?.complement && ` - ${company.address.complement}`}
                        </div>
                        <div>
                          {company.address?.neighborhood} - {company.address?.city}/{company.address?.state}
                        </div>
                        <div className="text-muted-foreground">CEP: {company.address?.cep}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Frota (para transportadoras) */}
                {company.fleetSize && company.fleetSize > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Frota
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <span className="font-medium text-2xl">{company.fleetSize}</span>
                        <span className="text-muted-foreground ml-2">veículos</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Informações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Membro desde</span>
                  <span className="font-medium">
                    {new Date(profile.createdAt).toLocaleDateString('pt-BR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={getStatusColor(displayData?.status || 'pending')}>
                    {formatStatus(displayData?.status || 'pending')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipo de conta</span>
                  <Badge className={getUserTypeColor(profile.userType)}>
                    {formatUserType(profile.userType)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Avaliações */}
            <Tabs defaultValue="avaliacoes">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="avaliacoes">
                <ReviewListContainer userId={profile.id} />
              </TabsContent>
              <TabsContent value="historico">
                <div className="space-y-4">
                  <h3 className="font-medium">Histórico de Fretes</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhum frete encontrado para este perfil.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Footer */}
          {showContactButton && (
            <div className="border-t p-4 bg-background">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    if (onOpenChat) {
                      onOpenChat(profile.id, profile.name);
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                {profile.phone && (
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleWhatsApp}
                  >
                    <FaWhatsapp className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}