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

// Smart responses for common questions (no Groq API needed!)
const getSmartResponse = (message: string | undefined) => {
  const msgLower = (message || "").toLowerCase().trim();
  
  // Collection schedules
  if (msgLower.includes("schedule") || msgLower === "what are collection schedules?") {
    return {
      reply: "Collection schedules vary by area and waste type. You can view your personalized collection schedule by:\n\n1. Going to the Schedule tab\n2. Checking the 'Next Collection' card on the home screen\n3. Enabling location services to see real-time truck tracking\n\nWould you like to know more about your specific area's schedule?",
      suggestions: ["View my schedule", "Track garbage truck", "Change notification settings"]
    };
  }
  
  // Report issue
  if (msgLower.includes("report") || msgLower === "how do i report an issue?") {
    return {
      reply: "To report an issue:\n\n1. Tap the 'Report Issue' button\n2. Select the issue type (missed collection, damaged bin, etc.)\n3. Add a description and photos if needed\n4. Submit your report\n\nOur team will review and respond within 24 hours. You can also track your reported issues in your profile.",
      suggestions: ["Report an Issue", "View my reports", "Contact support"]
    };
  }
  
  // Waste types
  if (msgLower.includes("waste type") || msgLower.includes("what waste") || msgLower === "what waste types are collected?") {
    return {
      reply: "We collect several types of waste:\n\n🗑️ Biodegradable - Food scraps, yard waste\n♻️ Recyclable - Paper, plastic, glass, metal\n⚠️ Non-biodegradable - General waste\n🔋 E-Waste - Electronics, batteries\n☢️ Hazardous - Chemicals, paint, oil\n\nEach type has specific collection days. Check your schedule for details!",
      suggestions: ["View collection schedule", "How to segregate waste", "E-waste disposal"]
    };
  }
  
  // Waste segregation
  if (msgLower.includes("segregat") || msgLower.includes("separate") || msgLower === "how to segregate waste properly?") {
    return {
      reply: "Proper waste segregation helps the environment! 🌍\n\n✅ Biodegradable: Food waste, garden clippings\n✅ Recyclable: Clean plastic, paper, cardboard, metal\n✅ Residual: Mixed waste, soiled materials\n✅ Special: Electronics, batteries, hazardous items\n\nTip: Rinse recyclables before disposal!",
      suggestions: ["View waste categories", "Eco tips", "What goes where?"]
    };
  }
  
  // Track truck
  if (msgLower.includes("track") || msgLower.includes("where is") || msgLower === "track garbage truck") {
    return {
      reply: "Track the garbage truck in real-time! 🚛\n\n1. Go to the Map tab\n2. Enable location permissions\n3. See nearby trucks and estimated arrival time\n4. Get notified when truck is near your area\n\nYou can view distance and route on the live map!",
      suggestions: ["Open map", "Enable notifications", "View route details"]
    };
  }
  
  // Eco tips
  if (msgLower.includes("eco") || msgLower.includes("environment") || msgLower === "eco tips") {
    return {
      reply: "Help the environment with these eco tips! 🌱\n\n♻️ Reduce single-use plastics\n🎒 Use reusable bags\n💧 Compost organic waste\n📦 Recycle properly\n🔋 Dispose e-waste safely\n🌳 Reduce, reuse, recycle!\n\nSmall actions make a big difference!",
      suggestions: ["More eco tips", "Composting guide", "Recycling benefits"]
    };
  }
  
  // Contact/support
  if (msgLower.includes("contact") || msgLower.includes("support") || msgLower.includes("help")) {
    return {
      reply: "Need help? We're here! 💚\n\nContact us through:\n📧 Email: support@gwaste.com\n📱 Hotline: (123) 456-7890\n💬 In-app chat (here!)\n🏢 Office: Visit our local branch\n\nResponse time: Usually within 24 hours.",
      suggestions: ["Report an Issue", "FAQs", "Office locations"]
    };
  }
  
  return null; // No smart response found, use Groq API
};

// Helper function to generate contextual suggestions
const generateSuggestions = (userMessage: string, routes: any[]) => {
  const messageLower = (userMessage || "").toLowerCase();
  const baseSuggestions = [
    "What are collection schedules?",
    "How do I report an issue?",
    "What waste types are collected?",
    "Track garbage truck"
  ];

  // Customize suggestions based on user message
  if (messageLower.includes("time") || messageLower.includes("when")) {
    return ["View my schedule", "Next collection?", "Track garbage truck"];
  }
  if (messageLower.includes("driver") || messageLower.includes("crew")) {
    return ["What time is collection?", "What garbage type?", "Full schedule"];
  }
  if (messageLower.includes("type") || messageLower.includes("garbage")) {
    return ["How to segregate waste properly?", "What waste types are collected?", "Eco tips"];
  }
  if (routes.length === 0) {
    return [
      "What are collection schedules?",
      "Track garbage truck",
      "How do I report an issue?",
      "Contact support"
    ];
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

    // 2.5 Check for smart responses first (instant answers!)
    const smartResponse = getSmartResponse(message);
    if (smartResponse) {
      return new Response(JSON.stringify(smartResponse), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // 2.6 Check if message is a greeting
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
      (r: any) => !r.dayoff || !r.dayoff.toLowerCase().includes(dayOfWeek.toLowerCase())
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
          "What are collection schedules?",
          "How to segregate waste properly?",
          "Track garbage truck",
          "Contact support"
        ];
        return new Response(
          JSON.stringify({
            reply: `Hi ${resident.first_name}! 👋 Thanks for reaching out. There's no garbage collection scheduled for your address today. ${nextCollectionDay ? `Your next collection is ${nextCollectionDay}.` : ""}\n\nHow can I help you today?`,
            suggestions,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 6. Check if message is asking about general info (no routes needed)
    const generalInfoPatterns = [
      /how (do|can) i/i,
      /what (is|are)/i,
      /tell me about/i,
      /explain/i,
      /info/i
    ];
    
    const isGeneralInfo = generalInfoPatterns.some(pattern => pattern.test(message || ""));
    
    // If asking general questions and no routes, provide helpful response
    if (isGeneralInfo && activeRoutes.length === 0) {
      const suggestions = generateSuggestions(message, activeRoutes);
      return new Response(JSON.stringify({
        reply: `I'd be happy to help you with that! While there's no collection scheduled for your area today, I can provide information about our waste management services.\n\nWhat specific information are you looking for?`,
        suggestions
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // 7. Prepare structured data for Groq (for specific schedule queries)
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
