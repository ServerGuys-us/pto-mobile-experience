import * as quoteApi from './functions/api/quote.js';
import * as paymentApi from './functions/api/payment.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/quote') {
      if (request.method === 'OPTIONS') return quoteApi.onRequestOptions();
      if (request.method === 'POST') return quoteApi.onRequestPost({ request, env });
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (pathname === '/api/payment') {
      if (request.method === 'OPTIONS') return paymentApi.onRequestOptions();
      if (request.method === 'POST') return paymentApi.onRequestPost({ request, env });
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
