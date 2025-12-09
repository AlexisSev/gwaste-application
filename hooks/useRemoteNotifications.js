import { useCallback } from 'react';
import { Notifications } from 'expo-notifications';
import { supabase } from '../services/supabaseClient';
import { NotificationService } from '../services/notificationService';

export const useRemoteNotifications = () => {

  // Complete a collection and send notification to resident
  const completeCollection = useCallback(async (scheduleId) => {
    try {
      const { data, error } = await supabase.functions.invoke('collection_completed_notification', {
        body: { scheduleId }
      });

      if (error) {
        console.error('Error completing collection:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error calling collection completion function:', error);
      return { success: false, error: 'Failed to complete collection and notify resident' };
    }
  }, []);

  // Report truck issue and send notifications to collectors
  const reportTruckIssue = useCallback(async (options) => {
    try {
      const {
        truckId,
        location,
        description,
        issueType = 'maintenance',
        latitude,
        longitude,
        collectorName
      } = options;

      // For now, we'll use the collector context to get the user ID
      // Since we don't have proper auth, we'll pass the user info differently
      const { data, error } = await supabase.functions.invoke('truck_issue_notification', {
        body: {
          truckId,
          reportedBy: null, // Will be set server-side or passed differently
          collectorName,
          location,
          description,
          issueType,
          latitude,
          longitude
        }
      });

      if (error) {
        console.error('Error reporting truck issue:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error calling truck issue function:', error);
      return { success: false, error: 'Failed to report truck issue' };
    }
  }, []);

  // Register user's Expo push token for receiving notifications
  const registerForNotifications = useCallback(async (userId) => {
    try {
      // Get Expo push token
      const { data: pushToken } = await Notifications.getExpoPushTokenAsync();

      if (pushToken?.data) {
        // Store push token in push_tokens table
        await NotificationService.registerUser(userId, pushToken.data, 'expo');
        return true;
      } else {
        console.warn('No Expo push token available');
        return false;
      }
    } catch (error) {
      console.error('Error registering for notifications:', error);
      return false;
    }
  }, []);

  // Update user's notification preferences (placeholder for future implementation)
  const updateNotificationPreferences = useCallback(async (preferences) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return false;

      // This would update a notification_preferences table (not implemented yet)
      // For now, just store in profiles if needed
      console.log('Notification preferences update requested:', preferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }, []);

  return {
    completeCollection,
    reportTruckIssue,
    registerForNotifications,
    updateNotificationPreferences,
  };
};
