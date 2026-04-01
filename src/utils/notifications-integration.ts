// Notification integration utilities
// Handles cross-component notification dispatching

type NotificationHandler = (notification: {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}) => void;

let notificationHandler: NotificationHandler | null = null;

export function setNotificationHandler(handler: NotificationHandler) {
  notificationHandler = handler;
}

export function dispatchNotification(notification: {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}) {
  if (notificationHandler) {
    notificationHandler(notification);
  }
}
