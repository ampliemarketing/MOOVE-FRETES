import React from 'react';
import { jsPDF } from 'jspdf';
import { Button } from './ui/button';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { Transaction } from '../utils/database/schema';

interface TransactionReceiptProps {
  transaction: Transaction;
  userName?: string;
  variant?: 'button' | 'icon';
}

export function TransactionReceipt({ transaction, userName = 'Usuário', variant = 'button' }: TransactionReceiptProps) {
  
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryColor = '#253663'; // MaisFrete navy
      const accentColor = '#e9742b'; // MaisFrete orange
      const textGray = '#6c737f';
      
      // Header with brand color
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo text (MaisFrete)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('MaisFrete', 20, 25);
      
      doc.setFontSize(10);
      doc.text('Plataforma de Logística de Fretes', 20, 32);
      
      // Title
      doc.setTextColor(primaryColor);
      doc.setFontSize(18);
      doc.text('COMPROVANTE DE TRANSAÇÃO', pageWidth / 2, 55, { align: 'center' });
      
      // Transaction ID
      doc.setFontSize(10);
      doc.setTextColor(textGray);
      doc.text(`ID: ${transaction.id.substring(0, 16)}...`, pageWidth / 2, 62, { align: 'center' });
      
      // Status badge
      const statusY = 70;
      const getStatusColor = () => {
        switch (transaction.status) {
          case 'completed': return '#10b981';
          case 'pending': return '#f59e0b';
          case 'failed': return '#ef4444';
          default: return textGray;
        }
      };
      
      const statusText = transaction.status === 'completed' ? 'PAGO' :
                        transaction.status === 'pending' ? 'PENDENTE' : 'FALHOU';
      
      doc.setFillColor(getStatusColor());
      doc.roundedRect(pageWidth / 2 - 20, statusY, 40, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(statusText, pageWidth / 2, statusY + 5.5, { align: 'center' });
      
      // Divider
      doc.setDrawColor(230, 230, 230);
      doc.line(20, 85, pageWidth - 20, 85);
      
      // Transaction details
      let yPos = 100;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      
      const addField = (label: string, value: string, bold = false) => {
        doc.setFontSize(10);
        doc.setTextColor(textGray);
        doc.text(label, 20, yPos);
        
        if (bold) {
          doc.setFontSize(14);
          doc.setTextColor(primaryColor);
        } else {
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
        }
        doc.text(value, 20, yPos + 6);
        yPos += 18;
      };
      
      // Amount (highlighted)
      addField('Valor', new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(transaction.amount), true);
      
      // Type
      const typeLabels = {
        deposit: 'Depósito',
        withdrawal: 'Saque',
        payment: 'Pagamento',
        refund: 'Reembolso',
        freight_payment: 'Pagamento de Frete'
      };
      addField('Tipo', typeLabels[transaction.type] || transaction.type);
      
      // Date
      addField('Data', new Date(transaction.createdAt).toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short'
      }));
      
      // User
      addField('Usuário', userName);
      
      // Description
      if (transaction.description) {
        addField('Descrição', transaction.description);
      }
      
      // Payment method
      if (transaction.paymentMethod) {
        const methodLabels = {
          pix: 'PIX',
          credit_card: 'Cartão de Crédito',
          debit_card: 'Cartão de Débito',
          bank_transfer: 'Transferência Bancária',
          wallet: 'Carteira Digital'
        };
        addField('Método de Pagamento', methodLabels[transaction.paymentMethod] || transaction.paymentMethod);
      }
      
      // Reference
      if (transaction.reference) {
        doc.setFontSize(9);
        doc.setTextColor(textGray);
        doc.text(`Ref: ${transaction.reference}`, 20, yPos);
        yPos += 10;
      }
      
      // Footer divider
      yPos += 10;
      doc.setDrawColor(230, 230, 230);
      doc.line(20, yPos, pageWidth - 20, yPos);
      
      // QR Code placeholder (could be actual QR code with library)
      yPos += 15;
      doc.setFillColor(240, 240, 240);
      doc.rect(pageWidth / 2 - 25, yPos, 50, 50, 'F');
      doc.setTextColor(textGray);
      doc.setFontSize(8);
      doc.text('QR Code', pageWidth / 2, yPos + 25, { align: 'center' });
      doc.text('Autenticidade', pageWidth / 2, yPos + 32, { align: 'center' });
      
      // Footer info
      yPos += 60;
      doc.setFontSize(8);
      doc.setTextColor(textGray);
      doc.text('Este documento é um comprovante válido de transação', pageWidth / 2, yPos, { align: 'center' });
      doc.text('Gerado automaticamente pelo sistema MaisFrete', pageWidth / 2, yPos + 5, { align: 'center' });
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos + 10, { align: 'center' });
      
      // Border
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      // Save
      const filename = `MaisFrete_Comprovante_${transaction.id.substring(0, 8)}_${new Date().getTime()}.pdf`;
      doc.save(filename);
      
      toast.success('Comprovante gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar comprovante');
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={generatePDF}
        className="h-8 w-8 p-0"
      >
        <Download className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      className="flex items-center gap-2"
    >
      <FileText className="w-4 h-4" />
      Baixar Comprovante
    </Button>
  );
}
