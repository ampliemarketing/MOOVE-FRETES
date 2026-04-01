import React, { useState } from 'react';
import { MyPreferredRoutes } from '../MyPreferredRoutes';
import { AddPreferredRoute } from '../AddPreferredRoute';
import { toast } from 'sonner@2.0.3';

export function PreferredRoutesPage() {
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);

  if (showAddRouteForm) {
    return (
      <AddPreferredRoute
        onBack={() => setShowAddRouteForm(false)}
        onSuccess={() => {
          setShowAddRouteForm(false);
          toast.success('Rota adicionada com sucesso!');
        }}
      />
    );
  }

  return <MyPreferredRoutes onAddRoute={() => setShowAddRouteForm(true)} />;
}
