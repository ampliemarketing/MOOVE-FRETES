import React, { useState } from 'react';
import { Star, ThumbsUp, Clock, MessageSquare, Send, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';

interface RatingSystemProps {
  freightId: string;
  freightTitle: string;
  driverId: string; // ID do motorista sendo avaliado
  otherPartyName: string;
  otherPartyType: 'driver' | 'shipper' | 'carrier';
  evaluatorId: string; // ID de quem está avaliando
  evaluatorName: string;
  evaluatorType: 'embarcador' | 'transportadora' | 'caminhoneiro';
  onSubmit?: (rating: RatingData) => void;
  onClose?: () => void;
}

export interface RatingData {
  freightId: string;
  overallRating: number;
  punctualityRating: number;
  communicationRating: number;
  professionalismRating: number;
  comment: string;
  createdAt: string;
}

export function RatingSystem({
  freightId,
  freightTitle,
  driverId,
  otherPartyName,
  otherPartyType,
  evaluatorId,
  evaluatorName,
  evaluatorType,
  onSubmit,
  onClose
}: RatingSystemProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState<{ category: string; value: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getRatingText = (rating: number): string => {
    if (rating === 0) return 'Não avaliado';
    if (rating === 1) return 'Muito ruim';
    if (rating === 2) return 'Ruim';
    if (rating === 3) return 'Regular';
    if (rating === 4) return 'Bom';
    return 'Excelente';
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error('Por favor, dê uma avaliação geral');
      return;
    }

    setSubmitting(true);

    const ratingData: RatingData = {
      freightId,
      overallRating,
      punctualityRating,
      communicationRating,
      professionalismRating,
      comment,
      createdAt: new Date().toISOString()
    };

    try {
      // Save rating to database
      const result = await database.ratings.create({
        freightId,
        driverId,
        evaluatorId,
        evaluatorName,
        evaluatorType,
        overallRating,
        punctualityRating,
        communicationRating,
        professionalismRating,
        comment,
      });

      if (result.success) {
        if (onSubmit) {
          onSubmit(ratingData);
        }

        toast.success('Avaliação enviada com sucesso!', {
          description: 'Obrigado pelo seu feedback'
        });

        if (onClose) {
          onClose();
        }
      } else {
        toast.error(result.error || 'Erro ao enviar avaliação');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ 
    value, 
    onChange, 
    category, 
    label 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    category: string; 
    label: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">
          {getRatingText(hoveredStar?.category === category ? hoveredStar.value : value)}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredStar({ category, value: star })}
            onMouseLeave={() => setHoveredStar(null)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredStar?.category === category ? hoveredStar.value : value)
                  ? 'fill-accent text-accent'
                  : 'text-muted-foreground'
              }`}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );

  const typeLabels = {
    driver: 'o motorista',
    shipper: 'o embarcador',
    carrier: 'a transportadora'
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="shadow-card">
        <CardHeader className="border-b border-light bg-surface-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Avaliar Frete</CardTitle>
              <CardDescription>
                Como foi sua experiência com {typeLabels[otherPartyType]}?
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Freight Info */}
          <div className="bg-surface-50 rounded-lg p-4 border border-light">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Frete</p>
              <p className="font-medium">{freightTitle}</p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground">
                {otherPartyType === 'driver' ? 'Motorista' : otherPartyType === 'shipper' ? 'Embarcador' : 'Transportadora'}
              </p>
              <p className="font-medium">{otherPartyName}</p>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="space-y-3">
            <h3 className="font-medium">Avaliação Geral</h3>
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              category="overall"
              label="Como você avalia no geral?"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4 pt-2">
            <h3 className="font-medium">Avaliações Específicas</h3>
            
            <StarRating
              value={punctualityRating}
              onChange={setPunctualityRating}
              category="punctuality"
              label="Pontualidade"
            />

            <StarRating
              value={communicationRating}
              onChange={setCommunicationRating}
              category="communication"
              label="Comunicação"
            />

            <StarRating
              value={professionalismRating}
              onChange={setProfessionalismRating}
              category="professionalism"
              label="Profissionalismo"
            />
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <h3 className="font-medium">Comentário (opcional)</h3>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Compartilhe mais detalhes sobre sua experiência..."
                className="min-h-[120px] pl-10 resize-none"
                maxLength={500}
              />
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {comment.length}/500
              </div>
            </div>
          </div>

          {/* Summary */}
          {overallRating > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 rounded-lg p-4 border border-primary/20"
            >
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Sua avaliação: {getRatingText(overallRating)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você está avaliando {otherPartyName} com {overallRating} {overallRating === 1 ? 'estrela' : 'estrelas'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || overallRating === 0}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Avaliação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to display rating summary
export function RatingSummary({ 
  ratings 
}: { 
  ratings: RatingData[] 
}) {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhuma avaliação ainda</p>
      </div>
    );
  }

  const averageOverall = ratings.reduce((acc, r) => acc + r.overallRating, 0) / ratings.length;
  const averagePunctuality = ratings.reduce((acc, r) => acc + r.punctualityRating, 0) / ratings.length;
  const averageCommunication = ratings.reduce((acc, r) => acc + r.communicationRating, 0) / ratings.length;
  const averageProfessionalism = ratings.reduce((acc, r) => acc + r.professionalismRating, 0) / ratings.length;

  const RatingBar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="text-sm font-medium">{value.toFixed(1)}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Resumo de Avaliações</CardTitle>
          <CardDescription>{ratings.length} avaliações recebidas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-6 bg-surface-50 rounded-lg">
            <div className="text-5xl font-bold text-primary mb-2">
              {averageOverall.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageOverall)
                      ? 'fill-accent text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Baseado em {ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'}
            </p>
          </div>

          <div className="space-y-4">
            <RatingBar label="Pontualidade" value={averagePunctuality} />
            <RatingBar label="Comunicação" value={averageCommunication} />
            <RatingBar label="Profissionalismo" value={averageProfessionalism} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}