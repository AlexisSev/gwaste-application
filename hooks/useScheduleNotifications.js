import { useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNotification } from './useInAppNotification';
import { useLocalNotifications } from './useLocalNotifications';

export const useScheduleNotifications = (residentId) => {
  const { showNotification } = useNotification();
  const { scheduleNotification, cancelAllNotifications } = useLocalNotifications();

  // Check if a notification should be shown based on schedule
  const checkAndShowNotification = useCallback(async (schedule) => {
    if (!schedule) return;

    const now = new Date();
    const collectionTime = new Date(schedule.collection_time);

    // Calculate time difference in minutes
    const timeDiff = (collectionTime - now) / (1000 * 60);

    // Show notification if collection is within the next 30 minutes
    if (timeDiff > 0 && timeDiff <= 30) {
      showNotification({
        title: '🚛 Garbage Collection Reminder',
        message: `Your ${schedule.waste_type} collection is scheduled for ${schedule.collection_time}.`,
        type: 'info',
        duration: 10000 // Show for 10 seconds
      });

      // Also schedule a local push notification
      await scheduleNotification({
        title: '🚛 Garbage Collection Reminder',
        body: `Your ${schedule.waste_type} collection is coming up soon!`,
        data: { type: 'garbage_collection_reminder', scheduleId: schedule.id },
        trigger: { minutes: 5 }, // Show in 5 minutes as a reminder
      });
    }
  }, [showNotification, scheduleNotification]);

  // Cancel all scheduled notifications for this resident
  const cancelScheduledNotifications = useCallback(async () => {
    try {
      await cancelAllNotifications();
    } catch (error) {
      console.error('Error cancelling scheduled notifications:', error);
    }
  }, [cancelAllNotifications]);

  // Set up real-time subscription for schedule changes
  useEffect(() => {
    if (!residentId) return;

    // Initial check for upcoming collections
    const checkUpcomingCollections = async () => {
      const { data: schedules } = await supabase
        .from('schedules') // Make sure this matches your schedules table name
        .select('*')
        .eq('resident_id', residentId)
        .gte('collection_time', new Date().toISOString())
        .order('collection_time', { ascending: true })
        .limit(1);

      if (schedules && schedules.length > 0) {
        checkAndShowNotification(schedules[0]);
      }
    };

    checkUpcomingCollections();

    // Set up real-time subscription
    const channel = supabase
      .channel('schedules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `resident_id=eq.${residentId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            checkAndShowNotification(payload.new);
          }
        }
      )
      .subscribe();

    // Check for upcoming collections every 5 minutes
    const interval = setInterval(checkUpcomingCollections, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [residentId, checkAndShowNotification]);

  return { checkAndShowNotification, cancelScheduledNotifications };
};
