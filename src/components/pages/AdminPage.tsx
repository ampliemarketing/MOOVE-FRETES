import React from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SuperAdminPanel } from '../admin/SuperAdminPanel';
import { Toaster } from '../ui/sonner';
import { SUPER_ADMIN_EMAILS } from '../admin/admin-mock-data';

export function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!authenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!SUPER_ADMIN_EMAILS.includes(user.email ?? '')) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SuperAdminPanel
        onExit={() => navigate('/')}
        userEmail={user.email}
      />
      <Toaster position="top-right" />
    </>
  );
}
