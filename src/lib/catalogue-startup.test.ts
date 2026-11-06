import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

const execute = promisify(execFile);
const root = process.cwd();
const fixture = z
  .object({
    source: z.string(),
    jobs: z.array(z.unknown()),
    audiences: z.array(z.unknown()),
    headsets: z.array(z.unknown()),
    videos: z.array(
      z.looseObject({ id: z.string(), thumbnail_url: z.string().nullable() }),
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL('../../server/data/catalog.json', import.meta.url),
        'utf8',
      ),
    ) as unknown,
  );

// Test-only IPC inspection/recovery; no production HTTP route is introduced.
const probe = `
process.channel?.unref();
process.on('message', async message => {
  if (!message || typeof message !== 'object') return;
  const owner = globalThis[Symbol.for('metiers360.catalogue.runtime')];
  if (message.action === 'retry') await owner?.runtime.retry();
  const state = owner?.runtime.getState();
  process.send?.({ requestId: message.requestId, status: state?.status ?? 'missing',
    videos: state?.status === 'ready' ? state.snapshot.videos.length : undefined,
    titles: state?.status === 'ready' ? state.dictionary.titles.length : undefined });
});`;

function environment(mode: 'development' | 'production', url: string) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: mode,
    CATALOG_API_URL: url,
    NO_COLOR: '1',
  };
  delete env.VITEST;
  delete env.VITE_USER_NODE_ENV;
  return env;
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

interface AppProcess {
  child: ChildProcess;
  output: string;
  closed: Promise<void>;
  port: number;
}
const apps = new Set<AppProcess>();
async function startApp(mode: 'development' | 'production', url: string) {
  const port = await freePort();
  const args =
    mode === 'development'
      ? [
          'node_modules/astro/bin/astro.mjs',
          'dev',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--ignore-lock',
        ]
      : ['dist/server/entry.mjs'];
  const child = spawn(
    process.execPath,
    [
      `--import=data:text/javascript;base64,${Buffer.from(probe).toString('base64')}`,
      ...args,
    ],
    {
      cwd: root,
      env: { ...environment(mode, url), HOST: '127.0.0.1', PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    },
  );
  const app: AppProcess = {
    child,
    output: '',
    closed: new Promise((resolve) => child.once('close', () => resolve())),
    port,
  };
  child.stdout?.on('data', (chunk) => {
    app.output += String(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    app.output += String(chunk);
  });
  apps.add(app);
  return app;
}

const logSchema = z.looseObject({
  event: z.string(),
  runId: z.string(),
  entryPoint: z.string(),
});
function logs(app: AppProcess) {
  return app.output.split('\n').flatMap((line) => {
    if (!line.startsWith('{')) return [];
    try {
      const result = logSchema.safeParse(JSON.parse(line));
      return result.success ? [result.data] : [];
    } catch {
      return [];
    }
  });
}
async function waitForLog(app: AppProcess, event: string) {
  await vi.waitFor(
    () => {
      if (app.child.exitCode !== null || app.child.signalCode !== null)
        throw new Error(app.output);
      expect(
        logs(app).some((record) => record.event === event),
        app.output,
      ).toBe(true);
    },
    { timeout: 20_000, interval: 50 },
  );
}

let nextRequest = 0;
async function inspect(
  app: AppProcess,
  action = 'inspect',
): Promise<{ status: string; videos?: number; titles?: number }> {
  const requestId = ++nextRequest;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      app.child.off('message', receive);
      reject(new Error(app.output));
    }, 20_000);
    function receive(value: unknown) {
      const parsed = z
        .object({
          requestId: z.number(),
          status: z.string(),
          videos: z.number().optional(),
          titles: z.number().optional(),
        })
        .safeParse(value);
      if (!parsed.success || parsed.data.requestId !== requestId) return;
      clearTimeout(timer);
      app.child.off('message', receive);
      resolve(parsed.data);
    }
    app.child.on('message', receive);
    app.child.send({ requestId, action });
  });
}

