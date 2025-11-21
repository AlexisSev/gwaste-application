// services/chatbotService.js
import { supabase } from './supabaseClient';

export const getChatbotReply = async (residentId, message, date) => {
  const { data, error } = await supabase.functions.invoke('gwaste_chatbot', {
    method: 'POST',
    body: { resident_id: residentId, message, date },
  });

  if (error) {
    console.error('gwaste_chatbot invoke error:', error);
    throw error;
  }

  if (!data) {
    return { reply: 'No data returned from chatbot function.', suggestions: [] };
  }

  // If the function returned an object with reply and suggestions, return it as-is
  if (data.reply && data.suggestions) {
    return data;
  }

  // If the function returned a plain string, wrap it
  if (typeof data === 'string') {
    return { reply: data, suggestions: [] };
  }

  // If only reply exists, still return with empty suggestions
  if (data.reply) {
    return { reply: data.reply, suggestions: data.suggestions || [] };
  }

  // Handle older versions of the function that returned { message: ... }
  if (data.message) {
    return { reply: data.message, suggestions: [] };
  }

  if (data.error) {
    return { reply: `Chatbot error: ${data.error}`, suggestions: [] };
  }

  return { reply: 'No response from chatbot.', suggestions: [] };
};
