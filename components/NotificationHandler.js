import { Alert } from 'react-native';
import { supabase } from '../services/supabaseClient';

export const handleNotificationPress = (notifications, loadNotifications) => {
  const unreadCount = notifications?.filter(n => !n.is_read)?.length || 0;

  if (!notifications?.length) {
    Alert.alert('Notifications', 'You are all caught up!');
    return;
  }

  const unreadNotifications = notifications.filter(n => !n.is_read);

  if (unreadNotifications.length === 0) {
    Alert.alert('Notifications', 'You have no new notifications.');
    return;
  }

  const notificationList = unreadNotifications
    .slice(0, 5)
    .map((notif, idx) => {
      const date = notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Just now';
      return `${idx + 1}. ${notif.title}\n   ${notif.message}\n   ${date}`;
    })
    .join('\n\n');

  const moreText = unreadNotifications.length > 5
    ? `\n\n...and ${unreadNotifications.length - 5} more notification${unreadNotifications.length - 5 > 1 ? 's' : ''}`
    : '';

  Alert.alert(
    `Notifications (${unreadCount} new)`,
    notificationList + moreText,
    [
      {
        text: 'Mark All as Read',
        onPress: async () => {
          const unreadIds = unreadNotifications.map(n => n.notification_id);
          if (unreadIds.length > 0) {
            const { error } = await supabase
              .from('notifications')
              .update({ is_read: true })
              .in('notification_id', unreadIds);

            if (!error) {
              loadNotifications();
            }
          }
        }
      },
      { text: 'OK' }
    ]
  );
};
