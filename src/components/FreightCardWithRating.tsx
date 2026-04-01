import React, { useState, useEffect } from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RatingDialog } from './RatingDialog';
import { database } from '../utils/database';
import { toast } from 'sonner@2.0.3';

interface FreightCardWithRatingProps {
  freightId: string;
  freightCode?: string;
  status: string;
  isOwnFreight: boolean;
  acceptedDriverId?: string;
  acceptedDriverName?: string;
  customerId: string;
  customerName?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  children?: React.ReactNode;
  className?: string;
}

export function FreightCardWithRating({
  freightId,
  freightCode,
  status,
  isOwnFreight,
  acceptedDriverId,
  acceptedDriverName,
  customerId,
  customerName,
  currentUserId,
  currentUserName,
  currentUserType,
  children,
  className = ''
}: FreightCardWithRatingProps) {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [hasAlreadyRated, setHasAlreadyRated] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    targetId: string;
    targetName: string;
    targetType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador';
  } | null>(null);

  useEffect(() => {
    checkRatingEligibility();
  }, [freightId, status, currentUserId, isOwnFreight, acceptedDriverId]);

  const checkRatingEligibility = async () => {
    if (!currentUserId || status !== 'completed') {
      setCanRate(false);
      return;
    }

    // Determinar quem deve ser avaliado
    let targetId: string | null = null;
    let targetName: string | null = null;
    let targetType: 'embarcador' | 'transportadora' | 'caminhoneiro' | 'agenciador' | null = null;

    if (isOwnFreight && acceptedDriverId) {
      // Dono do frete avalia o motorista
      targetId = acceptedDriverId;
      targetName = acceptedDriverName || 'Motorista';
      targetType = 'caminhoneiro';
    } else if (acceptedDriverId === currentUserId) {
      // Motorista avalia a empresa
      targetId = customerId;
      targetName = customerName || 'Empresa';
      
      // Buscar tipo da empresa
      const userResult = await database.users.getById(customerId);
      if (userResult.success && userResult.data) {
        targetType = userResult.data.userType as any;
      }
    }

    if (targetId && targetName && targetType) {
      // Verificar se já avaliou
      const hasRated = await database.ratings.hasEvaluated(freightId, currentUserId, targetId);
      setHasAlreadyRated(hasRated);
      setCanRate(!hasRated);
      
      if (!hasRated) {
        setRatingTarget({ targetId, targetName, targetType });
      }
    }
  };

  const handleOpenRatingDialog = () => {
    if (!canRate || !ratingTarget) {
      toast.error('Não é possível avaliar este usuário no momento');
      return;
    }
    setShowRatingDialog(true);
  };

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Rating Button Overlay (só aparece em fretes concluídos) */}
      {status === 'completed' && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {canRate && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRatingDialog();
              }}
              className="bg-[#253663] hover:bg-[#1a2847] text-white shadow-lg"
            >
              <Star className="w-4 h-4 mr-2" />
              Avaliar
            </Button>
          )}
          {hasAlreadyRated && (
            <Badge className="bg-green-100 text-green-700 border-green-300 shadow-lg">
              <CheckCircle className="w-3 h-3 mr-1" />
              Avaliado
            </Badge>
          )}
        </div>
      )}

      {/* Rating Dialog */}
      {ratingTarget && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          freightId={freightId}
          freightCode={freightCode}
          targetId={ratingTarget.targetId}
          targetName={ratingTarget.targetName}
          targetType={ratingTarget.targetType}
          evaluatorId={currentUserId}
          evaluatorName={currentUserName}
          evaluatorType={currentUserType}
          onRatingSubmitted={() => {
            setHasAlreadyRated(true);
            setCanRate(false);
            toast.success('Obrigado pela avaliação!');
          }}
        />
      )}
    </div>
  );
}
