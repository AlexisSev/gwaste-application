import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

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
      const d = String(driver || '').trim();
      const p = String(password || '').trim();
      if (!d || !p) throw new Error('Please enter both first name and password.');

      const { data, error } = await supabase
        .from('collectors')
        .select('*')
        .or(`driver.ilike.${d},firstName.ilike.${d}`)
        .limit(50);
      if (error) throw error;

      let match = null;
      if (Array.isArray(data)) {
        const dl = d.toLowerCase();
        match = data.find(c => (
          String(c.driver || '').trim().toLowerCase() === dl ||
          String(c.firstName || '').trim().toLowerCase() === dl
        ) && String(c.password || '').trim() === p) || null;
      }

      if (!match) throw new Error('Invalid first name or password.');

      // Ensure collector_id is present for FK usage in other parts of the app
      const enriched = {
        ...match,
        collector_id: match.collector_id || match.id || null,
      };
      await AsyncStorage.setItem('collectors', JSON.stringify(enriched));
      setCollector(enriched);
      return enriched;
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

  const isAuthenticated = () => collector !== null;

  const value = { collector, loading, login, logout, isAuthenticated };

  return (
    <CollectorAuthContext.Provider value={value}>
      {children}
    </CollectorAuthContext.Provider>
  );
};
