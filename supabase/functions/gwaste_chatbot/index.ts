/* eslint-disable @typescript-eslint/no-unused-vars */
// File: functions/gwaste_chatbot/index.ts (or .js)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to find next collection day
const getNextCollectionDay = (routes) => {
  const dayoffs = routes
    .filter((r) => r.dayoff)
    .flatMap((r) => r.dayoff.split(",").map((d) => d.trim()))
    .map((d) => d.toLowerCase());

  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    const dayName = nextDate.toLocaleDateString("en-US", { weekday: "long" });
    if (!dayoffs.includes(dayName.toLowerCase())) {
      return dayName;
    }
  }
  return null;
};

// Helper function to generate contextual suggestions
const generateSuggestions = (userMessage, routes) => {
  const messageLower = (userMessage || "").toLowerCase();
  const baseSuggestions = [
    "Tell me the schedule",
    "Who's my driver?",
    "What time?",
    "Collection type?",
  ];

  // Customize suggestions based on user message
  if (messageLower.includes("time") || messageLower.includes("when")) {
    return ["What's the end time?", "Next collection?", "Collection frequency?"];
  }
  if (messageLower.includes("driver") || messageLower.includes("crew")) {
    return ["What time is collection?", "What garbage type?", "Full schedule"];
  }
  if (messageLower.includes("type") || messageLower.includes("garbage")) {
    return ["Collection time?", "Driver info", "Next collection?"];
  }

  return baseSuggestions;
};

serve(async (req) => {
  try {
    // 1. Parse request
    const { resident_id, date, message } = await req.json();

    if (!resident_id) {
      return new Response(JSON.stringify({ error: "resident_id is required" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const queryDate = date ? new Date(date) : new Date();
    const dayOfWeek = queryDate.toLocaleDateString("en-US", { weekday: "long" });

    // 2. Get resident info
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("*")
      .eq("id", resident_id)
      .single();

    if (residentError || !resident) throw new Error("Resident not found");

    // 2.5 Check if message is a greeting
    const greetingPatterns = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|sup)$/i;
    const isGreeting = greetingPatterns.test((message || "").trim());

    // 3. Get all routes (no filtering by address initially)
    const { data: routes, error: routesError } = await supabase
      .from("routes")
      .select("*");

    if (routesError) throw routesError;

    // 3.5 Filter routes that serve the resident's address or purok
    const matchingRoutes = routes.filter((r) => {
      if (!r.areas) return false;
      const residentAddr = resident.resident_address?.toLowerCase().trim() || "";
      const residentPurok = resident.purok?.toLowerCase().trim() || "";
      
      return r.areas.some((area) => {
        const areaLower = (area || "").toLowerCase().trim();
        return areaLower === residentAddr || areaLower === residentPurok || residentAddr.includes(areaLower) || areaLower.includes(residentAddr);
      });
    });

    // 4. Filter routes by day off
    const activeRoutes = matchingRoutes.filter(
      (r) => !r.dayoff || !r.dayoff.toLowerCase().includes(dayOfWeek.toLowerCase())
    );

    // 5. Handle greeting messages
    if (isGreeting) {
      if (activeRoutes.length > 0) {
        const routeInfo = activeRoutes.map((r) => ({
          route: r.route,
          driver: r.driver,
          type: r.type,
          time: r.time,
          end_time: r.end_time,
          crew: r.crew,
        }));

        const prompt = `
Resident: ${resident.full_name}, Address: ${resident.resident_address}
Date: ${queryDate.toDateString()} (${dayOfWeek})
Routes available today: ${JSON.stringify(routeInfo)}

The resident just greeted you. Reply with a friendly greeting and then provide a brief summary of their garbage collection schedule for today. Be warm and helpful.
`;

        const groqApiKey = Deno.env.get("GROQ_API_KEY");
        if (!groqApiKey) {
          throw new Error("Missing GROQ_API_KEY environment variable");
        }

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }]
          }),
        });

        if (!groqResponse.ok) {
          const text = await groqResponse.text();
          throw new Error(`Groq API error: ${groqResponse.status} ${text}`);
        }

        const groqResult = await groqResponse.json();
        const replyText =
          groqResult?.choices?.[0]?.message?.content ||
          `Hi ${resident.first_name}! Your garbage collection is scheduled for today. How can I help?`;

        const suggestions = [
          "What time is the collection?",
          "Who's my driver?",
          "What garbage type?",
          "More details",
        ];

        return new Response(JSON.stringify({ reply: replyText, suggestions }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const nextCollectionDay = getNextCollectionDay(matchingRoutes);
        const suggestions = [
          "When is my next collection?",
          "Garbage schedule",
          "Contact support",
        ];
        return new Response(
          JSON.stringify({
            reply: `Hi ${resident.first_name}! 👋 Thanks for reaching out. There's no garbage collection scheduled for your address today. ${nextCollectionDay ? `Your next collection is ${nextCollectionDay}.` : ""}`,
            suggestions,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Prepare structured data for Groq (for non-greeting messages)
    // Even if no active routes, still use AI to handle user queries
    const routeInfo = activeRoutes.map((r) => ({
      route: r.route,
      driver: r.driver,
      type: r.type,
      time: r.time,
      end_time: r.end_time,
      crew: r.crew,
    }));

    // Get next collection day info
    const nextCollectionDay = getNextCollectionDay(matchingRoutes);
    const nextRouteInfo = matchingRoutes.length > 0 ? matchingRoutes[0] : null;

    const prompt = `
Resident: ${resident.full_name}, Address: ${resident.resident_address}
Date: ${queryDate.toDateString()} (${dayOfWeek})
Message from resident: ${message || "What's my garbage collection schedule?"}

Today's Routes: ${activeRoutes.length > 0 ? JSON.stringify(routeInfo) : "No garbage collection scheduled for today"}
Next Collection Day: ${nextCollectionDay || "Unknown"}
All Matching Routes: ${matchingRoutes.length > 0 ? JSON.stringify(matchingRoutes.map(r => ({ route: r.route, driver: r.driver, type: r.type, time: r.time, dayoff: r.dayoff }))) : "None found"}

Please reply in a friendly, clear, and concise message. Always answer the resident's specific question. If asking about today's collection and there is one, provide those details. If asking about when their next collection is, use the "Next Collection Day" and route information to answer.

IMPORTANT: If the resident asks about "schedule", "garbage schedule", or any schedule-related questions, end your response with: "📅 You can also view your complete garbage schedule in the Schedule section (located on the bottom navigation next to Categorize)."
`;

    // 6. Call Groq API
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("Missing GROQ_API_KEY environment variable");
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }]
      }),
    });

    if (!groqResponse.ok) {
      const text = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} ${text}`);
    }

    const groqResult = await groqResponse.json();
    const replyText =
      groqResult?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't get the schedule.";

    // Generate contextual suggestions
    const suggestions = generateSuggestions(message, activeRoutes);

    // 7. Return AI response with suggestions
    return new Response(JSON.stringify({ reply: replyText, suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
