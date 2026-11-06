import type { ApiError, ValidationError } from '@lib/api/schemas';

export type CatalogueClientErrorKind =
  'configuration' | 'invalid-response' | 'timeout' | 'transport' | 'upstream';

interface CatalogueClientErrorOptions {
  kind: CatalogueClientErrorKind;
  message: string;
  status: number;
  upstream?: ApiError | ValidationError;
  diagnostics?: unknown;
  cause?: unknown;
  retryAfterMs?: number;
}

export class CatalogueClientError extends Error {
  readonly kind: CatalogueClientErrorKind;
  readonly status: number;
  readonly upstream?: ApiError | ValidationError;
  readonly diagnostics?: unknown;
  readonly retryAfterMs?: number;

  constructor({
    kind,
    message,
    status,
    upstream,
    diagnostics,
    cause,
    retryAfterMs,
  }: CatalogueClientErrorOptions) {
    super(message, { cause });
    this.name = 'CatalogueClientError';
    this.kind = kind;
    this.status = status;
    this.upstream = upstream;
    this.diagnostics = diagnostics;
    this.retryAfterMs = retryAfterMs;
  }
}
