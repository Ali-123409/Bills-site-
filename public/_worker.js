export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/bill')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method !== 'GET') {
      return errorResponse(405, 'Method not allowed');
    }

    const targetURL = url.searchParams.get('url');

    if (!targetURL) {
      return errorResponse(400, 'Missing url parameter');
    }

    const allowedDomains = [
      'bill.pitc.com.pk',
      'ccms.pitc.com.pk',
    ];

    let parsedTarget;
    try {
      parsedTarget = new URL(targetURL);
    } catch (e) {
      return errorResponse(400, 'Invalid URL provided');
    }

    const isAllowed = allowedDomains.some(domain =>
      parsedTarget.hostname === domain || parsedTarget.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return errorResponse(403, 'Domain not permitted');
    }

    try {
      const userIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const pitcResponse = await fetch(targetURL, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://bill.pitc.com.pk/',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'X-Forwarded-For': userIP,
        },
      });

      clearTimeout(timer);

      if (!pitcResponse.ok) {
        return errorResponse(pitcResponse.status, `PITC returned ${pitcResponse.status}`);
      }

      const html = await pitcResponse.text();

      if (html.length < 200) {
        return errorResponse(404, 'Bill not found — check your reference number');
      }

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=7200, s-maxage=7200',
          'Vary': 'Accept-Encoding',
        },
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        return errorResponse(504, 'PITC server timeout — please try again');
      }
      return errorResponse(500, 'Failed to fetch bill');
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  });
}
