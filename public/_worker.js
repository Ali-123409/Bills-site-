export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/bill')) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const targetURL = url.searchParams.get('url');
    if (!targetURL) return errorResponse(400, 'Missing url parameter');

    const allowedDomains = ['bill.pitc.com.pk', 'ccms.pitc.com.pk'];
    let parsedTarget;
    try {
      parsedTarget = new URL(targetURL);
    } catch (e) {
      return errorResponse(400, 'Invalid URL');
    }

    const isAllowed = allowedDomains.some(d =>
      parsedTarget.hostname === d || parsedTarget.hostname.endsWith(`.${d}`)
    );
    if (!isAllowed) return errorResponse(403, 'Domain not permitted');

    try {
      const userIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const pitcResponse = await fetch(targetURL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Referer': 'https://bill.pitc.com.pk/',
          'Cache-Control': 'no-cache',
          'X-Forwarded-For': userIP,
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);

      if (!pitcResponse.ok) {
        return errorResponse(pitcResponse.status, `PITC error ${pitcResponse.status}`);
      }

      let html = await pitcResponse.text();

      if (html.length < 300) {
        return errorResponse(404, 'Bill not found — check your reference number');
      }

      // Fix ALL relative URLs so CSS/images/JS load correctly in srcdoc iframe
      const base = 'https://bill.pitc.com.pk';
      html = html
        .replace(/(<link[^>]+href=["'])(?!http|\/\/|data:)(\/?)([^"']+["'])/gi, `$1${base}/$3`)
        .replace(/(<script[^>]+src=["'])(?!http|\/\/)(\/?)([^"']+["'])/gi, `$1${base}/$3`)
        .replace(/(<img[^>]+src=["'])(?!http|\/\/|data:)(\/?)([^"']+["'])/gi, `$1${base}/$3`)
        .replace(/(<form[^>]+action=["'])(?!http|\/\/)(\/?)([^"']+["'])/gi, `$1${base}/$3`)
        .replace(/url\(["']?(?!http|\/\/|data:)(\/?)([^"')]+)["']?\)/gi, `url(${base}/$2)`);

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=7200',
        },
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        return errorResponse(504, 'PITC server timeout — please try again');
      }
      return errorResponse(500, `Error: ${err.message}`);
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
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
