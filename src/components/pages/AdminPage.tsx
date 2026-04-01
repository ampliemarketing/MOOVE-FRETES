import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SuperAdminPanel } from '../admin/SuperAdminPanel';
import { Toaster } from '../ui/sonner';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <SuperAdminPanel
        onExit={() => navigate('/')}
        userEmail={user?.email}
      />
      <Toaster position="top-right" />
    </>
  );
}
