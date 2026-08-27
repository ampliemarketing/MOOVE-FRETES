/**
 * Hook global para notificação de "nova mensagem".
 *
 * DESATIVADO: essa notificação in-app agora é criada no banco pelo trigger
 * `on_message_insert_notification` (migration 0017), e o `AppContext` já
 * assina o Realtime da tabela `notifications`. Criar a linha pelo cliente
 * aqui gerava DUPLICATA — e desde o 0017 o INSERT do cliente em
 * `notifications` para outro `user_id` é bloqueado por RLS (passava a só
 * falhar silenciosamente).
 *
 * Mantido como no-op para não mexer no call site em `App.tsx`.
 */
export function useGlobalMessageNotifications(_userId: string | undefined): void {
  // intencionalmente vazio — ver comentário acima
}
