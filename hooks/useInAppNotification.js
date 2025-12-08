import { createContext, useCallback, useContext, useState } from 'react';
import InAppNotification from '../components/InAppNotification';

export const useInAppNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback(({ title, message, type = 'info', duration = 5000 }) => {
    const notificationId = Date.now().toString();
    
    setNotification({
      id: notificationId,
      title,
      message,
      type,
    });

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setNotification(current => 
        current?.id === notificationId ? null : current
      );
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    dismissNotification,
  };
};

// Create a context for the notification system
export const NotificationContext = createContext({
  showNotification: () => {},
  dismissNotification: () => {},
});

// Create a provider component
export const NotificationProvider = ({ children }) => {
  const { notification, showNotification, dismissNotification } = useInAppNotification();

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification }}>
      {children}
      {notification && (
        <InAppNotification 
          notification={notification}
          onDismiss={dismissNotification}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotification = () => {
  return useContext(NotificationContext);
};
