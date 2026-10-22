import { CatalogueClientError } from './errors';
import { ServerEnvSchema } from './schemas';

export function parseServerEnv(input: unknown) {
  const result = ServerEnvSchema.safeParse(input);
  if (!result.success) {
    throw new CatalogueClientError({
      kind: 'configuration',
      message: 'The catalogue service URL is invalid.',
      status: 500,
      diagnostics: result.error.issues,
    });
  }

  return result.data;
}
