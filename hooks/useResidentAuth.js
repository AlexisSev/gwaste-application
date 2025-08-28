import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';

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

    // Query exact match on firstName, then verify password
    const residentsRef = collection(db, 'residents');
    const byFirstName = query(residentsRef, where('firstName', '==', first));
    const snap = await getDocs(byFirstName);

    let match = null;
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.password === pwd) {
        match = { id: doc.id, ...data };
      }
    });

    // Fallback to case-insensitive scan if needed
    if (!match) {
      const all = await getDocs(residentsRef);
      all.forEach((doc) => {
        const data = doc.data();
        const firstLower = data?.firstName ? String(data.firstName).trim().toLowerCase() : '';
        if (firstLower === first.toLowerCase() && data?.password === pwd) {
          match = { id: doc.id, ...data };
        }
      });
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


