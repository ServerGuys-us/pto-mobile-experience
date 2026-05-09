/**
 * PTO Mobile Experience — Bus Day Pass Ticket Handler
 * Cloudflare Pages Function: POST /api/bus-pass
 *
 * Creates a Stripe Checkout Session for PTO Bus Day Pass event tickets.
 * Ticket types: saturday ($30), sunday ($25), weekend ($50)
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY  — sk_live_... or sk_test_... from Stripe Dashboard
 *   SITE_URL           — https://ptomobile.com (for redirect URLs)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const TICKET_CONFIG = {
  saturday: {
    label:        'PTO Bus Day Pass — Saturday May 16th',
    description:  '1PM–6PM · 3 Stops · Meetup at 2910 Antione Drive, Houston TX',
    price_cents:  3000,
  },
  sunday: {
    label:        'PTO Brunch Pass — Sunday May 17th',
    description:  'Brunch Included · 1PM–5PM · 1–2 Stops · Meetup at 2910 Antione Drive, Houston TX',
    price_cents:  2500,
  },
  weekend: {
    label:        'PTO Weekend Combo Pass — May 16 & 17',
    description:  'Saturday + Sunday Access · Best Value · Meetup at 2910 Antione Drive, Houston TX',
    price_cents:  5000,
  },
};

export async function onRequestPost({ request, env }) {
  try {
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[BusPass] STRIPE_SECRET_KEY not configured');
      return json({ success: false, error: 'Payment service unavailable. Please call (832) 737-0646.' }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid request.' }, 400);
    }

    const { ticket_type, quantity, customer_name, customer_email, customer_phone } = body;

    if (!ticket_type || !customer_email || !customer_name) {
      return json({ success: false, error: 'Missing required fields.' }, 400);
    }

    const ticket = TICKET_CONFIG[ticket_type];
    if (!ticket) {
      return json({ success: false, error: 'Invalid ticket type.' }, 400);
    }

    const qty = Math.max(1, Math.min(20, parseInt(quantity, 10) || 1));
    const siteUrl = env.SITE_URL || 'https://ptomobile.com';

    const params = new URLSearchParams({
      mode:                         'payment',
      'payment_method_types[]':     'card',
      'line_items[0][price_data][currency]':                     'usd',
      'line_items[0][price_data][unit_amount]':                  String(ticket.price_cents),
      'line_items[0][price_data][product_data][name]':           ticket.label,
      'line_items[0][price_data][product_data][description]':    ticket.description,
      'line_items[0][quantity]':    String(qty),
      'customer_email':             customer_email,
      'phone_number_collection[enabled]': 'false',
      'success_url': `${siteUrl}/bus-day-pass-confirmed.html?session_id={CHECKOUT_SESSION_ID}&type=${ticket_type}&qty=${qty}`,
      'cancel_url':  `${siteUrl}/bus-day-pass.html#tickets`,
      'metadata[ticket_type]':      ticket_type,
      'metadata[quantity]':         String(qty),
      'metadata[customer_name]':    customer_name,
      'metadata[customer_email]':   customer_email,
      'metadata[customer_phone]':   customer_phone || '',
      'billing_address_collection': 'auto',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${stripeKey}`,
        'Content-Type':   'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('[BusPass] Stripe error:', stripeData);
      return json({
        success: false,
        error:   stripeData.error?.message || 'Payment setup failed. Please try again.',
      }, 400);
    }

    return json({
      success:      true,
      checkout_url: stripeData.url,
      session_id:   stripeData.id,
    });

  } catch (err) {
    console.error('[BusPass] Unexpected error:', err);
    return json({
      success: false,
      error:   'Payment error. Please call us at (832) 737-0646.',
    }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method === 'POST')    return onRequestPost({ request, env });
  return json({ error: 'Method not allowed' }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}
