import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const ResidentAuthContext = createContext();

export const useResidentAuth = () => {
  const context = useContext(ResidentAuthContext);
  if (!context) {
    throw new Error('useResidentAuth must be used within a ResidentAuthProvider');
  }
  return context;
};

export const ResidentAuthProvider = ({ children }) => {
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredResident();
  }, []);

  const loadStoredResident = async () => {
    try {
      const stored = await AsyncStorage.getItem('residents');
      if (stored) {
        setResident(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading stored resident:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (firstName, password) => {
    const first = String(firstName || '').trim();
    const pwd = String(password || '').trim();
    if (!first || !pwd) {
      throw new Error('Please enter both first name and password.');
    }

    // Hash the input password for comparison
    const hashedPassword = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pwd
    );

    // Case-insensitive fetch, then verify password client-side
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .ilike('first_name', first)
      .limit(50);
    if (error) throw error;

    let match = null;
    if (Array.isArray(data)) {
      const fl = first.toLowerCase();
      match = data.find(r => {
        const dbName = String(r.first_name || '').trim().toLowerCase();
        const dbPwd = String(r.password || '').trim();

        // Check if names match
        if (dbName !== fl) return false;

        // Check password - try both plain text and hashed for backward compatibility
        return dbPwd === pwd || dbPwd === hashedPassword;
      });
    }

    if (!match) {
      throw new Error('Invalid first name or password.');
    }

    await AsyncStorage.setItem('residents', JSON.stringify(match));
    setResident(match);
    
    // Show welcome notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👋 Welcome Back!',
        body: `Welcome back, ${match.first_name}! You've successfully logged in.`,
        data: { data: 'login_success' },
      },
      trigger: { seconds: 1 }, // Show after 1 second
    });
    
    return match;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('residents');
      // Also clear remembered credentials on logout
      await AsyncStorage.removeItem('rememberedCredentials');
      setResident(null);
    } catch (error) {
      console.error('Error during resident logout:', error);
    }
  };

  const refreshResident = async () => {
    try {
      if (!resident?.id) return;
      
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', resident.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem('residents', JSON.stringify(data));
        setResident(data);
      }
    } catch (error) {
      console.error('Error refreshing resident:', error);
    }
  };

  const isAuthenticated = () => resident !== null;

  const value = { resident, loading, login, logout, refreshResident, isAuthenticated };

  return (
    <ResidentAuthContext.Provider value={value}>
      {children}
    </ResidentAuthContext.Provider>
  );
};


