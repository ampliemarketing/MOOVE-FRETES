import React from 'react';
import { Star, Calendar } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { Rating } from '../utils/database/schema';

interface ReviewListProps {
  ratings: Rating[];
  emptyMessage?: string;
}

export function ReviewList({ ratings, emptyMessage = 'Nenhuma avaliação ainda' }: ReviewListProps) {
  if (ratings.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'caminhoneiro':
        return 'Motorista';
      case 'transportadora':
        return 'Transportadora';
      case 'embarcador':
        return 'Embarcador';
      case 'agenciador':
        return 'Agenciador';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card key={rating.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-foreground">{rating.evaluatorName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {getUserTypeLabel(rating.evaluatorType)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(rating.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  {rating.freightCode && (
                    <span className="text-xs">Frete {rating.freightCode}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Rating */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                {renderStars(rating.overallRating ?? 0)}
                <span className="text-2xl font-bold text-foreground">
                  {(rating.overallRating ?? 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Detailed Ratings */}
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Pontualidade</div>
                <div className="flex items-center gap-2">
                  {renderStars(rating.punctualityRating ?? 0)}
                  <span className="text-sm font-medium">{(rating.punctualityRating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Comunicação</div>
                <div className="flex items-center gap-2">
                  {renderStars(rating.communicationRating ?? 0)}
                  <span className="text-sm font-medium">{(rating.communicationRating ?? 0).toFixed(1)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Profissionalismo</div>
                <div className="flex items-center gap-2">
                  {renderStars(rating.professionalismRating ?? 0)}
                  <span className="text-sm font-medium">{(rating.professionalismRating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Comment */}
            {rating.comment && (
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">{rating.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}