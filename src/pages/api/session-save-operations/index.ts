import type { APIRoute } from 'astro';
import { startSaveOperation } from '@features/sessions/save-operation-http.server';

export const POST: APIRoute = ({ request }) => startSaveOperation(request);
