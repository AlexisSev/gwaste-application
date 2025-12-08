import * as Notifications from 'expo-notifications';
import { useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNotification } from './useInAppNotification';

export const useScheduleNotifications = (residentId) => {
  const { showNotification } = useNotification();

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
      await schedulePushNotification(
        '🚛 Garbage Collection Reminder',
        `Your ${schedule.waste_type} collection is coming up soon!`
      );
    }
  }, [showNotification]);

  // Schedule local push notification
  const schedulePushNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { data: 'garbage_collection_reminder' },
      },
      trigger: { seconds: 1 }, // Show after 1 second
    });
  };

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

  return { checkAndShowNotification };
};
