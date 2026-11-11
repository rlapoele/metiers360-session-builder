import type { APIRoute } from 'astro';
import { readSaveOperation } from '@features/sessions/save-operation-http.server';

export const GET: APIRoute = ({ params }) => readSaveOperation(params.id);
