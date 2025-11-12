// Provide a type-only declaration so TS in a Node/Expo toolchain recognizes the Deno global.
 // This is erased at compile time and does not affect Supabase Edge runtime.
 declare const Deno: any;

Deno.serve(async (_req: any) => {
    return new Response(
      JSON.stringify({ message: "G-Waste Chatbot function is running successfully!" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });