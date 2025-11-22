import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_HOSTS = new Set([
  'feeds.nos.nl',
  'www.nu.nl',
  'nu.nl',
  'nl.wikinews.org',
]);

const MAX_AGE_SECONDS = 300;

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const target = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (typeof target !== 'string' || target.trim().length === 0) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    res.status(400).json({ error: 'Unsupported protocol' });
    return;
  }

  if (!ALLOWED_HOSTS.has(parsed.host.toLowerCase())) {
    res.status(403).json({ error: 'Host is not allowed' });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'user-agent': 'DutchLanguageTutor/1.0 (+https://dutch-language-tutor.vercel.app)',
        accept: 'application/rss+xml, application/xml, text/xml, application/json, text/plain, */*',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream responded with ${upstream.status}` });
      return;
    }

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
    res.status(200).send(body);
  } catch (error) {
    res.status(502).json({ error: 'Failed to fetch upstream feed', details: error instanceof Error ? error.message : String(error) });
  }
}

