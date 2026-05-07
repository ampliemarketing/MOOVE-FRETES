import { createBrowserRouter, Navigate } from 'react-router';

// Layout & guards
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LoginPage } from './components/pages/LoginPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { AllFreightsPage, MyFreightsPage, FreightRegistrationPage, FreightHistoryPage, FreightDetailPage } from './components/pages/FreightsPage';
import { DriversPage, PublishedRoutesPage, CompaniesPage } from './components/pages/DriversPage';
import { ChatPage } from './components/pages/ChatPage';
import { SocialPage } from './components/pages/SocialPage';
import { ProfilePage, PublicProfileDetailPage } from './components/pages/ProfilePage';
import { SettingsPage } from './components/pages/SettingsPage';
import { TransactionsPage } from './components/pages/TransactionsPage';
import { CollaboratorsPage } from './components/pages/CollaboratorsPage';
import { ActivityLogsPage } from './components/pages/ActivityLogsPage';
import { PreferredRoutesPage } from './components/pages/PreferredRoutesPage';
import { AdminPage } from './components/pages/AdminPage';
import { DriverDeepLink, CompanyDeepLink, FreightDeepLink, ChatDeepLink } from './components/pages/DeepLinkRedirects';


export const router = createBrowserRouter([
  // Admin route (outside main layout) - Moved to top for priority
  {
    path: '/admin/*',
    element: <AdminPage />,
  },

  // Public routes
  {
    path: '/login',
    Component: LoginPage,
  },

  // Protected routes with app layout
  {
    Component: ProtectedRoute,
    children: [
      {
        Component: AppLayout,
        children: [
          // Dashboard
          { index: true, Component: DashboardPage },

          // Freights
          { path: 'fretes', Component: AllFreightsPage },
          { path: 'fretes/meus', Component: MyFreightsPage },
          { path: 'fretes/novo', Component: FreightRegistrationPage },
          { path: 'fretes/historico', Component: FreightHistoryPage },
          { path: 'fretes/:id', Component: FreightDetailPage },

          // Drivers / Companies
          { path: 'motoristas', Component: DriversPage },
          { path: 'motoristas/rotas', Component: PublishedRoutesPage },
          { path: 'empresas', Component: CompaniesPage },

          // Preferred routes (caminhoneiro)
          { path: 'rotas', Component: PreferredRoutesPage },

          // Chat
          { path: 'chat', Component: ChatPage },
          { path: 'chat/:userId', Component: ChatPage },

          // Social
          { path: 'social', Component: SocialPage },

          // Profile
          { path: 'perfil', Component: ProfilePage },
          { path: 'perfil/:id', Component: PublicProfileDetailPage },

          // Settings
          { path: 'configuracoes', Component: SettingsPage },

          // Financial
          { path: 'financeiro', Component: TransactionsPage },

          // Collaborators
          { path: 'colaboradores', Component: CollaboratorsPage },

          // Activity Logs
          { path: 'logs', Component: ActivityLogsPage },

          // Deep link routes (legacy URL support)
          { path: 'motorista/:id', Component: DriverDeepLink },
          { path: 'empresa/:id', Component: CompanyDeepLink },
          { path: 'frete/:id', Component: FreightDeepLink },
          { path: 'rota/:id', element: <Navigate to="/rotas" replace /> },
          { path: 'post/:id', element: <Navigate to="/social" replace /> },

          // Catch-all
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);