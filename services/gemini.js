// services/gemini.js
// Helper to call your Supabase Edge Function "gemini"
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

export async function callGemini(prompt) {
  try {
    const SUPABASE_URL =
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
      'https://xrcqdqnmmblnfzssgixm.supabase.co';

    // Optionally include Authorization header if the edge function verifies JWT
    let accessToken;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      accessToken = sessionData?.session?.access_token;
    } catch (_) {
      // ignore; no auth available
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      // Send both 'prompt' and 'name' to support older stub handlers that expect 'name'
      body: JSON.stringify({ prompt, name: prompt }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini function error:", err);
      return null;
    }

    const data = await response.json();
    console.log("Gemini response:", data);
    return data;
  } catch (err) {
    console.error("Error calling Gemini:", err);
    return null;
  }
}
