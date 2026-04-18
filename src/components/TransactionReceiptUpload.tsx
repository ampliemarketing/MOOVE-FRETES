import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { Upload, X, Loader2, DollarSign, FileText, Check } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface TransactionReceiptUploadProps {
  freightId: string;
  amount: number | string;
  onReceiptUploaded?: (receiptUrl: string) => void;
}

export function TransactionReceiptUpload({ 
  freightId, 
  amount, 
  onReceiptUploaded 
}: TransactionReceiptUploadProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG ou PDF');
      return;
    }
    
    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10MB)');
      return;
    }
    
    setReceiptFile(file);
    
    // Criar preview apenas para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
    
    toast.success('Comprovante selecionado');
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiptFile) {
      toast.error('Selecione o comprovante de pagamento');
      return;
    }
    
    setUploading(true);
    
    try {
      
      // Upload do arquivo para o Storage
      const { uploadDocument } = await import('../utils/storage-helper');
      
      // Usar uploadDocument com tipo 'receipt'
      const uploadResult = await uploadDocument(
        `freight_${freightId}`, 
        receiptFile, 
        'receipt' as any
      );
      
      if (!uploadResult.success || !uploadResult.path) {
        toast.error('Erro ao fazer upload do comprovante');
        setUploading(false);
        return;
      }
      
      // [REVISAR] console.log('✅ [TransactionReceipt] Comprovante uploadado (PATH):', uploadResult.path);
      
      // Criar transação no banco COM PATH (não URL!)
      const { supabase } = await import('../utils/supabase/client');
      
      const transactionData = {
        freight_id: freightId,
        amount: typeof amount === 'string' 
          ? parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'))
          : amount,
        type: 'payment',
        status: 'pending', // Aguardando confirmação
        receipt_path: uploadResult.path, // ✅ PATH do Storage (não URL!)
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      };
      
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [TransactionReceipt] Erro ao salvar:', error);
        throw error;
      }
      
      
      toast.success('Comprovante enviado com sucesso!');
      
      // Limpar formulário
      setReceiptFile(null);
      setReceiptPreview(null);
      setNotes('');
      
      // ✅ Notificar pai com PATH (não URL!)
      onReceiptUploaded?.(uploadResult.path);
      
    } catch (error) {
      console.error('❌ [TransactionReceipt] Erro:', error);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800 mb-1">
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">Valor do Pagamento</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {typeof amount === 'string' ? amount : `R$ ${amount.toFixed(2)}`}
          </div>
        </div>
        
        <div>
          <Label>Comprovante de Pagamento *</Label>
          <div className="space-y-3">
            {!receiptFile ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="receipt-file"
                />
                <label htmlFor="receipt-file" className="cursor-pointer block">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar o comprovante
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou PDF até 10MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{receiptFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(receiptFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {receiptPreview && (
                  <img
                    src={receiptPreview}
                    alt="Preview do comprovante"
                    className="w-full h-48 object-contain bg-gray-50 rounded"
                  />
                )}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <Label>Observações (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Transferência realizada via PIX, comprovante em anexo"
            rows={3}
          />
        </div>
        
        <Button
          type="submit"
          disabled={uploading || !receiptFile}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Enviar Comprovante
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}