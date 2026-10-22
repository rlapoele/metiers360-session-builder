import type { ApiError, ValidationError } from './schemas';

export type CatalogueClientErrorKind =
  'configuration' | 'invalid-response' | 'timeout' | 'transport' | 'upstream';

interface CatalogueClientErrorOptions {
  kind: CatalogueClientErrorKind;
  message: string;
  status: number;
  upstream?: ApiError | ValidationError;
  diagnostics?: unknown;
  cause?: unknown;
}

export class CatalogueClientError extends Error {
  readonly kind: CatalogueClientErrorKind;
  readonly status: number;
  readonly upstream?: ApiError | ValidationError;
  readonly diagnostics?: unknown;

  constructor({
    kind,
    message,
    status,
    upstream,
    diagnostics,
    cause,
  }: CatalogueClientErrorOptions) {
    super(message, { cause });
    this.name = 'CatalogueClientError';
    this.kind = kind;
    this.status = status;
    this.upstream = upstream;
    this.diagnostics = diagnostics;
  }
}
