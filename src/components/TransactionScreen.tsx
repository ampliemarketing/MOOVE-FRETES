import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { TransactionReceipt } from './TransactionReceipt';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Download,
  Send,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Eye,
  FileText,
  Building,
  User,
  Package,
  Truck,
  AlertCircle,
  Banknote,
  Receipt,
  Plus,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { database } from '../utils/database';
import type { Transaction, User as AppUser, Freight } from '../utils/database/schema';

interface TransactionScreenProps {
  user: AppUser;
}

interface TransactionWithDetails extends Transaction {
  otherParty?: {
    name: string;
    type: string;
  };
  freightDetails?: {
    origin: string;
    destination: string;
    cargoType: string;
  };
}

export function TransactionScreen({ user }: TransactionScreenProps) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // New Transaction Form
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [freightId, setFreightId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [freights, setFreights] = useState<Freight[]>([]);
  
  // Wallet stats
  const [balance, setBalance] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';

  useEffect(() => {
    loadTransactions();
    loadUsers();
    loadFreights();
  }, [resolvedCompanyId]);

  useEffect(() => {
    calculateWalletStats();
  }, [transactions]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await database.transactions.getByUser(resolvedCompanyId);
      if (response.success && response.data) {
        // Enrich transactions with user and freight details
        const enriched = await Promise.all(
          response.data.map(async (txn) => {
            const otherUserId = txn.senderId === resolvedCompanyId ? txn.receiverId : txn.senderId;
            const userResponse = await database.users.getById(otherUserId);
            
            let freightDetails;
            if (txn.freightId) {
              const freightResponse = await database.freights.getById(txn.freightId);
              if (freightResponse.success && freightResponse.data) {
                const freight = freightResponse.data;
                freightDetails = {
                  origin: freight.origin ? `${freight.origin.city}, ${freight.origin.state}` : 'N/A',
                  destination: freight.destination ? `${freight.destination.city}, ${freight.destination.state}` : 'N/A',
                  cargoType: freight.cargoType,
                };
              }
            }

            return {
              ...txn,
              otherParty: userResponse.success && userResponse.data
                ? {
                    name: userResponse.data.name,
                    type: userResponse.data.userType,
                  }
                : undefined,
              freightDetails,
            };
          })
        );

        // Sort by most recent
        enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setTransactions(enriched);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await database.users.getAll();
      if (response.success && response.data) {
        setUsers(response.data.filter(u => u.id !== resolvedCompanyId));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadFreights = async () => {
    try {
      const response = await database.freights.getByCustomer(resolvedCompanyId);
      if (response.success && response.data) {
        // Filtrar por status 'active' e 'in-transit' ao invés de 'published' e 'in_progress' (que não existem)
        setFreights(response.data.filter(f => f.status === 'active' || f.status === 'in-transit'));
      }
    } catch (error) {
      console.error('Error loading freights:', error);
    }
  };

  const calculateWalletStats = () => {
    const received = transactions
      .filter(t => t.receiverId === resolvedCompanyId && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const sent = transactions
      .filter(t => t.senderId === resolvedCompanyId && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pending = transactions
      .filter(t => t.status === 'pending' && t.receiverId === resolvedCompanyId)
      .reduce((sum, t) => sum + t.amount, 0);

    setTotalReceived(received);
    setTotalSent(sent);
    setBalance(received - sent);
    setPendingAmount(pending);
  };

  const handleCreateTransaction = async () => {
    if (!recipientId || !amount || parseFloat(amount) <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const response = await database.transactions.create({
        senderId: resolvedCompanyId,
        receiverId: recipientId,
        amount: parseFloat(amount),
        type: 'payment',
        status: 'pending',
        description: description.trim() || 'Pagamento',
        freightId: freightId || undefined,
      });

      if (response.success) {
        toast.success('Solicitação de pagamento criada!');
        
        // Create notification
        await database.notifications.create({
          userId: recipientId,
          type: 'transaction',
          title: 'Nova solicitação de pagamento',
          message: `${user.name} solicitou um pagamento de R$ ${parseFloat(amount).toFixed(2)}`,
          icon: 'DollarSign',
          read: false,
        });

        setShowNewTransaction(false);
        setRecipientId('');
        setAmount('');
        setDescription('');
        setFreightId('');
        loadTransactions();
      } else {
        toast.error('Erro ao criar transação');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Erro ao criar transação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (transactionId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      const response = await database.transactions.updateStatus(transactionId, newStatus);
      
      if (response.success) {
        const action = newStatus === 'completed' ? 'confirmado' : 'cancelado';
        toast.success(`Pagamento ${action} com sucesso!`);
        
        // Notify other party
        const txn = transactions.find(t => t.id === transactionId);
        if (txn) {
          const otherUserId = txn.senderId === resolvedCompanyId ? txn.receiverId : txn.senderId;
          await database.notifications.create({
            userId: otherUserId,
            type: 'transaction',
            title: `Pagamento ${action}`,
            message: `${user.name} ${action} o pagamento de R$ ${txn.amount.toFixed(2)}`,
            icon: 'DollarSign',
            read: false,
          });
        }
        
        loadTransactions();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getUserIcon = (userType: string) => {
    switch (userType) {
      case 'transportadora':
        return <Truck className="w-4 h-4" />;
      case 'caminhoneiro':
        return <User className="w-4 h-4" />;
      case 'embarcador':
        return <Package className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = 
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.otherParty?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || txn.status === filterStatus;
    
    const matchesType = 
      filterType === 'all' ||
      (filterType === 'sent' && txn.senderId === resolvedCompanyId) ||
      (filterType === 'received' && txn.receiverId === resolvedCompanyId);

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Gerencie seus pagamentos e recebimentos
            </p>
          </div>
          <Button 
            onClick={() => setShowNewTransaction(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>

        {/* Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => setShowWalletDetails(true)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <Badge variant="outline" className="text-xs">Carteira</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Saldo</p>
              <p className="font-semibold text-lg">
                R$ {balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-50">
                  <ArrowDownLeft className="w-5 h-5 text-green-600" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Recebido</p>
              <p className="font-semibold text-lg text-green-600">
                R$ {totalReceived.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-red-50">
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                </div>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Enviado</p>
              <p className="font-semibold text-lg text-red-600">
                R$ {totalSent.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <Badge variant="outline" className="text-xs text-orange-600">Pendente</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">A Receber</p>
              <p className="font-semibold text-lg text-orange-600">
                R$ {pendingAmount.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-input-background"
              >
                <option value="all">Todos Status</option>
                <option value="pending">Pendente</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-input-background"
              >
                <option value="all">Todos Tipos</option>
                <option value="sent">Enviados</option>
                <option value="received">Recebidos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map((txn) => {
                  const isSent = txn.senderId === resolvedCompanyId;
                  const isPending = txn.status === 'pending';
                  const canConfirm = !isSent && isPending;
                  const canCancel = isPending;

                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className={`p-3 rounded-full ${isSent ? 'bg-red-50' : 'bg-green-50'}`}>
                        {isSent ? (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{txn.description}</p>
                          <Badge className={`${getStatusColor(txn.status)} border`}>
                            {getStatusIcon(txn.status)}
                            <span className="ml-1">{getStatusLabel(txn.status)}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{isSent ? 'Para' : 'De'}: {txn.otherParty?.name || 'Usuário desconhecido'}</span>
                          {txn.freightDetails && (
                            <>
                              <span>•</span>
                              <Package className="w-3 h-3" />
                              <span>{txn.freightDetails.origin} → {txn.freightDetails.destination}</span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(txn.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`font-semibold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                          {isSent ? '-' : '+'} R$ {txn.amount.toFixed(2)}
                        </p>
                        
                        {(canConfirm || canCancel) && (
                          <div className="flex gap-2 mt-2">
                            {canConfirm && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(txn.id, 'completed')}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Confirmar
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(txn.id, 'cancelled')}
                                className="text-xs"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <TransactionReceipt
                          transaction={txn}
                          userName={user.name}
                          variant="icon"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTransaction(txn)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Receipt className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma transação</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'Nenhuma transação encontrada com os filtros aplicados'
                    : 'Crie sua primeira transação'}
                </p>
                {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
                  <Button onClick={() => setShowNewTransaction(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Transação
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Transaction Dialog */}
        <Dialog open={showNewTransaction} onOpenChange={setShowNewTransaction}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Destinatário</label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-input-background"
                >
                  <option value="">Selecione um usuário</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.userType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  placeholder="Descrição do pagamento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {freights.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Frete Relacionado (Opcional)
                  </label>
                  <select
                    value={freightId}
                    onChange={(e) => setFreightId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-input-background"
                  >
                    <option value="">Nenhum</option>
                    {freights.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.origin?.city || 'N/A'} → {f.destination?.city || 'N/A'} ({f.cargoType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewTransaction(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTransaction}
                  disabled={!recipientId || !amount || parseFloat(amount) <= 0 || submitting}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {submitting ? 'Criando...' : 'Criar Transação'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Details Dialog */}
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Transação</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="font-semibold text-lg">
                    R$ {selectedTransaction.amount.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={getStatusColor(selectedTransaction.status)}>
                      {getStatusLabel(selectedTransaction.status)}
                    </Badge>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{selectedTransaction.senderId === resolvedCompanyId ? 'Enviado' : 'Recebido'}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedTransaction.senderId === resolvedCompanyId ? 'Para:' : 'De:'}
                    </span>
                    <span>{selectedTransaction.otherParty?.name || 'Desconhecido'}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data:</span>
                    <span>{formatDate(selectedTransaction.createdAt)}</span>
                  </div>

                  {selectedTransaction.description && (
                    <div className="flex flex-col gap-1 text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Descrição:</span>
                      <p>{selectedTransaction.description}</p>
                    </div>
                  )}

                  {selectedTransaction.freightDetails && (
                    <div className="flex flex-col gap-1 text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Frete Relacionado:</span>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>
                          {selectedTransaction.freightDetails.origin} →{' '}
                          {selectedTransaction.freightDetails.destination}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedTransaction.freightDetails.cargoType}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <TransactionReceipt
                    transaction={selectedTransaction}
                    userName={user.name}
                    variant="button"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTransaction(null)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Wallet Details Dialog */}
        <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Carteira</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-6 rounded-lg bg-gradient-to-br from-primary to-blue-600">
                <Wallet className="w-12 h-12 text-white mx-auto mb-3" />
                <p className="text-white/80 text-sm mb-2">Saldo Disponível</p>
                <p className="text-white font-semibold text-3xl">
                  R$ {balance.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <ArrowDownLeft className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Total Recebido</p>
                    <p className="font-semibold text-green-600">R$ {totalReceived.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <ArrowUpRight className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Total Enviado</p>
                    <p className="font-semibold text-red-600">R$ {totalSent.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium">Pagamentos Pendentes</p>
                        <p className="text-xs text-muted-foreground">A receber</p>
                      </div>
                    </div>
                    <p className="font-semibold text-orange-600">R$ {pendingAmount.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-center text-muted-foreground pt-4 border-t">
                <p>Carteira virtual MaisFrete</p>
                <p>Última atualização: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}