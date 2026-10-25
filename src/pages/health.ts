import type { APIRoute } from 'astro';

// Liveness must not depend on the deliberately fallible mock API.
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok' }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
