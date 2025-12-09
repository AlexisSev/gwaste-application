import { supabase } from './supabaseClient';

export class NotificationService {

  // Send notification to specific user via Expo Push API
  static async sendToUser(userId, title, message, data = {}) {
    try {
      // Get user's Expo push token from push_tokens table
      const { data: token } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (!token?.token) {
        console.log('No Expo push token found for user:', userId);
        return false;
      }

      // Send via Expo Push API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token.token,
          title: title,
          body: message,
          data: data,
          sound: 'default',
          priority: 'default',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Expo push API error:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('Expo push notification sent:', result);
      return true;
    } catch (error) {
      console.error('Error in sendToUser:', error);
      return false;
    }
  }

  // Send notification to all users with specific role via Expo Push API
  static async sendToRole(role, title, message, data = {}) {
    try {
      // Get all users with specific role and their Expo push tokens from push_tokens table
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('platform', 'expo'); // Only get Expo tokens

      // Join with profiles to filter by user_type
      const { data: users } = await supabase
        .from('push_tokens')
        .select(`
          token,
          profiles:residents!push_tokens_user_id_fkey (
            user_type
          )
        `)
        .eq('platform', 'expo');

      if (!users || users.length === 0) {
        console.log(`No ${role}s found with Expo push tokens`);
        return false;
      }

      // Filter by role and extract tokens
      const pushTokens = users
        .filter(user => user.profiles?.user_type === role)
        .map(user => user.token)
        .filter(token => token); // Remove null/undefined tokens

      if (pushTokens.length === 0) {
        console.log(`No valid Expo push tokens found for ${role}s`);
        return false;
      }

      // Send to all users (Expo supports array of messages)
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushTokens.map(token => ({
          to: token,
          title: title,
          body: message,
          data: data,
          sound: 'default',
          priority: 'default',
        }))),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Expo push API error:', errorData);
        return false;
      }

      const result = await response.json();
      console.log(`Expo push notifications sent to ${pushTokens.length} ${role}s:`, result);
      return true;
    } catch (error) {
      console.error('Error in sendToRole:', error);
      return false;
    }
  }

  // Send notification when collection is completed
  static async notifyCollectionCompleted(collectionId, residentId, wasteType) {
    try {
      const title = '🗑️ Collection Completed';
      const message = `Your ${wasteType} waste collection has been completed successfully!`;

      await this.sendToUser(residentId, title, message, {
        type: 'collection_completed',
        collection_id: collectionId,
        waste_type: wasteType
      });

      return true;
    } catch (error) {
      console.error('Error notifying collection completed:', error);
      return false;
    }
  }

  // Send notification when truck issue is reported
  static async notifyTruckIssue(truckId, location, description) {
    try {
      const title = '🚛 Truck Issue Reported';
      const message = `A truck issue has been reported at ${location}: ${description}`;

      // Notify all collectors
      await this.sendToRole('collector', title, message, {
        type: 'truck_issue',
        truck_id: truckId,
        location: location,
        description: description
      });

      return true;
    } catch (error) {
      console.error('Error notifying truck issue:', error);
      return false;
    }
  }

  // Register user's Expo push token
  static async registerUser(userId, pushToken, platform = 'expo') {
    try {
      // Upsert the token in push_tokens table
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: pushToken,
          platform: platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error storing Expo push token:', error);
        return false;
      }

      console.log('User registered with Expo push token:', userId);
      return true;
    } catch (error) {
      console.error('Error registering user:', error);
      return false;
    }
  }

  // Get current user's Expo push token
  static async getCurrentUserToken(userId) {
    try {
      const { data } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      return data?.token;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  // Update user's push token
  static async updateUserToken(userId, newToken) {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .update({
          token: newToken,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating Expo push token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user token:', error);
      return false;
    }
  }
}
