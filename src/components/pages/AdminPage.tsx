import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SuperAdminPanel } from '../admin/SuperAdminPanel';
import { Toaster } from '../ui/sonner';
import { SUPER_ADMIN_EMAILS } from '../admin/admin-mock-data';
import { AdminLoginScreen } from '../admin/AdminLoginScreen';

export function AdminPage() {
  const { user, authenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && authenticated && user?.email) {
      const authorized = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
      setIsAdmin(authorized);
    } else {
      setIsAdmin(false);
    }
  }, [loading, authenticated, user]);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <>
        <AdminLoginScreen 
          onSuccess={() => setIsAdmin(true)} 
          onExit={() => navigate('/')} 
        />
        <Toaster position="top-right" />
      </>
    );
  }

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

