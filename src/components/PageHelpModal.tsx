/**
 * Componente de ajuda contextual por página
 * Exibe um ícone de interrogação no cabeçalho que abre um modal com informações sobre a página atual
 */

import React, { useState } from 'react';
import { FaRegQuestionCircle } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

export interface PageHelpInfo {
  title: string;
  description: string;
  tips?: string[];
}

// Mapeamento de informações de ajuda por página/tab
export const pageHelpData: Record<string, PageHelpInfo> = {
  dashboard: {
    title: 'Página Inicial',
    description:
      'Esta é a sua página inicial onde você tem uma visão geral das suas operações. Aqui você encontra estatísticas resumidas, ações rápidas e atividades recentes.',
    tips: [
      'Acompanhe o número de fretes ativos e motoristas conectados.',
      'Use as ações rápidas para criar fretes, buscar motoristas ou acessar o chat.',
      'A seção de atividade recente mostra as últimas movimentações da sua conta.',
    ],
  },
  'freight-management': {
    title: 'Gestão de Fretes',
    description:
      'Gerencie todos os seus fretes nesta tela. Você pode criar novos fretes, acompanhar cotações recebidas e gerenciar o status de cada frete.',
    tips: [
      'Use o botão "Criar Frete" para publicar um novo frete.',
      'Filtre fretes por status, origem, destino ou tipo de veículo.',
      'Clique em um frete para ver detalhes, cotações e opções de gerenciamento.',
      'Fretes concluídos aparecem em uma seção colapsável separada.',
    ],
  },
  'freight-registration': {
    title: 'Cadastro de Frete',
    description:
      'Preencha os dados do frete passo a passo. O formulário possui validação automática para garantir que todas as informações estejam corretas.',
    tips: [
      'Preencha a origem e destino usando o seletor de cidades.',
      'Informe corretamente o tipo de veículo e carga para receber cotações adequadas.',
      'Você pode salvar um rascunho e completar depois.',
    ],
  },
  'my-freights': {
    title: 'Meus Fretes',
    description:
      'Visualize todos os fretes que você criou. Acompanhe o status, cotações recebidas e gerencie cada frete individualmente.',
    tips: [
      'Fretes ativos aparecem na lista principal.',
      'Fretes concluídos ficam em uma seção separada que pode ser expandida.',
      'Use os filtros para encontrar fretes específicos rapidamente.',
    ],
  },
  'all-freights': {
    title: 'Todos os Fretes',
    description:
      'Explore todos os fretes disponíveis na plataforma. Motoristas podem ver fretes publicados por embarcadores e transportadoras para enviar cotações.',
    tips: [
      'Use os filtros para encontrar fretes compatíveis com seu veículo.',
      'Clique em um frete para ver os detalhes completos.',
      'Você pode entrar em contato com o publicador diretamente pelo chat.',
      'Fretes pausados ou inativos não aparecem nesta listagem.',
    ],
  },
  history: {
    title: 'Histórico de Fretes',
    description:
      'Consulte o histórico completo de todos os seus fretes finalizados. Ideal para controle e acompanhamento de operações passadas.',
    tips: [
      'Todos os fretes concluídos ficam registrados aqui.',
      'Use a busca para encontrar fretes antigos.',
      'O histórico é útil para relatórios e análises.',
    ],
  },
  drivers: {
    title: 'Motoristas / Transportadoras',
    description:
      'Encontre e gerencie motoristas ou transportadoras cadastradas na plataforma. Use filtros avançados para encontrar o profissional ideal.',
    tips: [
      'Filtre por verificação, disponibilidade e raio de atuação.',
      'Marque motoristas como favoritos para encontrá-los rapidamente.',
      'Clique em um perfil para ver detalhes completos, avaliações e veículos.',
      'Use o botão de chat para entrar em contato diretamente.',
    ],
  },
  'all-drivers': {
    title: 'Todos os Motoristas',
    description:
      'Lista completa de motoristas cadastrados na plataforma. Use filtros avançados para encontrar motoristas por localização, tipo de veículo e disponibilidade.',
    tips: [
      'O filtro de raio usa geolocalização para encontrar motoristas próximos.',
      'Motoristas verificados possuem um selo de verificação.',
      'Favorite motoristas para acessá-los rapidamente no futuro.',
    ],
  },
  companies: {
    title: 'Transportadoras',
    description:
      'Explore as transportadoras cadastradas na plataforma. Veja informações da empresa, fretes publicados e entre em contato.',
    tips: [
      'Clique em uma empresa para ver seus detalhes e fretes disponíveis.',
      'Use o chat para negociar diretamente com a transportadora.',
      'Verifique as avaliações antes de fechar negócio.',
    ],
  },
  'preferred-routes': {
    title: 'Rotas de Interesse',
    description:
      'Cadastre as rotas que você prefere percorrer. Transportadoras e agenciadores podem ver suas rotas publicadas e oferecer fretes compatíveis.',
    tips: [
      'Adicione rotas com origem e destino para indicar suas preferências.',
      'Suas rotas ficam visíveis para empresas que buscam motoristas.',
      'Mantenha suas rotas atualizadas para receber ofertas relevantes.',
    ],
  },
  'published-routes': {
    title: 'Rotas Publicadas',
    description:
      'Veja as rotas publicadas por motoristas. Encontre motoristas que já passam pela região do seu frete para otimizar a logística.',
    tips: [
      'Filtre por origem e destino para encontrar rotas compatíveis.',
      'Contate o motorista diretamente pelo chat para negociar.',
      'Rotas publicadas indicam onde o motorista prefere trabalhar.',
    ],
  },
  chat: {
    title: 'Chat',
    description:
      'Comunique-se em tempo real com motoristas, transportadoras e embarcadores. Negocie fretes, tire dúvidas e acompanhe conversas.',
    tips: [
      'As mensagens são entregues em tempo real.',
      'Você pode enviar mensagens de texto para negociações.',
      'O chat mantém o histórico completo das conversas.',
      'Use links de frete no chat para referenciar fretes específicos.',
    ],
  },
  social: {
    title: 'Rede Social',
    description:
      'Interaja com a comunidade de profissionais de transporte. Compartilhe experiências, dicas e novidades do setor.',
    tips: [
      'Publique posts para compartilhar sua experiência.',
      'Curta e comente publicações de outros profissionais.',
      'Acompanhe as tendências do mercado de fretes.',
    ],
  },
  profile: {
    title: 'Meu Perfil',
    description:
      'Gerencie suas informações pessoais, documentos e configurações de conta. Mantenha seus dados atualizados para maior credibilidade.',
    tips: [
      'Mantenha seu perfil completo para maior confiabilidade.',
      'Adicione seus documentos para verificação da conta.',
      'Atualize sua foto de perfil para ser reconhecido facilmente.',
      'Gerencie informações de veículos (para motoristas).',
    ],
  },
  settings: {
    title: 'Configurações',
    description:
      'Ajuste as configurações do sistema conforme suas preferências. Gerencie notificações, privacidade e outras opções.',
    tips: [
      'Configure suas preferências de notificação.',
      'Gerencie as configurações de privacidade.',
      'Acesse opções avançadas do sistema.',
    ],
  },
  collaborators: {
    title: 'Colaboradores',
    description:
      'Gerencie os colaboradores da sua empresa. Adicione, edite permissões e controle o acesso de cada membro da equipe.',
    tips: [
      'Adicione colaboradores com diferentes níveis de permissão.',
      'Gerencie quem pode criar fretes, ver cotações e acessar financeiro.',
      'Remova ou desative colaboradores quando necessário.',
    ],
  },
  'activity-logs': {
    title: 'Logs de Atividade',
    description:
      'Acompanhe todas as atividades realizadas na sua conta e pela sua equipe. Útil para auditoria e controle de operações.',
    tips: [
      'Veja quem realizou cada ação na plataforma.',
      'Filtre por tipo de atividade ou período.',
      'Use os logs para identificar atividades suspeitas.',
    ],
  },
  transaction: {
    title: 'Transações',
    description:
      'Acompanhe todas as transações financeiras da sua conta. Veja pagamentos, recebimentos e o histórico financeiro completo.',
    tips: [
      'Acompanhe o status de cada transação.',
      'Veja o histórico completo de pagamentos e recebimentos.',
      'Use os filtros para encontrar transações específicas.',
    ],
  },
};

interface PageHelpModalProps {
  pageId: string;
  className?: string;
}

export function PageHelpModal({ pageId, className }: PageHelpModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const helpInfo = pageHelpData[pageId];

  if (!helpInfo) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center text-muted-foreground hover:text-primary transition-colors duration-200 ${className || ''}`}
        aria-label="Informações sobre esta página"
        title="Ajuda"
      >
        <FaRegQuestionCircle className="w-4 h-4 opacity-20" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaRegQuestionCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{helpInfo.title}</span>
            </DialogTitle>
            <DialogDescription className="text-left mt-3">
              {helpInfo.description}
            </DialogDescription>
          </DialogHeader>

          {helpInfo.tips && helpInfo.tips.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Dicas úteis:
              </h4>
              <ul className="space-y-2.5">
                {helpInfo.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="px-6"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}