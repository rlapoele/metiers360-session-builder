import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

import { expect, test } from '@playwright/test';
import {
  CatalogueSearchPageSchema,
  CatalogueStatusSchema,
} from '@features/catalogue/search-contracts';
import { SessionDraftSchema } from '@lib/api/schemas';

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

function startProcess(args: string[], variables: NodeJS.ProcessEnv) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...variables,
    NODE_ENV: 'production',
  };
  delete env.VITEST;
  delete env.VITE_USER_NODE_ENV;
  const child = spawn(process.execPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const capture = (chunk: Buffer) => {
    output = (output + String(chunk)).slice(-64_000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  const closed = new Promise<void>((resolve) =>
    child.once('close', () => resolve()),
  );
  return { child, closed, output: () => output };
}
async function stopProcess(
  process: ReturnType<typeof startProcess> | undefined,
) {
  if (
    !process ||
    process.child.exitCode !== null ||
    process.child.signalCode !== null
  )
    return;
  process.child.kill('SIGTERM');
  const timeout = setTimeout(() => process.child.kill('SIGKILL'), 5_000);
  try {
    await process.closed;
  } finally {
    clearTimeout(timeout);
  }
}
async function healthy(url: string, child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return false;
  try {
    return (await fetch(`${url}/health`, { signal: AbortSignal.timeout(500) }))
      .ok;
  } catch {
    return false;
  }
}

// Own both processes: no debug routes, altered API fixture or shared server state.
test('cold startup preserves criteria/draft through bounded exhaustion and manual recovery, then searches without the API', async ({
  page,
}, info) => {
  const [webPort, apiPort] = await Promise.all([freePort(), freePort()]);
  const webUrl = `http://127.0.0.1:${webPort}`;
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const web = startProcess(['dist/server/entry.mjs'], {
    HOST: '127.0.0.1',
    PORT: String(webPort),
    CATALOG_API_URL: apiUrl,
  });
  let api: ReturnType<typeof startProcess> | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const draft = {
    version: 1 as const,
    name: 'Séance à conserver',
    video_ids: ['vid_001'],
    headset_id: null,
  };
  try {
    await expect
      .poll(() => healthy(webUrl, web.child), { timeout: 10_000 })
      .toBe(true);
    await page.addInitScript(
      ({ origin, value }) => {
        if (location.origin === origin)
          localStorage.setItem(
            'metiers360.session-draft.v1',
            JSON.stringify(value),
          );
      },
      { origin: webUrl, value: draft },
    );
    const response = await page.goto(`${webUrl}/?job=A1203&title=omar`);
    expect(response?.status()).toBe(503);
    expect(response?.headers()['retry-after']).toBe('1');
    expect(response?.headers()['cache-control']).toBe('no-store');
    await expect(
      page.locator('astro-island[component-export="CatalogueApp"]'),
    ).not.toHaveAttribute('ssr', '');
    await expect(
      page.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
    ).toBeDisabled();
    await expect(
      page.getByText('0 vidéo trouvée', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Le catalogue est en cours de préparation/).first(),
    ).toBeVisible();
    const failure = page.getByRole('heading', {
      name: 'Le catalogue ne peut pas être préparé.',
      exact: true,
    });
    await expect(failure).toBeVisible({ timeout: 20_000 });
    const state = CatalogueStatusSchema.parse(
      await (await page.request.get(`${webUrl}/api/catalogue/status`)).json(),
    );
    expect(state).toMatchObject({ status: 'failed', canRetry: true });
    expect((await page.request.get(`${webUrl}/health`)).status()).toBe(200);
    const logs = web
      .output()
      .split('\n')
      .flatMap((line) => {
        try {
          const value: unknown = JSON.parse(line);
          return value && typeof value === 'object' && 'event' in value
            ? [value]
            : [];
        } catch {
          return [];
        }
      });
    expect(
      logs.filter((record) => record.event === 'catalogue.preparing'),
    ).toHaveLength(4);
    await page.waitForTimeout(1_100);
    expect(web.output().split('"event":"catalogue.preparing"').length - 1).toBe(
      4,
    );
    expect(new URL(page.url()).searchParams.get('title')).toBe('omar');
    const persisted = SessionDraftSchema.parse(
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('metiers360.session-draft.v1') ?? 'null',
          ) as unknown,
      ),
    );
    expect(persisted).toEqual(draft);
    api = startProcess(['server/server.mjs'], {
      PORT: String(apiPort),
      SEED: '42',
    });
    await expect
      .poll(() => healthy(apiUrl, api!.child), { timeout: 10_000 })
      .toBe(true);
    await failure
      .locator('..')
      .getByRole('button', { name: 'Réessayer', exact: true })
      .click();
    await expect(
      page.getByText('1 vidéo trouvée', { exact: true }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByRole('button', {
        name: 'Retirer le critère Titre de vidéo : Omar',
      }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('job')).toBe('A1203');
    expect(web.output()).toContain('"trigger":"manual-retry"');
    expect(
      web.output().split('"event":"catalogue.preparing"').length - 1,
    ).toBeGreaterThan(4);
    expect(
      SessionDraftSchema.parse(
        await page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('metiers360.session-draft.v1') ?? 'null',
            ) as unknown,
        ),
      ),
    ).toEqual(draft);
    await stopProcess(api);
    api = undefined;
    // A warm query/SSR remains cache-backed; other API operations stay live.
    await page
      .getByRole('button', { name: 'Retirer le critère Titre de vidéo : Omar' })
      .click();
    await expect(
      page.getByText('5 vidéos trouvées', { exact: true }),
    ).toBeVisible();
    const warm = await page.request.get(
      `${webUrl}/api/catalogue/search?include=context&job=A1203&job=I1604`,
    );
    expect(warm.status()).toBe(200);
    expect(CatalogueSearchPageSchema.parse(await warm.json()).meta.total).toBe(
      14,
    );
    const rendered = await page.request.get(`${webUrl}/?title=omar&job=A1203`);
    expect(rendered.status()).toBe(200);
    expect(await rendered.text()).toContain('1 vidéo trouvée');
    expect(
      (await page.request.get(`${webUrl}/api/videos/vid_001`)).status(),
    ).toBe(503);
    expect(errors).toEqual([]);
  } finally {
    await stopProcess(api);
    await stopProcess(web);
    await info.attach('isolated-startup-log', {
      body: web.output(),
      contentType: 'text/plain',
    });
  }
});
