import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';

const CollectorAuthContext = createContext();

export const useCollectorAuth = () => {
  const context = useContext(CollectorAuthContext);
  if (!context) {
    throw new Error('useCollectorAuth must be used within a CollectorAuthProvider');
  }
  return context;
};

export const CollectorAuthProvider = ({ children }) => {
  const [collector, setCollector] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored collector data on app start
    loadStoredCollector();
  }, []);

  const loadStoredCollector = async () => {
    try {
      const storedCollector = await AsyncStorage.getItem('collectors');
      if (storedCollector) {
        setCollector(JSON.parse(storedCollector));
      }
    } catch (error) {
      console.error('Error loading stored collector:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (driver, password) => {
    try {
      const driverLower = driver.trim().toLowerCase();
      const collectorsRef = collection(db, 'collectors');
      const querySnapshot = await getDocs(collectorsRef);

      let collectorFound = false;
      let collectorData = null;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const fullNameLower = data.driver ? data.driver.trim().toLowerCase() : '';
        const firstNameLower = data.firstName
          ? data.firstName.trim().toLowerCase()
          : (data.driver ? data.driver.trim().split(/\s+/)[0].toLowerCase() : '');

        if (
          data.password &&
          (fullNameLower === driverLower || firstNameLower === driverLower) &&
          data.password === password
        ) {
          collectorFound = true;
          collectorData = { id: doc.id, ...data };
        }
      });

      if (!collectorFound) {
        throw new Error('Invalid first name or password.');
      }

      await AsyncStorage.setItem('collectors', JSON.stringify(collectorData));
      setCollector(collectorData);
      return collectorData;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('collectors');
      setCollector(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const isAuthenticated = () => {
    return collector !== null;
  };

  const value = {
    collector,
    loading,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <CollectorAuthContext.Provider value={value}>
      {children}
    </CollectorAuthContext.Provider>
  );
}; 