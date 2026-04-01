// Email service for sending notifications
// In production, this would integrate with a real email service like SendGrid, Mailgun, etc.

export async function sendCollaboratorInviteEmail(
  email: string,
  inviterName: string,
  companyName: string,
  inviteLink: string
): Promise<void> {
  // Email sending is not implemented
  // This is a placeholder for future email service integration
}

export async function sendCollaboratorRemovedEmail(
  email: string,
  companyName: string
): Promise<void> {
  // Email sending is not implemented
  // This is a placeholder for future email service integration
}