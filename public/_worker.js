/**
 * pakistanbill.online — Cloudflare Worker
 * CORS Proxy for PITC Bill Fetching
 *
 * Deploy to: Cloudflare Workers
 * Route: pakistanbill.online/api/bill*
 *
 * How it works:
 * 1. Frontend sends: /api/bill?url=https://bill.pitc.com.pk/lescobill/general?refno=XXXXX
 * 2. Worker fetches from PITC using user's IP (X-Forwarded-For)
 * 3. Worker returns HTML with CORS headers
 * 4. Frontend renders bill in iframe
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ─── CORS Preflight ───────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ─── Only allow GET requests ──────────────────────────────
    if (request.method !== 'GET') {
      return errorResponse(405, 'Method not allowed');
    }

    // ─── Extract target URL ───────────────────────────────────
    const targetURL = url.searchParams.get('url');

    if (!targetURL) {
      return errorResponse(400, 'Missing url parameter');
    }

    // ─── Security: Only allow PITC domains ───────────────────
    const allowedDomains = [
      'bill.pitc.com.pk',
      'ccms.pitc.com.pk',
    ];

    let parsedTarget;
    try {
      parsedTarget = new URL(targetURL);
    } catch {
      return errorResponse(400, 'Invalid URL provided');
    }

    const isAllowed = allowedDomains.some(domain =>
      parsedTarget.hostname === domain || parsedTarget.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return errorResponse(403, 'Domain not permitted');
    }

    // ─── Fetch from PITC ─────────────────────────────────────
    try {
      // Get user's real IP for X-Forwarded-For
      const userIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

      const pitcResponse = await fetch(targetURL, {
        method: 'GET',
        headers: {
          // Mimic a real browser request
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://bill.pitc.com.pk/',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'X-Forwarded-For': userIP,
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!pitcResponse.ok) {
        return errorResponse(pitcResponse.status, `PITC returned ${pitcResponse.status}`);
      }

      const html = await pitcResponse.text();

      // ─── Validate response ───────────────────────────────
      if (html.length < 200) {
        return errorResponse(404, 'Bill not found — check your reference number');
      }

      // ─── Return with CORS headers ───────────────────────
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          // Cache the bill for 2 hours — reduces PITC load
          'Cache-Control': 'public, max-age=7200, s-maxage=7200',
          'Vary': 'Accept-Encoding',
        },
      });

    } catch (error) {
      if (error.name === 'TimeoutError') {
        return errorResponse(504, 'PITC server timeout — please try again');
      }
      return errorResponse(500, 'Failed to fetch bill');
    }
  },
};

// ─── CORS Headers ─────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://pakistanbill.online',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ─── Error Response ────────────────────────────────────────────
function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  });
}
