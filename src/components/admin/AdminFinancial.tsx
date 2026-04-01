import React, { useState } from 'react';
import { DollarSign, TrendingUp, ArrowDownRight, CreditCard, Receipt, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminDataTable } from './AdminDataTable';
import { mockTransactions, type AdminTransaction, revenueData } from './admin-mock-data';
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

export function AdminFinancial() {
  const [transactions] = useState(mockTransactions);

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.platformFee, 0);
  const pendingAmount = transactions.filter(t => t.status === 'pending' || t.status === 'processing').reduce((s, t) => s + t.amount, 0);
  const refundedAmount = transactions.filter(t => t.status === 'refunded').reduce((s, t) => s + t.amount, 0);

  const columns = [
    {
      key: 'freightCode',
      label: 'Frete',
      render: (t: AdminTransaction) => <span className="font-mono font-[500] text-[#253663] text-[0.85rem]">{t.freightCode}</span>,
    },
    {
      key: 'amount',
      label: 'Valor',
      render: (t: AdminTransaction) => <span className="font-[500]">R$ {t.amount.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'platformFee',
      label: 'Taxa',
      render: (t: AdminTransaction) => <span className="text-green-600 font-[500]">R$ {t.platformFee.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'netAmount',
      label: 'Líquido',
      render: (t: AdminTransaction) => <span className="text-[0.85rem]">R$ {t.netAmount.toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'method',
      label: 'Método',
      render: (t: AdminTransaction) => (
        <span className="flex items-center gap-1 text-[0.85rem]">
          <CreditCard className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          {methodLabels[t.method]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: AdminTransaction) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.75rem] font-[500] ${statusColors[t.status]}`}>
          {statusLabels[t.status]}
        </span>
      ),
    },
    {
      key: 'payer',
      label: 'Pagador',
      render: (t: AdminTransaction) => <span className="text-[0.85rem]">{t.payer}</span>,
    },
    {
      key: 'receiver',
      label: 'Recebedor',
      render: (t: AdminTransaction) => <span className="text-[0.85rem]">{t.receiver || '—'}</span>,
    },
    {
      key: 'createdAt',
      label: 'Data',
      render: (t: AdminTransaction) => <span className="text-[0.8rem] text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
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

      {/* Revenue Chart */}
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

      {/* Transactions Table */}
      <div>
        <h3 className="font-[500] text-[var(--foreground)] mb-3">Transações</h3>
        <AdminDataTable
          data={transactions}
          columns={columns}
          searchPlaceholder="Buscar por frete, pagador, recebedor..."
          searchKeys={['freightCode', 'payer', 'receiver']}
          title="transacoes"
        />
      </div>
    </div>
  );
}
