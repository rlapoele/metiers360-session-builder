import type { APIRoute } from 'astro';
import {
  startSaveOperation,
  readSaveRuntime,
} from '@features/sessions/save-operation-http.server';

export const POST: APIRoute = ({ request }) => startSaveOperation(request);

export const GET: APIRoute = () => readSaveRuntime();
