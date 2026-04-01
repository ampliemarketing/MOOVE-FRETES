import React, { useEffect, useState } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { ReviewList } from './ReviewList';
import { database } from '../utils/database';
import type { Rating } from '../utils/database/schema';

interface ReviewListContainerProps {
  userId: string;
}

export function ReviewListContainer({ userId }: ReviewListContainerProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
    averagePunctuality: number;
    averageCommunication: number;
    averageProfessionalism: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, [userId]);

  const loadRatings = async () => {
    try {
      setLoading(true);

      // Buscar avaliações
      const ratingsResult = await database.ratings.getByTarget(userId);
      if (ratingsResult.success && ratingsResult.data) {
        setRatings(ratingsResult.data);
      }

      // Buscar estatísticas
      const statsData = await database.ratings.getRatingStats(userId);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#253663] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && stats.totalRatings > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Average Rating */}
          <Card className="border-2">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-3xl font-bold text-foreground">{(stats.averageRating ?? 0).toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Média Geral</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalRatings} avaliações</p>
            </CardContent>
          </Card>

          {/* Punctuality */}
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= (stats.averagePunctuality ?? 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-lg font-bold text-foreground">{(stats.averagePunctuality ?? 0).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Pontualidade</p>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= (stats.averageCommunication ?? 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-lg font-bold text-foreground">{(stats.averageCommunication ?? 0).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Comunicação</p>
            </CardContent>
          </Card>

          {/* Professionalism */}
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= (stats.averageProfessionalism ?? 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-lg font-bold text-foreground">{(stats.averageProfessionalism ?? 0).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Profissionalismo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalRatings > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Distribuição de Avaliações
            </h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage = (count / stats.totalRatings) * 100;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings List */}
      <ReviewList ratings={ratings} />
    </div>
  );
}