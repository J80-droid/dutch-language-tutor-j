import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

const allowedNewsHosts = new Set(['feeds.nos.nl', 'www.nu.nl', 'nl.wikinews.org']);
const normalizePath = (id: string) => id.replace(/\\/g, '/');
const geminiServiceChunkMarker = normalizePath(path.resolve(__dirname, 'src/services/geminiService'));
const gamificationChunkMarker = normalizePath(path.resolve(__dirname, 'src/hooks/useGamificationState'));

const newsProxyPlugin = (): PluginOption => ({
  name: 'local-news-proxy',
  configureServer(server) {
    server.middlewares.use('/api/news-proxy', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Method Not Allowed');
        return;
      }

      const originalUrl = (req as any).originalUrl ?? req.url ?? '';
      const url = originalUrl.startsWith('/api/news-proxy') ? originalUrl : `/api/news-proxy${originalUrl}`;
      const parsed = new URL(url, 'http://localhost');
      const target = parsed.searchParams.get('url');

      if (!target) {
        res.statusCode = 400;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Missing url parameter');
        return;
      }

      let targetUrl: URL;
      try {
        targetUrl = new URL(target);
      } catch {
        res.statusCode = 400;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Invalid url parameter');
        return;
      }

      if (!allowedNewsHosts.has(targetUrl.hostname)) {
        res.statusCode = 403;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Host not allowed');
        return;
      }

      try {
        const upstream = await fetch(targetUrl, {
          headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        });

        const body = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader(
          'Content-Type',
          upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8',
        );
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(body);
      } catch (error) {
        res.statusCode = 502;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(`Upstream fetch failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  },
});

const hfProxyPlugin = (env: Record<string, string>): PluginOption => ({
  name: 'local-hf-proxy',
  configureServer(server) {
    server.middlewares.use('/api/hf-proxy', async (req, res, next) => {
      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Method Not Allowed');
        return;
      }

      // Parse URL from request
      const url = req.url || '';
      let parsed: URL;
      try {
        parsed = new URL(url, `http://${req.headers.host || 'localhost:3000'}`);
      } catch {
        res.statusCode = 400;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end('Invalid URL');
        return;
      }

      const modelId = parsed.searchParams.get('model');

      if (!modelId) {
        res.statusCode = 400;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing model parameter' }));
        return;
      }

      // Read request body
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      await new Promise<void>((resolve, reject) => {
        req.on('end', () => resolve());
        req.on('error', (err) => reject(err));
      });

      // Get API token from environment variable or Authorization header
      const authHeader = req.headers.authorization;
      const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      const apiToken = env.VITE_HF_API_KEY ||
        (authHeaderValue && typeof authHeaderValue === 'string' && authHeaderValue.startsWith('Bearer ')
          ? authHeaderValue.replace('Bearer ', '')
          : null);

      if (!apiToken) {
        res.statusCode = 401;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing API token. Set VITE_HF_API_KEY in .env.local' }));
        return;
      }

      try {
        // Parse body en converteer naar OpenAI-compatibel format
        let bodyObj: { inputs?: string; parameters?: Record<string, unknown> };
        try {
          bodyObj = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        // Converteer naar OpenAI-compatibele format
        // Gebruik verhoogde temperature en top_p voor meer variatie (consistent met huggingfaceService.ts)
        const temperature = (bodyObj.parameters?.temperature as number) ?? (0.8 + Math.random() * 0.2);
        const top_p = (bodyObj.parameters?.top_p as number) ?? 0.95;

        const openAIBody = {
          model: modelId,
          messages: [
            {
              role: 'user',
              content: typeof bodyObj.inputs === 'string' ? bodyObj.inputs : JSON.stringify(bodyObj.inputs || ''),
            },
          ],
          max_tokens: (bodyObj.parameters?.max_new_tokens as number) || 650,
          temperature: temperature,
          top_p: top_p,
        };

        const upstreamResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(openAIBody),
        });

        const responseBody = await upstreamResponse.text();
        const contentType = upstreamResponse.headers.get('content-type') || 'application/json';

        res.statusCode = upstreamResponse.status;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(responseBody);
      } catch (error) {
        res.statusCode = 502;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Upstream fetch failed',
          details: error instanceof Error ? error.message : String(error)
        }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(mode === 'development' ? [newsProxyPlugin(), hfProxyPlugin(env)] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      preserveSymlinks: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = normalizePath(id);
            if (normalizedId.includes('node_modules')) {
              if (normalizedId.includes('/react/')) {
                return 'vendor-react';
              }
              if (normalizedId.includes('/@google/genai/')) {
                return 'vendor-genai';
              }
            }
            if (normalizedId.includes(geminiServiceChunkMarker)) {
              return 'chunk-gemini-service';
            }
            if (normalizedId.includes(gamificationChunkMarker)) {
              return 'chunk-gamification';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: 'src/setupTests.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html']
      }
    }
  };
});
