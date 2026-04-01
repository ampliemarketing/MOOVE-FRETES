import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { ProfileScreen } from '../ProfileScreen';
import { PublicProfileView } from '../PublicProfileView';
import { LoadingSpinner } from '../LoadingSpinner';
import { useProfileById } from '../../utils/hooks/useProfileById';

export function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isCollaborator = !!user.collaborator;
  const resolvedCompanyId = user.collaborator?.companyId || user.id;

  return (
    <ProfileScreen
      user={user}
      onLogout={logout}
      isCollaborator={isCollaborator}
      companyId={isCollaborator ? resolvedCompanyId : undefined}
      companyName={user.collaborator?.companyName}
    />
  );
}

export function PublicProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, loading, error } = useProfileById(id || '');

  if (!user) return null;

  // If viewing own profile, redirect to /perfil
  if (id === user.id) {
    return <ProfilePage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="text-center">
          <h2 className="text-lg mb-2" style={{ fontWeight: 500 }}>Perfil não encontrado</h2>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
            {error || 'O perfil solicitado não existe ou foi removido.'}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-[0.75rem] bg-[#253663] text-white"
          style={{ fontSize: '14px', fontWeight: 400 }}
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <PublicProfileView
      profile={profile}
      currentUser={user}
      onBack={handleBack}
    />
  );
}