async function stopApp(app: AppProcess) {
  if (app.child.exitCode === null && app.child.signalCode === null)
    app.child.kill('SIGTERM');
  const timer = setTimeout(() => app.child.kill('SIGKILL'), 5_000);
  await app.closed;
  clearTimeout(timer);
  apps.delete(app);
}

function backend() {
  const control: {
    failures: number;
    gate?: Promise<void>;
    responses: ServerResponse[];
    paths: string[];
  } = { failures: 0, responses: [], paths: [] };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    control.paths.push(url.pathname);
    control.responses.push(res);
    if (control.gate) await control.gate;
    if (res.destroyed) return;
    res.setHeader('Content-Type', 'application/json');
    if (control.failures > 0) {
      control.failures -= 1;
      res.statusCode = 503;
      res.end('{}');
      return;
    }
    if (url.pathname === '/videos') {
      const page = Number(url.searchParams.get('page') ?? 1);
      const size = Number(url.searchParams.get('per_page') ?? 24);
      res.end(
        JSON.stringify({
          data: fixture.videos
            .slice((page - 1) * size, page * size)
            .map((video) => ({
              ...video,
              thumbnail_url: video.thumbnail_url
                ? `${url.origin}/thumbnails/${video.id}.svg`
                : null,
            })),
          meta: {
            page,
            per_page: size,
            total: fixture.videos.length,
            total_pages: Math.ceil(fixture.videos.length / size),
          },
        }),
      );
    } else if (url.pathname === '/jobs')
      res.end(JSON.stringify({ data: fixture.jobs, source: fixture.source }));
    else if (url.pathname === '/headsets')
      res.end(JSON.stringify({ data: fixture.headsets }));
    else if (url.pathname === '/audiences')
      res.end(JSON.stringify({ data: fixture.audiences }));
    else {
      res.statusCode = 404;
      res.end('{}');
    }
  });
  return { server, control };
}

const api = backend();
let apiUrl: string;
beforeAll(async () => {
  // The API is deliberately unavailable throughout the production build.
  const built = await execute(
    process.execPath,
    ['node_modules/astro/bin/astro.mjs', 'build'],
    {
      cwd: root,
      env: environment('production', 'http://127.0.0.1:1'),
      timeout: 30_000,
    },
  );
  expect(built.stdout + built.stderr).not.toContain('catalogue.preparing');
  await new Promise<void>((resolve, reject) => {
    api.server.once('error', reject);
    api.server.listen(0, '127.0.0.1', () => {
      api.server.off('error', reject);
      resolve();
    });
  });
  const address = api.server.address();
  if (!address || typeof address === 'string')
    throw new Error('No backend port');
  apiUrl = `http://127.0.0.1:${address.port}`;
}, 40_000);

afterAll(async () => {
  for (const app of apps) await stopApp(app);
  api.server.closeAllConnections();
  await new Promise<void>((resolve) => api.server.close(() => resolve()));
});

