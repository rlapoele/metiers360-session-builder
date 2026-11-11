import { getCatalogueClient } from '@lib/api/catalogue-client-instance.server';
import { createSaveOperationRegistry } from '@features/sessions/save-operations.server';

const registry = createSaveOperationRegistry((input) =>
  getCatalogueClient().createSession(input),
);

export function getSaveOperationRegistry() {
  return registry;
}
