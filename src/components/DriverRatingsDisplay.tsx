import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Star, Clock, MessageSquare, Award, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { database } from '../utils/database';
import type { Rating } from '../utils/database/schema';
import { LoadingSpinner } from './LoadingSpinner';

interface DriverRatingsDisplayProps {
  driverId: string;
}

export function DriverRatingsDisplay({ driverId }: DriverRatingsDisplayProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageOverall: 0,
    averagePunctuality: 0,
    averageCommunication: 0,
    averageProfessionalism: 0,
    totalRatings: 0
  });

  useEffect(() => {
    loadRatings();
  }, [driverId]);

  const loadRatings = async () => {
    setLoading(true);
    try {
      // Load ratings
      const ratingsResponse = await database.ratings.getByDriver(driverId, { page: 1, limit: 10 });
      if (ratingsResponse.success && ratingsResponse.data) {
        setRatings(ratingsResponse.data);
      }

      // Load stats
      const statsResponse = await database.ratings.getDriverStats(driverId);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingText = (rating: number): string => {
    if (rating === 0) return 'Não avaliado';
    if (rating <= 1.5) return 'Muito ruim';
    if (rating <= 2.5) return 'Ruim';
    if (rating <= 3.5) return 'Regular';
    if (rating <= 4.5) return 'Bom';
    return 'Excelente';
  };

  const RatingBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<any> }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="text-sm font-medium">{value.toFixed(1)}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Carregando avaliações..." />;
  }

  if (stats.totalRatings === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center">
            <Star className="w-8 h-8 text-muted-foreground opacity-30" />
          </div>
          <p className="text-muted-foreground mb-2">Nenhuma avaliação ainda</p>
          <p className="text-sm text-muted-foreground">
            Este motorista ainda não recebeu avaliações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card className="shadow-card">
        <CardHeader className="border-b border-light bg-surface-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Avaliações</CardTitle>
              <CardDescription>
                {stats.totalRatings} {stats.totalRatings === 1 ? 'avaliação recebida' : 'avaliações recebidas'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Overall Rating */}
          <div className="text-center p-6 bg-surface-50 rounded-lg border border-light">
            <motion.div 
              className="text-5xl font-bold text-primary mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {stats.averageOverall.toFixed(1)}
            </motion.div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.averageOverall)
                      ? 'fill-accent text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {getRatingText(stats.averageOverall)}
            </p>
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <RatingBar 
              label="Pontualidade" 
              value={stats.averagePunctuality} 
              icon={Clock}
            />
            <RatingBar 
              label="Comunicação" 
              value={stats.averageCommunication} 
              icon={MessageSquare}
            />
            <RatingBar 
              label="Profissionalismo" 
              value={stats.averageProfessionalism} 
              icon={TrendingUp}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Ratings */}
      {ratings.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="border-b border-light bg-surface-50">
            <CardTitle>Avaliações Recentes</CardTitle>
            <CardDescription>Últimas avaliações recebidas</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 space-y-4">
            {ratings.map((rating) => (
              <motion.div
                key={rating.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-surface-50 rounded-lg border border-light"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{rating.evaluatorName}</p>
                      <Badge variant="secondary" className="text-xs">
                        {rating.evaluatorType === 'embarcador' ? 'Embarcador' :
                         rating.evaluatorType === 'transportadora' ? 'Transportadora' :
                         'Caminhoneiro'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rating.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="font-medium">{(rating.overallRating ?? 0).toFixed(1)}</span>
                  </div>
                </div>

                {rating.comment && (
                  <p className="text-sm text-foreground">
                    "{rating.comment}"
                  </p>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}