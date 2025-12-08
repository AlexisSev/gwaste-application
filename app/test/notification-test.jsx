import { Button, ScrollView, StyleSheet, View } from 'react-native';
import InAppNotification from '../../components/InAppNotification';
import { useInAppNotification } from '../../hooks/useInAppNotification';

const NotificationTestScreen = () => {
  const { notification, showNotification, dismissNotification } = useInAppNotification();

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
