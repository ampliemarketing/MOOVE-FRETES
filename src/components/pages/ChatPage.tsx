import React from 'react';
import { useLocation, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { ChatScreen } from '../ChatScreen';

export function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams<{ userId?: string }>();

  if (!user) return null;

  const resolvedCompanyId = user.collaborator?.companyId || user.id;
  const isCollaborator = !!user.collaborator;

  // Read navigation state passed from other pages, fallback to URL params
  const navState = location.state || {};
  const initialUserId = navState.userId || params.userId || null;
  const initialFreightId = navState.freightId || null;
  const initialMessage = navState.initialMessage || undefined;

  return (
    <ChatScreen
      user={user}
      initialFreightId={initialFreightId}
      initialMessage={initialMessage}
      initialUserId={initialUserId}
      companyId={isCollaborator ? resolvedCompanyId : undefined}
    />
  );
}