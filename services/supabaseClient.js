import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Prefer environment/Expo values with fallbacks to existing hardcoded credentials
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  "https://xrcqdqnmmblnfzssgixm.supabase.co";

const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3FkcW5tbWJsbmZ6c3NnaXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjQ2NzgsImV4cCI6MjA3MzUwMDY3OH0.FCRjqh5d3ox4QvXgYnmC4UYvMO2427WElbO1GR9H2Vs";

// Initialize client
export const supabase = createClient(supabaseUrl, supabaseKey);
