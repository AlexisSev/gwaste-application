// Supabase Edge Function (Deno) - gemini
// Deploy this function in your Supabase project named `gemini`.
// It expects an environment secret named GENERATIVE_API_KEY in Supabase (set in the Function's secrets).

import { serve } from 'std/server';

// Helper to call Google Generative Language API
async function callGenerativeAPI(apiKey: string, body: any) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const apiKey = Deno.env.get('GENERATIVE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Server missing GENERATIVE_API_KEY' }), { status: 500 });

    const payload = await req.json();
    const { prompt, context = [], imageBase64 } = payload;

    const systemPrompt = `You are a friendly Waste Management Assistant for a city waste app. Answer concisely and provide short practical steps. When helpful, include quick reply suggestions as a JSON array on a separate line at the end.`;

    const parts = [];
    if (prompt && prompt.length > 0) parts.push({ text: prompt });
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });
    }

    const body = {
      system_instruction: { role: 'system', parts: [{ text: systemPrompt }] },
      context,
      contents: [{ role: 'user', parts }],
    };

    const response = await callGenerativeAPI(apiKey, body);

    // We return the raw API response so the client can parse text + suggestions.
    return new Response(JSON.stringify(response), { status: 200 });
  } catch (err: any) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
});
