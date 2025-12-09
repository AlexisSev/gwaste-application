import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';

export const useLocalNotifications = () => {
  // Schedule a single local notification
  const scheduleNotification = useCallback(async (options) => {
    const { title, body, sound = true, vibrate = true, data = {}, trigger = null } = options;

    // Check if Notifications is available
    if (!Notifications?.scheduleNotificationAsync) {
      console.warn('Notifications not available in this environment');
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound,
          vibrate,
        },
        trigger: trigger || { seconds: 1 }, // Default to 1 second if no trigger provided
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }, []);

  // Schedule a recurring notification
  const scheduleRecurringNotification = useCallback(async (options) => {
    const { title, body, sound = true, vibrate = true, data = {}, repeats = false, interval = 'day', hour = 9, minute = 0 } = options;

    const trigger = repeats ? {
      hour,
      minute,
      repeats: true,
    } : {
      hour,
      minute,
      repeats: false,
    };

    return await scheduleNotification({
      title,
      body,
      sound,
      vibrate,
      data,
      trigger,
    });
  }, [scheduleNotification]);

  // Cancel a specific notification
  const cancelNotification = useCallback(async (notificationId) => {
    if (!Notifications?.cancelScheduledNotificationAsync) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  // Cancel all scheduled notifications
  const cancelAllNotifications = useCallback(async () => {
    if (!Notifications?.cancelAllScheduledNotificationsAsync) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  // Get all scheduled notifications
  const getAllScheduledNotifications = useCallback(async () => {
    if (!Notifications?.getAllScheduledNotificationsAsync) {
      console.warn('Notifications not available in this environment');
      return [];
    }

    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Scheduled notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }, []);

  return {
    scheduleNotification,
    scheduleRecurringNotification,
    cancelNotification,
    cancelAllNotifications,
    getAllScheduledNotifications,
  };
};
