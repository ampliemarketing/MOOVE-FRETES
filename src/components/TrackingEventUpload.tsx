import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { Camera, X, Upload, Loader2, MapPin, Clock, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TrackingEventUploadProps {
  freightId: string;
  onEventAdded?: () => void;
}

export function TrackingEventUpload({ freightId, onEventAdded }: TrackingEventUploadProps) {
  const [eventType, setEventType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const eventTypes = [
    { value: 'pickup', label: '📦 Coleta Realizada' },
    { value: 'in_transit', label: '🚛 Em Trânsito' },
    { value: 'checkpoint', label: '📍 Ponto de Controle' },
    { value: 'delivery', label: '✅ Entrega Realizada' },
    { value: 'incident', label: '⚠️ Incidente' },
    { value: 'delay', label: '⏰ Atraso' },
    { value: 'inspection', label: '🔍 Inspeção' },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Limitar a 4 imagens
    if (selectedImages.length + files.length > 4) {
      toast.error('Máximo de 4 imagens por evento');
      return;
    }
    
    // Validar tipo e tamanho
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Tipo de arquivo inválido: ${file.name}`);
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Imagem muito grande: ${file.name} (máx 5MB)`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Criar previews
    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === validFiles.length) {
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setSelectedImages(prev => [...prev, ...validFiles]);
    toast.success(`${validFiles.length} imagem(ns) adicionada(s)`);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventType) {
      toast.error('Selecione o tipo de evento');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Adicione uma descrição do evento');
      return;
    }
    
    setUploading(true);
    
    try {
      
      // Upload das imagens para o Storage
      let imagePaths: string[] = [];
      
      if (selectedImages.length > 0) {
        
        const { uploadMultipleImages } = await import('../utils/storage-helper');
        const results = await uploadMultipleImages(selectedImages);
        
        // ✅ COLETAR PATHS (NÃO URLs!)
        imagePaths = results
          .filter(r => r.success && r.path)
          .map(r => r.path!);
        
        if (imagePaths.length === 0 && selectedImages.length > 0) {
          toast.error('Erro ao fazer upload das imagens');
          setUploading(false);
          return;
        }
        
      }
      
      // Criar evento no banco
      const { supabase } = await import('../utils/supabase/client');
      
      const eventData = {
        freight_id: freightId,
        event_type: eventType,
        description: description.trim(),
        location: location.trim() || null,
        images: imagePaths, // ✅ Salvar PATHS, não URLs!
        created_at: new Date().toISOString(),
      };
      
      
      const { data, error } = await supabase
        .from('tracking_events')
        .insert(eventData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [TrackingEvent] Erro ao salvar:', error);
        throw error;
      }
      
      
      toast.success('Evento registrado com sucesso!');
      
      // Limpar formulário
      setEventType('');
      setDescription('');
      setLocation('');
      setSelectedImages([]);
      setImagePreviews([]);
      
      // Notificar pai
      onEventAdded?.();
      
    } catch (error) {
      console.error('❌ [TrackingEvent] Erro:', error);
      toast.error('Erro ao registrar evento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Tipo de Evento *</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Descrição *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que aconteceu..."
            rows={3}
          />
        </div>
        
        <div>
          <Label>Localização (opcional)</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: São Paulo, SP"
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <Label>Fotos do Evento (opcional)</Label>
          <div className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="tracking-images"
                disabled={selectedImages.length >= 4}
              />
              <label htmlFor="tracking-images" className="cursor-pointer block">
                <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar fotos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG até 5MB (máx 4 fotos)
                </p>
              </label>
            </div>
            
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={uploading || !eventType || !description.trim()}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <Package className="w-4 h-4 mr-2" />
              Registrar Evento
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}