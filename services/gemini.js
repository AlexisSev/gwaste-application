// services/gemini.js
// Stubbed out to remove Gemini serverless calls. Any remaining imports will receive a safe no-op.
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabaseClient';

// Attempts to get a response from server-side (Supabase Edge Function) first.
// If that fails (or returns 401), and if EXPO_PUBLIC_GEMINI_API_KEY is present, it
// will call the Google Generative Language API directly. Returns string response or null.
export async function callGemini(prompt, imageAsset = null, conversationContext = []) {
  try {
    const SUPABASE_URL =
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL;

    const ENABLE_REMOTE = (process.env.EXPO_ENABLE_REMOTE_GEMINI === 'true')
      || (Constants.expoConfig?.extra?.EXPO_ENABLE_REMOTE_GEMINI === true)
      || (Constants.manifest?.extra?.EXPO_ENABLE_REMOTE_GEMINI === true);

    if (!ENABLE_REMOTE) {
      console.warn('[Gemini] Remote Gemini disabled by EXPO_ENABLE_REMOTE_GEMINI flag.');
      return null;
    }

    // Try Supabase Edge Function first (recommended: keep secrets server-side there)
    if (SUPABASE_URL) {
      try {
        const functionUrl = `${SUPABASE_URL}/functions/v1/gemini`;
        let accessToken;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          accessToken = sessionData?.session?.access_token;
        } catch (e) {
          // ignore
        }

        const headers = {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

  // Provide conversation context to the server-side function if available
  const body = { prompt, name: prompt, context: conversationContext };
        const resp = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          const data = await resp.json();
          // Preserve structured response from the edge function (e.g. { text, suggestions })
          if (typeof data === 'string') return { text: data };
          return data;
        }

        const errText = await resp.text();
        console.warn('[Gemini] Supabase function response:', resp.status, errText);
        // If auth failed (401) or function not present, we'll try fallback below
      } catch (err) {
        console.warn('[Gemini] Error calling Supabase edge function:', err);
        // continue to fallback
      }
    }

    // Fallback: direct call to Google's Generative Language API using API key (NOT RECOMMENDED FOR PUBLIC CLIENTS)
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
      || Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY
      || Constants.manifest?.extra?.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[Gemini] No API key configured for direct Generative Language API call. Skipping remote call.');
      return null;
    }

    // Build request body
    const systemPrompt = [
      'You are a friendly, brief, and helpful Waste Management Assistant for a city waste app.',
      'Goals:',
      '- Answer questions about collection schedules, sorting guidelines, reporting issues, and centers.',
      '- When helpful, return a short summary followed by 2-4 practical next steps or suggestions.',
      '- Include quick reply suggestions as a JSON array when possible (e.g., ["Report issue","Pickup times"]).',
      '- If the user wants to submit a report, acknowledge and summarize but do not invent IDs; the app will handle submission.',
      '- If the user provides an image, identify likely waste type, confidence level, and disposal recommendation.',
      'Formatting:',
      '- Return plain text primarily. If including suggestions, return them in a separate field or JSON array at the end.',
    ].join('\n');

    const parts = [];
    if (prompt && prompt.length > 0) parts.push({ text: prompt });
    if (imageAsset && imageAsset.uri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(imageAsset.uri, { encoding: 'base64' });
        const mimeType = imageAsset.type || 'image/jpeg';
        parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
      } catch (e) {
        console.warn('[Gemini] Failed to read image for inline upload, sending text only.', e);
      }
    }

    const body = {
      system_instruction: { role: 'system', parts: [{ text: systemPrompt }] },
      // Include recent conversation context to provide continuity
      context: conversationContext || [],
      contents: [{ role: 'user', parts }],
    };

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        const text = await resp.text();
        console.warn('[Gemini] Direct API HTTP error', resp.status, text);
        return null;
      }

      const data = await resp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.output?.[0]?.content?.text || null;
      if (!rawText) return null;

      // Attempt to extract a trailing JSON suggestions block if present.
      let text = rawText;
      let suggestions = [];
      try {
        // Look for a JSON array at the end of the text (e.g., ...\n["a","b"])
        const jsonMatch = rawText.match(/\[\s*\".*\"\s*(,\s*\".*\"\s*)*\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            suggestions = parsed;
            // remove the JSON block from displayed text
            text = rawText.replace(jsonMatch[0], '').trim();
          }
        }
      } catch (err) {
        // ignore parse errors and return plain text
      }

      return { text, suggestions };
    } catch (err) {
      console.warn('[Gemini] Error calling Generative Language API:', err);
      return null;
    }
  } catch (err) {
    console.warn('[Gemini] Unexpected error in callGemini:', err);
    return null;
  }
}
