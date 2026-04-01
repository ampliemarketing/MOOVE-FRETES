import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface UpdateDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (dates: { pickupDate?: string; deliveryDate?: string }) => Promise<void>;
  freightCount: number;
  currentDates?: {
    pickupDate?: string;
    deliveryDate?: string;
  };
}

export function UpdateDatesModal({
  isOpen,
  onClose,
  onUpdate,
  freightCount,
  currentDates
}: UpdateDatesModalProps) {
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPickupDate(currentDates?.pickupDate || '');
      setDeliveryDate(currentDates?.deliveryDate || '');
    }
  }, [isOpen, currentDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pickupDate && !deliveryDate) {
      toast.error('Preencha pelo menos uma data');
      return;
    }

    if (pickupDate && deliveryDate) {
      const pickup = new Date(pickupDate);
      const delivery = new Date(deliveryDate);
      
      if (delivery < pickup) {
        toast.error('Data de entrega deve ser posterior à data de coleta');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updates: { pickupDate?: string; deliveryDate?: string } = {};
      
      if (pickupDate) updates.pickupDate = pickupDate;
      if (deliveryDate) updates.deliveryDate = deliveryDate;

      await onUpdate(updates);
      
      const freightText = freightCount === 1 ? 'frete' : 'fretes';
      toast.success(`${freightCount} ${freightText} atualizado${freightCount > 1 ? 's' : ''}!`);
      
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar datas:', error);
      toast.error('Erro ao atualizar datas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Atualizar datas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pickupDate">Data de coleta</Label>
            <Input
              id="pickupDate"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={getMinDate()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate">Data de entrega</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={pickupDate || getMinDate()}
            />
          </div>

          <DialogFooter className="gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
