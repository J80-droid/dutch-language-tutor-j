// Types voor Vercel serverless functions
type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  end: () => void;
  json: (body: unknown) => void;
};

const HF_API_BASE = 'https://router.huggingface.co/v1/chat/completions';

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const modelId = Array.isArray(req.query.model) ? req.query.model[0] : req.query.model;
  if (typeof modelId !== 'string' || modelId.trim().length === 0) {
    res.status(400).json({ error: 'Missing model parameter' });
    return;
  }

  // Get API token from environment variable or Authorization header
  const authHeader = req.headers.authorization;
  const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const apiToken = process.env.VITE_HF_API_KEY || 
    (authHeaderValue && typeof authHeaderValue === 'string' && authHeaderValue.startsWith('Bearer ') 
      ? authHeaderValue.replace('Bearer ', '') 
      : null);

  if (!apiToken) {
    res.status(401).json({ error: 'Missing API token. Set VITE_HF_API_KEY in .env.local' });
    return;
  }

  try {
    // Converteer oude format naar OpenAI-compatibel format
    const oldBody = req.body as { inputs?: string; parameters?: Record<string, unknown> };
    
    // Nieuwe OpenAI-compatibele format
    // Gebruik verhoogde temperature en top_p voor meer variatie (consistent met huggingfaceService.ts)
    const temperature = (oldBody.parameters?.temperature as number) ?? (0.8 + Math.random() * 0.2);
    const top_p = (oldBody.parameters?.top_p as number) ?? 0.95;
    
    const requestBody = {
      model: modelId,
      messages: [
        {
          role: 'user' as const,
          content: typeof oldBody.inputs === 'string' ? oldBody.inputs : JSON.stringify(oldBody.inputs || ''),
        },
      ],
      max_tokens: (oldBody.parameters?.max_new_tokens as number) || 650,
      temperature: temperature,
      top_p: top_p,
    };

    const upstreamResponse = await fetch(HF_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
    const body = await upstreamResponse.text();

    // Log error details voor debugging
    if (!upstreamResponse.ok) {
      console.error(`HF API Error [${upstreamResponse.status}]:`, {
        url: HF_API_BASE,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: body.substring(0, 500),
      });
    }

    res.setHeader('Content-Type', contentType);
    res.status(upstreamResponse.status).send(body);
  } catch (error) {
    res.status(502).json({ 
      error: 'Failed to fetch from Hugging Face API', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}

