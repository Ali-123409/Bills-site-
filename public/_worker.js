export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only handle requests starting with /api/bill
    if (!url.pathname.startsWith('/api/bill')) {
      return env.ASSETS.fetch(request);
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const targetURL = url.searchParams.get('url');
    if (!targetURL) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const userIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
      const pitcResponse = await fetch(targetURL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://bill.pitc.com.pk/',
          'X-Forwarded-For': userIP,
        }
      });

      if (!pitcResponse.ok) throw new Error(`PITC error ${pitcResponse.status}`);

      let html = await pitcResponse.text();

      // The "Magic" fix: Rewrite relative URLs to absolute PITC URLs
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
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=7200',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  },
};
