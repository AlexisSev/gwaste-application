import AsyncStorage from '@react-native-async-storage/async-storage';
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
      match = data.find(r => String(r.first_name || '').trim().toLowerCase() === fl && String(r.password || '').trim() === pwd) || null;
    }

    if (!match) {
      throw new Error('Invalid first name or password.');
    }

    await AsyncStorage.setItem('residents', JSON.stringify(match));
    setResident(match);
    return match;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('residents');
      setResident(null);
    } catch (error) {
      console.error('Error during resident logout:', error);
    }
  };

  const isAuthenticated = () => resident !== null;

  const value = { resident, loading, login, logout, isAuthenticated };

  return (
    <ResidentAuthContext.Provider value={value}>
      {children}
    </ResidentAuthContext.Provider>
  );
};


