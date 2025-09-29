declare module 'std/server' {
  // Minimal typing for Deno std/server `serve` helper used in Supabase Edge Functions.
  // The real runtime is Deno; this file only provides editor/ts-server types to avoid errors.
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string }
  ): void;
}

export { };

