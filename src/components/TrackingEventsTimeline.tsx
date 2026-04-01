import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, MapPin, Clock, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { getFreightImageUrl } from '../utils/storage-helper';

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location?: string;
  images?: string[];
  created_at: string;
}

interface TrackingEventsTimelineProps {
  freightId: string;
  refreshTrigger?: number;
}

const eventTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  pickup: { label: 'Coleta', color: 'bg-blue-500', icon: '📦' },
  in_transit: { label: 'Em Trânsito', color: 'bg-yellow-500', icon: '🚛' },
  checkpoint: { label: 'Ponto de Controle', color: 'bg-purple-500', icon: '📍' },
  delivery: { label: 'Entrega', color: 'bg-green-500', icon: '✅' },
  incident: { label: 'Incidente', color: 'bg-red-500', icon: '⚠️' },
  delay: { label: 'Atraso', color: 'bg-orange-500', icon: '⏰' },
  inspection: { label: 'Inspeção', color: 'bg-indigo-500', icon: '🔍' },
};

export function TrackingEventsTimeline({ freightId, refreshTrigger }: TrackingEventsTimelineProps) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [freightId, refreshTrigger]);

  const loadEvents = async () => {
    try {
      console.log('📋 [TrackingTimeline] Carregando eventos do frete:', freightId);
      
      const { supabase } = await import('../utils/supabase/client');
      
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('freight_id', freightId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [TrackingTimeline] Erro ao carregar eventos:', error);
        return;
      }
      
      console.log(`✅ [TrackingTimeline] ${data?.length || 0} eventos carregados`);
      setEvents(data || []);
      
    } catch (error) {
      console.error('❌ [TrackingTimeline] Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>Nenhum evento registrado ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const config = eventTypeConfig[event.event_type] || {
          label: event.event_type,
          color: 'bg-gray-500',
          icon: '📋',
        };

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 relative">
              {/* Timeline line */}
              {index < events.length - 1 && (
                <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-200" />
              )}
              
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-white text-2xl z-10`}>
                  {config.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Badge variant="secondary" className="mb-1">
                        {config.label}
                      </Badge>
                      <p className="font-medium text-sm">{event.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(event.created_at)}
                    </span>
                    
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}
                    
                    {event.images && event.images.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {event.images.length} foto(s)
                      </span>
                    )}
                  </div>
                  
                  {/* Images */}
                  {event.images && event.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {event.images.map((imagePath, imgIndex) => {
                        // ✅ Converter PATH para URL dinamicamente
                        const imageUrl = imagePath.startsWith('http') 
                          ? imagePath // Compatibilidade com URLs antigas
                          : getFreightImageUrl(imagePath); // PATH → URL
                        
                        return (
                          <button
                            key={imgIndex}
                            onClick={() => setSelectedImage(imageUrl || '')}
                            className="relative group aspect-square overflow-hidden rounded-lg border hover:border-primary transition-colors"
                          >
                            <img
                              src={imageUrl || ''}
                              alt={`Evento ${imgIndex + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
      
      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}