import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ArrowDownRight, CreditCard, Receipt, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminDataTable } from './AdminDataTable';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-orange-100 text-orange-700',
};
const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};
const methodLabels: Record<string, string> = {
  pix: 'PIX',
  transfer: 'Transferência',
  boleto: 'Boleto',
};

interface Transaction {
  id: string;
  freightCode: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  method: string;
  status: string;
  payer: string;
  receiver: string;
  createdAt: string;
}

async function fetchTransactions(): Promise<Transaction[]> {
  // transactions columns: id, freight_id, amount, fee, net_amount, payment_method,
  //   payment_status, payer_id, receiver_id, created_at
  const { data, error } = await supabase
    .from('transactions')
    .select('id, freight_id, amount, fee, net_amount, payment_method, payment_status, payer_id, receiver_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  // Fetch payer/receiver names
  const ids = [...new Set([...data.map((t: any) => t.payer_id), ...data.map((t: any) => t.receiver_id)].filter(Boolean))];
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, name').in('id', ids)
    : { data: [] };
  const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  return data.map((t: any) => ({
    id: t.id,
    freightCode: t.freight_id || '',
    amount: Number(t.amount) || 0,
    platformFee: Number(t.fee) || 0,
    netAmount: Number(t.net_amount) || 0,
    method: t.payment_method || 'pix',
    status: t.payment_status || 'pending',
    payer: nameMap.get(t.payer_id) || t.payer_id?.slice(0, 8) || '',
    receiver: nameMap.get(t.receiver_id) || t.receiver_id?.slice(0, 8) || '',
    createdAt: t.created_at,
  }));
}

async function fetchMonthlyRevenue(): Promise<{ month: string; revenue: number }[]> {
  const { data } = await supabase
    .from('transactions')
    .select('amount, fee, created_at')
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: true });

  if (!data) return [];

  const months: Record<string, number> = {};
  data.forEach((t: any) => {
    const d = new Date(t.created_at);
    const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months[key] = (months[key] || 0) + (Number(t.fee) || 0);
  });

  return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
}

export function AdminFinancial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchMonthlyRevenue()]).then(([txns, rev]) => {
      setTransactions(txns);
      setRevenueData(rev);
      setLoading(false);
    });
  }, []);

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.platformFee, 0);
  const pendingAmount = transactions.filter(t => t.status === 'pending' || t.status === 'processing').reduce((s, t) => s + t.amount, 0);
  const refundedAmount = transactions.filter(t => t.status === 'refunded').reduce((s, t) => s + t.amount, 0);

  const columns = [
    {
      key: 'freightCode',
      label: 'Frete',
      render: (t: Transaction) => <span className="font-mono font-[500] text-[#253663] text-[0.85rem]">{t.freightCode.slice(0, 12)}</span>,
    },
    {
      key: 'amount',
      label: 'Valor',
      render: (t: Transaction) => <span className="font-[500]">R$ {t.amount.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'platformFee',
      label: 'Taxa',
      render: (t: Transaction) => <span className="text-green-600 font-[500]">R$ {t.platformFee.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'netAmount',
      label: 'Líquido',
      render: (t: Transaction) => <span className="text-[0.85rem]">R$ {t.netAmount.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'method',
      label: 'Método',
      render: (t: Transaction) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <CreditCard className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {methodLabels[t.method] || t.method}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: Transaction) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabels[t.status] || t.status}
        </span>
      ),
    },
    {
      key: 'payer',
      label: 'Pagador',
      render: (t: Transaction) => <span className="text-[0.85rem]">{t.payer}</span>,
    },
    {
      key: 'receiver',
      label: 'Recebedor',
      render: (t: Transaction) => <span className="text-[0.85rem]">{t.receiver || '—'}</span>,
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (t: Transaction) => <span className="text-[0.8rem] text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>,
    },
  ];

  if (loading) return <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">Carregando financeiro...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[0.8rem] mb-1">
            <DollarSign className="w-4 h-4" /> Receita Total
          </div>
          <p className="text-[1.5rem] font-[500] text-green-600">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[0.8rem] mb-1">
            <TrendingUp className="w-4 h-4" /> Taxas Arrecadadas
          </div>
          <p className="text-[1.5rem] font-[500] text-[#253663]">R$ {totalFees.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[0.8rem] mb-1">
            <Receipt className="w-4 h-4" /> Pendente
          </div>
          <p className="text-[1.5rem] font-[500] text-amber-500">R$ {pendingAmount.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-[0.8rem] mb-1">
            <ArrowDownRight className="w-4 h-4" /> Reembolsos
          </div>
          <p className="text-[1.5rem] font-[500] text-red-500">R$ {refundedAmount.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {revenueData.length > 0 && (
        <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-[500] text-[var(--foreground)]">Receita Mensal (R$)</h3>
            <button onClick={() => toast.success('Relatório contábil exportado')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[0.75rem] border border-[var(--border)] text-[0.8rem] text-[var(--muted-foreground)] hover:border-[#253663] transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar Relatório
            </button>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6c757d" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6c757d" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e1e4e8', fontSize: '13px' }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h3 className="font-[500] text-[var(--foreground)] mb-3">Transações</h3>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-[0.75rem] border border-[var(--border)] p-8 text-center text-[var(--muted-foreground)] text-[0.9rem]">
            Nenhuma transação encontrada no banco de dados.
          </div>
        ) : (
          <AdminDataTable
            data={transactions}
            columns={columns}
            searchPlaceholder="Buscar por frete, pagador, recebedor..."
            searchKeys={['freightCode', 'payer', 'receiver']}
            title="transacoes"
          />
        )}
      </div>
    </div>
  );
}
