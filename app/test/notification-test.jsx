import { Button, ScrollView, StyleSheet, View, Alert, Platform } from 'react-native';
import InAppNotification from '../../components/InAppNotification';
import { useInAppNotification } from '../../hooks/useInAppNotification';
import { useLocalNotifications } from '../../hooks/useLocalNotifications';
import * as Notifications from 'expo-notifications';

const NotificationTestScreen = () => {
  const { notification, showNotification, dismissNotification } = useInAppNotification();
  const { scheduleNotification, cancelAllNotifications, getAllScheduledNotifications } = useLocalNotifications();

  const showTestNotification = (type) => {
    const notifications = {
      success: {
        title: 'Success!',
        message: 'Your action was completed successfully!',
        type: 'success'
      },
      error: {
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'error'
      },
      warning: {
        title: 'Warning',
        message: 'This action cannot be undone.',
        type: 'warning'
      },
      info: {
        title: 'Info',
        message: 'Here is some information you should know.',
        type: 'info'
      }
    };

    showNotification(notifications[type]);
  };

  const testPushNotification = async (type) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Push notifications are not available in web browsers. Please test on a real device.');
      return;
    }

    try {
      let options = {};

      switch (type) {
        case 'immediate':
          options = {
            title: 'Test Notification',
            body: 'This is an immediate test push notification!',
            data: { test: true },
            trigger: { seconds: 2 } // Show in 2 seconds
          };
          break;
        case 'delayed':
          options = {
            title: 'Delayed Notification',
            body: 'This notification was scheduled for 10 seconds from now.',
            data: { test: 'delayed' },
            trigger: { seconds: 10 }
          };
          break;
        case 'reminder':
          options = {
            title: 'Reminder Test',
            body: 'This simulates a garbage collection reminder.',
            data: { type: 'garbage_collection_reminder' },
            trigger: { seconds: 5 }
          };
          break;
      }

      const notificationId = await scheduleNotification(options);
      Alert.alert('Success', `Push notification scheduled! ID: ${notificationId}`);
    } catch (error) {
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Notification permissions are not available in web browsers.');
      return;
    }

    if (!Notifications?.getPermissionsAsync) {
      Alert.alert('Not Supported', 'Notifications not available in this build.');
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    Alert.alert('Permissions', `Notification permissions status: ${status}`);
  };

  const checkScheduledNotifications = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Scheduled notifications are not available in web browsers.');
      return;
    }

    if (!Notifications?.getAllScheduledNotificationsAsync) {
      Alert.alert('Not Supported', 'Scheduled notifications not available in this build.');
      return;
    }

    const notifications = await getAllScheduledNotifications();
    Alert.alert('Scheduled Notifications', `Count: ${notifications.length}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.buttonContainer}>
          <Button
            title="Show Success Notification"
            onPress={() => showTestNotification('success')}
            color="#4CAF50"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Show Error Notification"
            onPress={() => showTestNotification('error')}
            color="#F44336"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Show Warning Notification"
            onPress={() => showTestNotification('warning')}
            color="#FF9800"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Show Info Notification"
            onPress={() => showTestNotification('info')}
            color="#2196F3"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Dismiss Current Notification"
            onPress={dismissNotification}
            color="#9E9E9E"
          />
        </View>

        {/* Push Notification Tests */}
        <View style={{ marginTop: 40, marginBottom: 16 }}>
          <Button
            title="Immediate Push Notification"
            onPress={() => testPushNotification('immediate')}
            color="#673AB7"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Delayed Push Notification (10s)"
            onPress={() => testPushNotification('delayed')}
            color="#3F51B5"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Reminder Push Notification (5s)"
            onPress={() => testPushNotification('reminder')}
            color="#009688"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Check Notification Permissions"
            onPress={checkPermissions}
            color="#607D8B"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="View Scheduled Notifications"
            onPress={checkScheduledNotifications}
            color="#795548"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel All Scheduled Notifications"
            onPress={async () => {
              await cancelAllNotifications();
              Alert.alert('Success', 'All scheduled notifications cancelled');
            }}
            color="#F44336"
          />
        </View>
      </ScrollView>

      {/* The notification component */}
      <InAppNotification 
        notification={notification} 
        onDismiss={dismissNotification} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  buttonContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default NotificationTestScreen;
