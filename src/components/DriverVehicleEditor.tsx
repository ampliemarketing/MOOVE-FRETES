import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Truck, Save, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { database } from '../utils/database';
import type { Driver } from '../utils/database/schema';
import { VehicleTypeSelector } from './VehicleTypeSelector';

interface DriverVehicleEditorProps {
  driver: Driver;
  onSave?: (updatedDriver: Driver) => void;
  onCancel?: () => void;
}

export function DriverVehicleEditor({ driver, onSave, onCancel }: DriverVehicleEditorProps) {
  const [saving, setSaving] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    type: driver.vehicle?.type || '',
    plate: driver.vehicle?.plate || '',
    model: driver.vehicle?.model || '',
    year: driver.vehicle?.year || '',
    capacity: driver.vehicle?.capacity || '',
  });
  
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(
    driver.vehicleTypes || []
  );
  const [selectedTrailers, setSelectedTrailers] = useState<string[]>(
    driver.trailerTypes || []
  );

  const handleSave = async () => {
    if (selectedVehicles.length === 0 && selectedTrailers.length === 0) {
      toast.error('Selecione o tipo do seu veículo ou carroceria');
      return;
    }

    setSaving(true);

    try {
      const result = await database.drivers.update(driver.id, {
        vehicle: {
          type: vehicleData.type,
          plate: vehicleData.plate,
          model: vehicleData.model,
          year: vehicleData.year,
          capacity: vehicleData.capacity,
        },
        vehicleTypes: selectedVehicles,
        trailerTypes: selectedTrailers,
      });

      if (result.success && result.data) {
        toast.success('Veículo atualizado com sucesso!');
        onSave?.(result.data);
      } else {
        toast.error(result.error || 'Erro ao atualizar veículo');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Erro ao atualizar veículo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b border-light bg-surface-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>Meu Veículo</CardTitle>
            <CardDescription>
              Configure as informações e características do seu veículo
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Seleção de Tipos de Veículos e Carrocerias */}
        <VehicleTypeSelector
          selectedVehicles={selectedVehicles}
          selectedTrailers={selectedTrailers}
          onVehiclesChange={setSelectedVehicles}
          onTrailersChange={setSelectedTrailers}
        />

        <Separator className="my-6" />

        {/* Informações do Veículo Principal */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Informações do Veículo Principal</h3>
          
            <div className="space-y-2">
            <Label htmlFor="plate">Placa</Label>
            <Input
              id="plate"
              placeholder="ABC-1234"
              value={vehicleData.plate}
              onChange={(e) => setVehicleData(prev => ({ ...prev, plate: e.target.value }))}
              maxLength={8}
            />
          </div>

          {/* Modelo */}
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              placeholder="Ex: Scania R450"
              value={vehicleData.model}
              onChange={(e) => setVehicleData(prev => ({ ...prev, model: e.target.value }))}
            />
          </div>

          {/* Ano */}
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Input
              id="year"
              type="number"
              placeholder="2024"
              value={vehicleData.year}
              onChange={(e) => setVehicleData(prev => ({ ...prev, year: e.target.value }))}
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </div>

          {/* Capacidade */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade de Carga</Label>
            <Input
              id="capacity"
              placeholder="Ex: 15 toneladas"
              value={vehicleData.capacity}
              onChange={(e) => setVehicleData(prev => ({ ...prev, capacity: e.target.value }))}
            />
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Importante</p>
              <p>
                Mantenha as informações do seu veículo atualizadas para que transportadoras possam encontrá-lo facilmente e você receba ofertas de frete compatíveis com o seu veículo.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || (selectedVehicles.length === 0 && selectedTrailers.length === 0)}
            className="flex-1"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Veículo
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
