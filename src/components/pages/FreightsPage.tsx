import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { FreightManagement } from '../FreightManagement';
import { MyFreightsScreen } from '../MyFreightsScreen';
import { AllFreightsScreen } from '../AllFreightsScreen';
import { FreightHistory } from '../FreightHistory';
import { FreightDetailScreen } from '../FreightDetailScreen';
import { LoadingSpinner } from '../LoadingSpinner';
import { toast } from 'sonner@2.0.3';
import { buildFreightChatMessage } from '../../utils/navigation-helpers';
import { useFreightById } from '../../utils/hooks/useFreightById';
import { database } from '../../utils/database';

export function AllFreightsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedFreightId = location.state?.selectedFreightId || null;

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
    toast.success(`Abrindo chat com ${userName}`);
  };

  const handleNavigateToChat = (freightId: string, freightData?: any) => {
    if (freightData?.customerId) {
      const autoMessage = buildFreightChatMessage(freightData);
      navigate('/chat', {
        state: {
          userId: freightData.customerId,
          userName: freightData.customerName,
          freightId,
          initialMessage: autoMessage,
        }
      });
      toast.success(`Abrindo chat com ${freightData.customerName || 'empresa'}`);
    } else {
      toast.error('Não foi possível abrir o chat - dados do frete incompletos');
    }
  };

  return (
    <AllFreightsScreen
      user={user}
      onOpenChat={handleOpenChat}
      onNavigateToChat={handleNavigateToChat}
      selectedFreightId={selectedFreightId}
    />
  );
}

export function MyFreightsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
    toast.success(`Abrindo chat com ${userName}`);
  };

  return <MyFreightsScreen user={user} onOpenChat={handleOpenChat} />;
}

export function FreightRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleOpenChat = (userId: string, userName: string, prefilledMessage?: string) => {
    navigate('/chat', { state: { userId, userName, initialMessage: prefilledMessage } });
  };

  const handleNavigateToChat = (freightId: string, freightData?: any) => {
    if (freightData?.customerId) {
      const autoMessage = buildFreightChatMessage(freightData);
      navigate('/chat', { state: { userId: freightData.customerId, freightId, initialMessage: autoMessage } });
    }
  };

  return (
    <FreightManagement
      user={user}
      initialTab="create"
      initialFreightForQuote={null}
      shouldOpenFreightForm={true}
      setShouldOpenFreightForm={() => {}}
      initialView="my-freights"
      onOpenChat={handleOpenChat}
      onNavigateToChat={handleNavigateToChat}
    />
  );
}

export function FreightHistoryPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <FreightHistory user={user} />;
}

export function FreightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { freight, loading, error, reload } = useFreightById(id || '');

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !freight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="text-center">
          <h2 className="text-lg mb-2" style={{ fontWeight: 500 }}>Frete não encontrado</h2>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
            {error || 'O frete solicitado não existe ou foi removido.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/fretes')}
          className="px-4 py-2 rounded-[0.75rem] bg-[#253663] text-white"
          style={{ fontSize: '14px', fontWeight: 400 }}
        >
          Voltar para fretes
        </button>
      </div>
    );
  }

  const resolvedCompanyId = (user as any)?.collaborator?.companyId || user.id;
  const isOwnFreight = freight.customerId === resolvedCompanyId;

  const handleBack = () => {
    // Try to go back in history, fall back to /fretes
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/fretes');
    }
  };

  const handleEdit = (freightData: any) => {
    // Navigate to freight list which handles editing
    navigate('/fretes', { state: { editFreightId: freightData.id } });
  };

  const handleDelete = async (freightId: string) => {
    try {
      const result = await database.freights.delete(freightId);
      if (result.success) {
        toast.success('Frete excluído com sucesso');
        navigate('/fretes');
      } else {
        toast.error('Erro ao excluir frete');
      }
    } catch (err) {
      toast.error('Erro ao excluir frete');
    }
  };

  const handleToggleStatus = async (freightId: string, newStatus: string) => {
    try {
      const result = await database.freights.update(freightId, { status: newStatus });
      if (result.success) {
        const statusMessages: Record<string, string> = {
          active: 'Frete reativado com sucesso!',
          inactive: 'Frete desativado',
          completed: 'Frete finalizado',
          cancelled: 'Frete cancelado',
        };
        toast.success(statusMessages[newStatus] || 'Status atualizado');
        if (newStatus === 'completed') {
          navigate('/fretes');
        } else {
          reload();
        }
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleChat = (freightId: string, freightData?: any) => {
    if (freightData?.customerId) {
      const autoMessage = buildFreightChatMessage(freightData);
      navigate('/chat', {
        state: {
          userId: freightData.customerId,
          userName: freightData.customerName,
          freightId,
          initialMessage: autoMessage,
        },
      });
      toast.success(`Abrindo chat com ${freightData.customerName || 'empresa'}`);
    } else {
      toast.error('Não foi possível abrir o chat - dados do frete incompletos');
    }
  };

  return (
    <FreightDetailScreen
      freight={freight}
      user={user}
      onBack={handleBack}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleStatus={handleToggleStatus}
      onUpdate={reload}
      isOwnFreight={isOwnFreight}
      onChat={handleChat}
    />
  );
}