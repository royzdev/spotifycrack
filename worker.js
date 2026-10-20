/* Cloudflare Worker — Spotify CORS proxy
   Deploy: https://dash.cloudflare.com → Workers → Create → Paste → Deploy
   Free plan: 100,000 requests/day                                        */

const ALLOWED = [
  'open.spotify.com/get_access_token',
  'api.spotify.com/v1/search',
  'api.spotify.com/v1/artists',
  'api.spotify.com/v1/albums',
  'api.spotify.com/v1/tracks',
];

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        }
      });
    }

    const url = new URL(request.url);
    // ?url=https://api.spotify.com/...
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'missing ?url= param' }), {
        status: 400,
        headers: corsHeaders()
      });
    }

    // Security: only allow Spotify endpoints
    const allowed = ALLOWED.some(a => target.includes(a));
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'endpoint not allowed' }), {
        status: 403,
        headers: corsHeaders()
      });
    }

    // Forward request to Spotify
    const headers = {};
    const auth = request.headers.get('Authorization');
    if (auth) headers['Authorization'] = auth;

    const spotifyResp = await fetch(target, { headers });
    const body = await spotifyResp.text();

    return new Response(body, {
      status: spotifyResp.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': spotifyResp.headers.get('Content-Type') || 'application/json',
      }
    });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}
