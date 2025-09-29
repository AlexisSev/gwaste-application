Supabase Edge Function — gemini

What this function does
- Receives POST requests with JSON: { prompt: string, context?: string[], imageBase64?: string }
- Calls Google's Generative Language API using a server-side secret (no client key exposure)
- Returns the raw model response JSON so the client can parse text and optional suggestions

Setup & deploy (Supabase CLI)
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Log in and link your project: `supabase login` and `supabase link --project-ref <your-project-ref>`
3. Add the function under `supabase/functions/gemini` (this file)
4. Set the secret in Supabase (in the Project Settings or via CLI):
   - Name: `GENERATIVE_API_KEY`
   - Value: <your Google Generative Language API key>
   Example (CLI):
     supabase secrets set GENERATIVE_API_KEY=sk-xxxx
5. Deploy the function:
   supabase functions deploy gemini --project-ref <your-project-ref>

Security notes
- Keep `GENERATIVE_API_KEY` secret. Do NOT add the key to client-side code or commit it to your repository.
- This function simply proxies to Google and returns model output; consider adding usage limits, authentication checks, and input sanitization in production.

Client integration
- The app's `services/gemini.js` already posts to `${SUPABASE_URL}/functions/v1/gemini` and expects structured JSON (for example: { text: '...', suggestions: ['a','b'] }).
- Enable remote calls by setting `EXPO_ENABLE_REMOTE_GEMINI=true` in your dev env (or EAS secrets) and ensure `EXPO_PUBLIC_SUPABASE_URL` is set.

That's it — deploy the function and test the chatbot; I can help refine the model prompt, parse structured outputs more robustly, and add suggestion parsing on the client if you want.