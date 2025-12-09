import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalNotifications } from '../hooks/useLocalNotifications';
import { useRemoteNotifications } from '../hooks/useRemoteNotifications';
import { Picker } from '@react-native-picker/picker';

const LocalNotificationPanel = () => {
  const {
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getAllScheduledNotifications
  } = useLocalNotifications();

  const {
    completeCollection,
    reportTruckIssue
  } = useRemoteNotifications();

  // Form state for custom notification
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [delay, setDelay] = useState('5');
  const [notificationType, setNotificationType] = useState('general');
  const [isScheduled, setIsScheduled] = useState(false);

  // List of scheduled notifications
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Preset notification templates
  const notificationTypes = {
    general: {
      title: 'General Notification',
      body: 'This is a test notification',
      data: { type: 'test' }
    },
    reminder: {
      title: 'Reminder',
      body: 'Don\'t forget your scheduled task!',
      data: { type: 'reminder' }
    },
    collection: {
      title: '🗑️ Waste Collection Reminder',
      body: 'Your waste collection is scheduled in 30 minutes',
      data: { type: 'garbage_collection_reminder', collection_type: 'mixed' }
    },
    alert: {
      title: '⚠️ Alert',
      body: 'Important alert message here',
      data: { type: 'alert', priority: 'high' }
    },
    update: {
      title: '📱 Update Available',
      body: 'A new version of the app is available',
      data: { type: 'update', version: '1.2.0' }
    }
  };

  // Load scheduled notifications
  const loadScheduledNotifications = async () => {
    setLoading(true);
    try {
      const notifications = await getAllScheduledNotifications();
      setScheduledNotifications(notifications || []);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      Alert.alert('Error', 'Failed to load scheduled notifications');
    } finally {
      setLoading(false);
    }
  };

  // Handle sending custom notification
  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter both title and body');
      return;
    }

    const delaySeconds = parseInt(delay);
    if (isNaN(delaySeconds) || delaySeconds < 0) {
      Alert.alert('Error', 'Please enter a valid delay in seconds');
      return;
    }

    try {
      const notificationData = {
        title: title.trim(),
        body: body.trim(),
        sound: true,
        vibrate: true,
        data: {
          ...notificationTypes[notificationType]?.data,
          custom: true,
          created_at: new Date().toISOString()
        }
      };

      if (delaySeconds > 0) {
        notificationData.trigger = { seconds: delaySeconds };
      } else {
        notificationData.trigger = { seconds: 1 }; // Immediate
      }

      const notificationId = await scheduleNotification(notificationData);

      Alert.alert(
        'Success',
        delaySeconds > 0
          ? `Notification scheduled in ${delaySeconds} seconds! ID: ${notificationId}`
          : `Notification sent immediately! ID: ${notificationId}`
      );

      // Reset form
      setTitle('');
      setBody('');
      setDelay('5');
      setIsScheduled(true);

      // Reload scheduled notifications
      setTimeout(() => {
        loadScheduledNotifications();
      }, 1000);

    } catch (error) {
      Alert.alert('Error', `Failed to schedule notification: ${error.message}`);
    }
  };

  // Handle using preset template
  const handleUsePreset = (type) => {
    const preset = notificationTypes[type];
    setTitle(preset.title);
    setBody(preset.body);
    setNotificationType(type);
  };

  // Handle canceling notification
  const handleCancelNotification = async (identifier) => {
    try {
      await cancelNotification(identifier);
      Alert.alert('Success', 'Notification cancelled');
      loadScheduledNotifications();
    } catch (error) {
      Alert.alert('Error', `Failed to cancel notification: ${error.message}`);
    }
  };

  // Handle canceling all notifications
  const handleCancelAllNotifications = async () => {
    Alert.alert(
      'Confirm',
      'Cancel all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              Alert.alert('Success', 'All scheduled notifications cancelled');
              setScheduledNotifications([]);
            } catch (error) {
              Alert.alert('Error', `Failed to cancel notifications: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Format notification data for display
  const formatNotificationDate = (date) => {
    return new Date(date).toLocaleString();
  };

  useEffect(() => {
    loadScheduledNotifications();
  }, []);

  const renderScheduledNotification = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.content?.title || 'No title'}</Text>
        <Text style={styles.notificationBody}>{item.content?.body || 'No body'}</Text>
        <Text style={styles.notificationInfo}>
          Next trigger: {formatNotificationDate(item.trigger?.nextTriggerDate || item.date)}
        </Text>
        <Text style={styles.notificationId}>ID: {item.identifier}</Text>
      </View>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancelNotification(item.identifier)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📱 Local Notification Panel</Text>
          <Text style={styles.headerSubtitle}>Create and manage local push notifications</Text>
        </View>

        {/* Preset Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesContainer}>
            {Object.keys(notificationTypes).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.templateButton}
                onPress={() => handleUsePreset(type)}
              >
                <Text style={styles.templateButtonText}>
                  {notificationTypes[type].title.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Custom Notification Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Notification</Text>

          {/* Type Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Notification Type:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={notificationType}
                onValueChange={(itemValue) => setNotificationType(itemValue)}
                style={styles.picker}
              >
                {Object.keys(notificationTypes).map((type) => (
                  <Picker.Item
                    key={type}
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                    value={type}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title:</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter notification title..."
              placeholderTextColor="#999"
            />
          </View>

          {/* Body Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message:</Text>
            <TextInput
              style={[styles.textInput, styles.bodyInput]}
              value={body}
              onChangeText={setBody}
              placeholder="Enter notification message..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Delay Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Delay (seconds):</Text>
            <TextInput
              style={[styles.textInput, styles.numberInput]}
              value={delay}
              onChangeText={setDelay}
              placeholder="5"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.primaryButton, (!title.trim() || !body.trim()) && styles.disabledButton]}
            onPress={handleSendNotification}
            disabled={!title.trim() || !body.trim()}
          >
            <Text style={styles.primaryButtonText}>
              📤 Send Notification ({parseInt(delay) || 0}s delay)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scheduled Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduled Notifications ({scheduledNotifications.length})</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadScheduledNotifications}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>

          {scheduledNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No scheduled notifications</Text>
            </View>
          ) : (
            <FlatList
              data={scheduledNotifications}
              renderItem={renderScheduledNotification}
              keyExtractor={(item) => item.identifier}
              style={styles.notificationsList}
            />
          )}

          {scheduledNotifications.length > 0 && (
            <TouchableOpacity
              style={[styles.primaryButton, styles.dangerButton]}
              onPress={handleCancelAllNotifications}
            >
              <Text style={styles.primaryButtonText}>🗑️ Cancel All Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Remote Notification Testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Remote Notification Testing</Text>
          <Text style={styles.sectionSubtitle}>Test cross-device push notifications</Text>

          <TouchableOpacity
            style={[styles.primaryButton, styles.remoteButton, { backgroundColor: '#28a745' }]}
            onPress={async () => {
              Alert.alert(
                'Test Collection Completion',
                'This will complete the test schedule and notify the resident if they have push token.\n\nSchedule ID: 08226950-9ad8-4894-b621-3d0e36803d1e',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Complete Collection',
                    onPress: async () => {
                      try {
                        const result = await completeCollection('08226950-9ad8-4894-b621-3d0e36803d1e');
                        if (result.success) {
                          Alert.alert('Success!', '✓ Collection completed!\n✓ Schedule status updated to "completed"\n✓ Push notification sent (if resident has token)');
                        } else {
                          Alert.alert('Completed with Note', `✓ Schedule completed!\n\nNote: ${result.error}\n\nThis is normal if no push token exists.`);
                        }
                      } catch (error) {
                        Alert.alert('Completed with Warning', `✓ Schedule completed!\n\nNotification failed: ${error.message}\n\nThis is expected if resident has no push token.`);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.primaryButtonText}>🗑️ Test Collection Completion Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, styles.remoteButton, { backgroundColor: '#fd7e14' }]}
            onPress={async () => {
              Alert.alert(
                'Test Truck Issue Report',
                'This will simulate reporting a truck issue and notify ALL residents about potential delays.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Test Alert to Residents',
                    onPress: async () => {
                      try {
                        const result = await reportTruckIssue({
                          truckId: 'test-4582645a',
                          location: 'Test Location - Downtown',
                          description: 'Engine overheating - Test notification for residents',
                          issueType: 'mechanical',
                          latitude: 14.5995,
                          longitude: 120.9842,
                          collectorName: 'Test Collector'
                        });

                        if (result.success) {
                          Alert.alert('Success', 'Truck issue notification sent to ALL residents!');
                        } else {
                          Alert.alert('Error', `Failed: ${result.error}`);
                        }
                      } catch (error) {
                        Alert.alert('Error', `Failed: ${error.message}`);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.primaryButtonText}>🚛 Test Truck Issue Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Instructions</Text>
          <Text style={styles.instructions}>
            • Enter title and body text for your notification{'\n'}
            • Set delay in seconds (0 for immediate){'\n'}
            • Choose notification type for data payload{'\n'}
            • Use templates for quick setup{'\n'}
            • Manage scheduled notifications below
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  templatesContainer: {
    marginTop: 8,
  },
  templateButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  templateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginTop: 4,
  },
  picker: {
    height: 50,
    color: '#495057',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#343a40',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#495057',
  },
  bodyInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  numberInput: {
    width: '50%',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  remoteButton: {
    marginBottom: 12,
  },
  notificationsList: {
    maxHeight: 200,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
  },
  notificationInfo: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
  },
  notificationId: {
    fontSize: 10,
    color: '#adb5bd',
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    marginLeft: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  instructions: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
});

export default LocalNotificationPanel;
