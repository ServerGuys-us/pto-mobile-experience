/**
 * PTO Mobile Experience — Stripe Payment Handler
 * Cloudflare Pages Function: POST /api/payment
 *
 * Workflow:
 *  1. Owner approves quote (via n8n flow)
 *  2. n8n calls this endpoint to create a Stripe Payment Intent for the deposit
 *  3. Customer receives a secure Stripe Checkout link via email
 *
 * For direct deposit collection on a custom page, this endpoint also supports
 * creating a Stripe Checkout Session that redirects the customer to Stripe's
 * hosted payment page.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY  — sk_live_... or sk_test_... from Stripe Dashboard
 *   SITE_URL           — https://ptomobileexperience.com (for redirect URLs)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/** POST /api/payment — Create a Stripe Checkout Session */
export async function onRequestPost({ request, env }) {
  try {
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[PTO Payment] STRIPE_SECRET_KEY not configured');
      return json({ success: false, error: 'Payment service unavailable. Please call us.' }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid request body.' }, 400);
    }

    const { amount_cents, description, customer_email, customer_name, lead_id, success_url, cancel_url } = body;

    // Validate
    if (!amount_cents || !customer_email) {
      return json({ success: false, error: 'Missing required fields: amount_cents, customer_email.' }, 400);
    }
    if (amount_cents < 5000) { // Minimum $50 deposit
      return json({ success: false, error: 'Minimum deposit amount is $50.' }, 400);
    }

    const siteUrl = env.SITE_URL || 'https://ptomobileexperience.com';

    // ── Create Stripe Checkout Session ────────────────────────
    const params = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amount_cents),
      'line_items[0][price_data][product_data][name]': description || 'PTO Mobile Experience — Deposit',
      'line_items[0][price_data][product_data][description]': `Booking deposit · Lead ${lead_id || 'N/A'}`,
      'line_items[0][quantity]': '1',
      'customer_email': customer_email,
      'success_url': success_url || `${siteUrl}/booking-confirmed.html?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url':  cancel_url  || `${siteUrl}/quote.html`,
      'metadata[lead_id]':        lead_id        || '',
      'metadata[customer_name]':  customer_name  || '',
      'metadata[customer_email]': customer_email,
      'billing_address_collection': 'auto',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('[PTO Payment] Stripe error:', stripeData);
      return json({
        success: false,
        error: stripeData.error?.message || 'Payment setup failed. Please try again.',
      }, 400);
    }

    return json({
      success: true,
      checkout_url:  stripeData.url,
      session_id:    stripeData.id,
      amount_cents,
    });

  } catch (err) {
    console.error('[PTO Payment] Unexpected error:', err);
    return json({
      success: false,
      error: 'Payment error. Please call us at (555) 123-4567.',
    }, 500);
  }
}

/** POST /api/payment/intent — Create a raw Payment Intent (for embedded Stripe Elements) */
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  // Route to the POST handler
  if (request.method === 'POST') {
    return onRequestPost({ request, env });
  }
  return json({ error: 'Method not allowed' }, 405);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Helpers ──────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}
