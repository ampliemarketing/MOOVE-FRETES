import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { database } from '../utils/database';
import { toast } from 'sonner@2.0.3';
import type { User } from './contexts/AppContext';

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: string;
    name: string;
    type: string;
  };
  currentUser: User;
  freightId?: string;
  freightCode?: string;
  onSuccess?: () => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  targetUser,
  currentUser,
  freightId,
  freightCode,
  onSuccess
}: RatingDialogProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoverOverall, setHoverOverall] = useState(0);
  const [hoverPunctuality, setHoverPunctuality] = useState(0);
  const [hoverCommunication, setHoverCommunication] = useState(0);
  const [hoverProfessionalism, setHoverProfessionalism] = useState(0);

  const handleSubmit = async () => {
    // Validações
    if (overallRating === 0) {
      toast.error('Por favor, dê uma avaliação geral');
      return;
    }

    if (punctualityRating === 0 || communicationRating === 0 || professionalismRating === 0) {
      toast.error('Por favor, avalie todos os critérios');
      return;
    }

    if (!comment.trim()) {
      toast.error('Por favor, escreva um comentário sobre sua experiência');
      return;
    }

    setLoading(true);

    try {
      const result = await database.ratings.create({
        freightId: freightId || null,
        freightCode: freightCode || null,
        targetId: targetUser.id,
        targetName: targetUser.name,
        targetType: targetUser.type,
        evaluatorId: currentUser.id,
        evaluatorName: currentUser.name,
        evaluatorType: currentUser.userType,
        overallRating,
        punctualityRating,
        communicationRating,
        professionalismRating,
        comment: comment.trim()
      });

      if (result.success) {
        toast.success('Avaliação enviada com sucesso!');
        
        // Reset form
        setOverallRating(0);
        setPunctualityRating(0);
        setCommunicationRating(0);
        setProfessionalismRating(0);
        setComment('');
        
        onOpenChange(false);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || 'Erro ao enviar avaliação');
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (
    rating: number,
    setRating: (value: number) => void,
    hover: number,
    setHover: (value: number) => void,
    label: string
  ) => {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hover || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {(hover || rating) > 0 ? `${hover || rating}/5` : 'Selecione'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar {targetUser.name}</DialogTitle>
          <DialogDescription>
            Compartilhe sua experiência trabalhando com {targetUser.name}
            {freightCode && ` no frete ${freightCode}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avaliação Geral */}
          {renderStars(
            overallRating,
            setOverallRating,
            hoverOverall,
            setHoverOverall,
            'Avaliação Geral'
          )}

          <Separator />

          {/* Critérios Específicos */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Critérios Específicos</h4>
            
            {renderStars(
              punctualityRating,
              setPunctualityRating,
              hoverPunctuality,
              setHoverPunctuality,
              'Pontualidade'
            )}

            {renderStars(
              communicationRating,
              setCommunicationRating,
              hoverCommunication,
              setHoverCommunication,
              'Comunicação'
            )}

            {renderStars(
              professionalismRating,
              setProfessionalismRating,
              hoverProfessionalism,
              setHoverProfessionalism,
              'Profissionalismo'
            )}
          </div>

          <Separator />

          {/* Comentário */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Comentário *
            </Label>
            <Textarea
              id="comment"
              placeholder="Conte sobre sua experiência trabalhando com este usuário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Avaliação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}