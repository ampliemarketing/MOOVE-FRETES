import React from 'react';
import { Navigate, useParams } from 'react-router';

export function DriverDeepLink() {
  const { id } = useParams();
  return <Navigate to={`/perfil/${id}`} replace />;
}

export function CompanyDeepLink() {
  const { id } = useParams();
  return <Navigate to={`/perfil/${id}`} replace />;
}

export function FreightDeepLink() {
  const { id } = useParams();
  return <Navigate to={`/fretes/${id}`} replace />;
}

export function ChatDeepLink() {
  const { id } = useParams();
  return <Navigate to="/chat" state={{ userId: id }} replace />;
}

export function ProfileDeepLink() {
  const { id } = useParams();
  return <Navigate to={`/perfil/${id}`} replace />;
}