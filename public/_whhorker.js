export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle bill API requests
    if (url.pathname.startsWith('/api/bill')) {
      const targetURL = url.searchParams.get('url');
      if (!targetURL) {
        return new Response(JSON.stringify({ error: 'Missing URL' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      try {
        const pitcResponse = await fetch(targetURL, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!pitcResponse.ok) throw new Error('PITC server error');
        
        let html = await pitcResponse.text();
        const base = "https://bill.pitc.com.pk";

        // Syntax-safe replacement for images, CSS, and JS paths
        // This ensures all relative links point to the official PITC server
        html = html.replace(/(href|src)=["'](?!(http|https|data:|\/\/))(\/?)([^"']+)/gi, (match, p1, p2, p3, p4) => {
          return p1 + '="' + base + '/' + p4 + '"';
        });

        return new Response(html, {
          headers: { 
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*' 
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // Otherwise, serve the static website
    return env.ASSETS.fetch(request);
  }
};
