import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  MoreVertical,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import { collaboratorRepository } from '../utils/database/repositories/collaborator-repository';
import type { User } from './contexts/AppContext';
import type { Collaborator } from '../utils/collaborator-types';
import { hasPermission } from '../utils/collaborator-types';
import { notifyCollaboratorInvited, notifyCollaboratorRemoved } from '../utils/collaborator-helpers';
import { logCollaboratorActivity } from '../utils/activity-logger';
import { sendCollaboratorInviteEmail, sendCollaboratorRemovedEmail } from '../utils/email-service';
import { addCollaboratorNotification } from './CollaboratorNotifications';
import { createCollaboratorWithAuth } from '../utils/collaborator-auth';

interface CollaboratorManagementProps {
  user: User;
  companyId: string;
}

export function CollaboratorManagement({ user, companyId }: CollaboratorManagementProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCollaborator, setCurrentCollaborator] = useState<Collaborator | null>(null);
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creatingCollaborator, setCreatingCollaborator] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [companyId]);

  const isCompanyOwner = user.user_metadata?.company_id === companyId || 
                         user.company === companyId ||
                         user.id === companyId;
  
  useEffect(() => {
    const checkCurrentUser = async () => {
      if (isCompanyOwner) {
        setCurrentCollaborator(null);
        return;
      }
      try {
        const result = await database.collaborators.getByUserId(user.id);
        if (result && result.success && result.data) {
          setCurrentCollaborator(result.data);
        }
      } catch (error) {
        console.error('Error loading collaborator:', error);
      }
    };
    checkCurrentUser();
  }, [user.id, isCompanyOwner]);

  const loadData = async () => {
    setLoading(true);
    try {
      const collaboratorsData = await collaboratorRepository.getByCompany(companyId);
      setCollaborators(collaboratorsData || []);
      
      // ✅ Auto-criar o dono da empresa como super_admin se não existir na tabela
      if (isCompanyOwner && collaboratorsData) {
        const ownerExists = collaboratorsData.some(c => c.userId === user.id);
        if (!ownerExists) {
          try {
            const ownerResult = await collaboratorRepository.create({
              userId: user.id,
              companyId,
              name: user.name || 'Administrador',
              email: user.email || '',
              phone: user.phone || '',
              roleId: 'admin',
              createdBy: user.id,
              isSuperAdmin: true,
            });
            if (ownerResult) {
              // Recarregar lista
              const updatedData = await collaboratorRepository.getByCompany(companyId);
              setCollaborators(updatedData || []);
            }
          } catch (autoCreateErr) {
          }
        }
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  const canManageCollaborators = isCompanyOwner || 
    (currentCollaborator && hasPermission(currentCollaborator, 'manage_collaborators'));

  if (!canManageCollaborators) {
    return (
      <div className="p-6">
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-yellow-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="mb-4">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para gerenciar colaboradores. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateCollaborator = async () => {
    if (!newEmail || !newName || !newPassword) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    // Validar formato de email básico
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      toast.error('Informe um email válido');
      return;
    }

    const existingCollaborator = collaborators.find(c => c.email === newEmail);
    if (existingCollaborator) {
      toast.error('Este email já está cadastrado como colaborador');
      return;
    }

    try {
      setCreatingCollaborator(true);
      
      const result = await createCollaboratorWithAuth({
        email: newEmail,
        password: newPassword,
        name: newName,
        phone: newPhone || '',
        companyId: companyId,
        roleId: 'operator',
        createdBy: user.id,
      });

      if (!result.success) {
        // Mensagens de erro mais amigáveis
        const errorMsg = result.error || 'Erro ao criar colaborador';
        if (errorMsg.includes('already registered') || errorMsg.includes('já está registrado') || errorMsg.includes('já está cadastrado')) {
          toast.error('Este email já está em uso. Tente outro email.');
        } else if (errorMsg.includes('RLS') || errorMsg.includes('permissão') || errorMsg.includes('permission')) {
          toast.error('Sem permissão para criar colaboradores. Verifique as políticas do banco.');
        } else {
          toast.error(errorMsg);
        }
        return;
      }

      toast.success(`Colaborador ${newName} criado com sucesso!`);
      notifyCollaboratorInvited(user.name, newName, user.company || 'Empresa', companyId);
      
      await logCollaboratorActivity.created(
        user.id,
        user.name,
        companyId,
        newName,
        newEmail
      );
      
      try {
        await sendCollaboratorInviteEmail({
          collaboratorName: newName,
          collaboratorEmail: newEmail,
          companyName: user.company || 'Empresa',
          invitedByName: user.name,
          roleName: 'Colaborador',
          temporaryPassword: newPassword
        });
      } catch (emailError) {
      }
      
      addCollaboratorNotification({
        type: 'invite',
        collaboratorName: newName,
        collaboratorEmail: newEmail,
        roleName: 'Colaborador',
        invitedByName: user.name
      });
      
      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating collaborator:', error);
      toast.error('Erro ao criar colaborador');
    } finally {
      setCreatingCollaborator(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewPhone('');
    setShowPassword(false);
  };

  const handleDeactivateCollaborator = async (collaborator: Collaborator) => {
    if (collaborator.isSuperAdmin) {
      toast.error('Não é possível desativar o administrador principal');
      return;
    }

    try {
      const result = await database.collaborators.deactivate(collaborator.id);
      if (result.success) {
        toast.success('Colaborador desativado');
        notifyCollaboratorRemoved(user.name, collaborator.name, collaborator.email, companyId);
        
        await logCollaboratorActivity.deactivated(
          user.id,
          user.name,
          companyId,
          collaborator.name
        );
        
        try {
          await sendCollaboratorRemovedEmail({
            collaboratorName: collaborator.name,
            collaboratorEmail: collaborator.email,
            companyName: user.company || 'Empresa',
            removedByName: user.name
          });
        } catch {
          // Email sending is non-critical
        }
        
        loadData();
      } else {
        toast.error(result.error || 'Erro ao desativar colaborador');
      }
    } catch (error) {
      console.error('Error deactivating collaborator:', error);
      toast.error('Erro ao desativar colaborador');
    }
  };

  const handleReactivateCollaborator = async (collaborator: Collaborator) => {
    try {
      const result = await database.collaborators.reactivate(collaborator.id);
      if (result.success) {
        toast.success('Colaborador reativado');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao reativar colaborador');
      }
    } catch (error) {
      console.error('Error reactivating collaborator:', error);
      toast.error('Erro ao reativar colaborador');
    }
  };

  const filteredCollaborators = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCollaborators = filteredCollaborators.filter(c => c.isActive);
  const inactiveCollaborators = filteredCollaborators.filter(c => !c.isActive);

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Gerenciar Colaboradores
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os membros da sua equipe
                {isCompanyOwner && (
                  <span className="ml-2 inline-flex items-center gap-1 text-primary">
                    <Shield className="w-3 h-3" />
                    Administrador Principal
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <UserPlus className="w-4 h-4" />
              Novo Colaborador
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar colaborador por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold">{collaborators.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-semibold">{activeCollaborators.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-semibold">{inactiveCollaborators.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <UserX className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-surface-100">
            <TabsTrigger value="active">
              Ativos ({activeCollaborators.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativos ({inactiveCollaborators.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Collaborators */}
          <TabsContent value="active" className="space-y-3">
            {activeCollaborators.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum colaborador ativo</p>
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowCreateDialog(true);
                    }}
                    variant="outline"
                    className="mt-4 gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Criar primeiro colaborador
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeCollaborators.map((collaborator) => (
                <Card key={collaborator.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary text-white">
                            {collaborator.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{collaborator.name}</h3>
                            {collaborator.isSuperAdmin && (
                              <Badge variant="default" className="bg-primary">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                          {collaborator.lastAccess && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Último acesso: {new Date(collaborator.lastAccess).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>

                      {!collaborator.isSuperAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCollaborator(collaborator);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-600"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Desativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Inactive Collaborators */}
          <TabsContent value="inactive" className="space-y-3">
            {inactiveCollaborators.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <UserX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum colaborador inativo</p>
                </CardContent>
              </Card>
            ) : (
              inactiveCollaborators.map((collaborator) => (
                <Card key={collaborator.id} className="shadow-card opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gray-400 text-white">
                            {collaborator.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{collaborator.name}</h3>
                          <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleReactivateCollaborator(collaborator)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        Reativar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Collaborator Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>
              Crie um acesso para um novo membro da equipe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: João Silva"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Senha <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                O colaborador poderá alterar a senha depois do primeiro login.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCollaborator} 
              disabled={creatingCollaborator || !newName || !newEmail || !newPassword}
              className="gap-2"
            >
              {creatingCollaborator ? (
                <>Criando...</>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Criar Colaborador
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Desativar Colaborador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar <strong>{selectedCollaborator?.name}</strong>? 
              O acesso será revogado imediatamente, mas poderá ser reativado depois.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedCollaborator) {
                  handleDeactivateCollaborator(selectedCollaborator);
                  setShowDeleteConfirm(false);
                }
              }}
              className="gap-2"
            >
              <UserX className="w-4 h-4" />
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}