describe.each(['development', 'production'] as const)(
  '%s startup lifecycle',
  (mode) => {
    it('starts before visitors, stays live during preparation and retains the ready dictionary', async () => {
      api.control.paths = [];
      api.control.failures = 0;
      let release!: () => void;
      api.control.gate = new Promise((resolve) => {
        release = resolve;
      });
      const app = await startApp(mode, apiUrl);
      try {
        await waitForLog(app, 'catalogue.preparing');
        await vi.waitFor(() => expect(api.control.paths).toContain('/videos'));
        expect(await inspect(app)).toMatchObject({ status: 'preparing' });
        // The development hook runs before Vite opens its listening socket.
        await vi.waitFor(
          async () => {
            const response = await fetch(`http://127.0.0.1:${app.port}/health`);
            expect(response.ok).toBe(true);
          },
          { timeout: 10_000, interval: 50 },
        );
        const responses = await Promise.all(
          Array.from({ length: 3 }, () =>
            fetch(`http://127.0.0.1:${app.port}/health`),
          ),
        );
        expect(responses.every((response) => response.ok)).toBe(true);
        expect(
          logs(app).filter((record) => record.event === 'catalogue.preparing'),
        ).toHaveLength(1);
        release();
        api.control.gate = undefined;
        await waitForLog(app, 'catalogue.ready');
        expect(await inspect(app)).toMatchObject({
          status: 'ready',
          videos: 204,
          titles: 631,
        });
        expect(api.control.paths).toEqual([
          '/videos',
          '/videos',
          '/videos',
          '/jobs',
          '/audiences',
          '/headsets',
        ]);
        const count = api.control.paths.length;
        expect(await inspect(app, 'retry')).toMatchObject({ status: 'ready' });
        expect(api.control.paths).toHaveLength(count);
        expect(
          logs(app).find(
            (record) => record.event === 'catalogue.dictionary_built',
          ),
        ).toMatchObject({
          entryPoint: mode,
          ruleVersion: 1,
          titleKeywords: 631,
          jobVocabulary: 1603,
          diagnostics: 0,
        });
      } finally {
        release();
        api.control.gate = undefined;
        await stopApp(app);
      }
      expect(
        logs(app).some((record) => record.event === 'catalogue.stopped'),
      ).toBe(true);
    }, 40_000);

    it('exhausts bounded startup retries, then recovers manually without restarting the process', async () => {
      api.control.gate = undefined;
      api.control.paths = [];
      api.control.failures = 4;
      const app = await startApp(mode, apiUrl);
      try {
        await waitForLog(app, 'catalogue.failed');
        expect(await inspect(app)).toMatchObject({ status: 'failed' });
        expect(api.control.paths).toHaveLength(4);
        expect(
          logs(app)
            .filter((record) => record.event === 'catalogue.retry')
            .map((record) => record.delayMs),
        ).toEqual([1000, 2000, 4000]);
        const firstRun = logs(app)[0]?.runId;
        expect(await inspect(app, 'retry')).toMatchObject({
          status: 'ready',
          videos: 204,
        });
        expect(
          logs(app).find((record) => record.event === 'catalogue.ready')?.runId,
        ).not.toBe(firstRun);
      } finally {
        await stopApp(app);
      }
    }, 40_000);

    it('cancels pending work on SIGTERM rather than leaving retries or the server alive', async () => {
      api.control.paths = [];
      api.control.failures = 0;
      let release!: () => void;
      api.control.gate = new Promise((resolve) => {
        release = resolve;
      });
      const app = await startApp(mode, apiUrl);
      try {
        await waitForLog(app, 'catalogue.preparing');
        await vi.waitFor(() => expect(api.control.paths).toHaveLength(1));
        const pending = api.control.responses.at(-1)!;
        await stopApp(app);
        expect(app.child.signalCode).not.toBe('SIGKILL');
        expect(
          logs(app).some((record) => record.event === 'catalogue.stopped'),
        ).toBe(true);
        await vi.waitFor(() => expect(pending.destroyed).toBe(true));
        expect(api.control.paths).toHaveLength(1);
      } finally {
        release();
        api.control.gate = undefined;
        await stopApp(app);
      }
    }, 30_000);

    it('fails once on invalid configuration without leaking its value', async () => {
      const app = await startApp(mode, 'private-invalid-secret');
      try {
        await waitForLog(app, 'catalogue.failed');
        expect(
          logs(app).filter((record) => record.event === 'catalogue.preparing'),
        ).toHaveLength(1);
        expect(
          logs(app).find((record) => record.event === 'catalogue.failed'),
        ).toMatchObject({ kind: 'configuration', stage: 'catalogue' });
        expect(app.output).not.toContain('private-invalid-secret');
      } finally {
        await stopApp(app);
      }
    }, 30_000);
  },
);
