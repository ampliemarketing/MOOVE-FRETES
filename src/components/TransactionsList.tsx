import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loader2, DollarSign, FileText, Eye, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface Transaction {
  id: string;
  freight_id: string;
  amount: number;
  type: string;
  status: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
}

interface TransactionsListProps {
  freightId: string;
  refreshTrigger?: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-500', icon: XCircle },
};

export function TransactionsList({ freightId, refreshTrigger }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [freightId, refreshTrigger]);

  const loadTransactions = async () => {
    try {
      console.log('💰 [TransactionsList] Carregando transações do frete:', freightId);
      
      const { supabase } = await import('../utils/supabase/client');
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [TransactionsList] Erro ao carregar transações:', error);
        return;
      }
      
      console.log(`✅ [TransactionsList] ${data?.length || 0} transações carregadas`);
      setTransactions(data || []);
      
    } catch (error) {
      console.error('❌ [TransactionsList] Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const viewReceipt = async (receiptPath: string) => {
    // Gerar signed URL dinâmica (válida por 1 hora)
    const { getDocumentUrl } = await import('../utils/storage-helper');
    const signedUrl = await getDocumentUrl(receiptPath, 3600); // 1 hora
    
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast.error('Erro ao carregar comprovante');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma transação registrada ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction, index) => {
        const statusInfo = statusConfig[transaction.status] || statusConfig.pending;
        const StatusIcon = statusInfo.icon;

        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left side - Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      className={`${statusInfo.color} text-white`}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                    
                    {transaction.receipt_url && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <FileText className="w-3 h-3 mr-1" />
                        Com Comprovante
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatAmount(transaction.amount)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(transaction.created_at)}
                  </div>
                  
                  {transaction.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {transaction.notes}
                    </p>
                  )}
                </div>
                
                {/* Right side - Actions */}
                {transaction.receipt_url && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewReceipt(transaction.receipt_url!)}
                      className="whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Comprovante
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}