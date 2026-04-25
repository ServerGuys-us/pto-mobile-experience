/**
 * PTO Mobile Experience — Quote Form Handler
 * Cloudflare Pages Function: POST /api/quote
 *
 * Flow:
 *  1. Validate form data
 *  2. POST to n8n webhook (triggers: owner email, customer confirmation, HubSpot lead, Google Calendar)
 *  3. Return JSON success/error
 *
 * Environment variables (set in Cloudflare Pages → Settings → Environment Variables):
 *   N8N_WEBHOOK_URL  — your n8n webhook endpoint at serverguys.us
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/** Required fields for a valid quote submission */
const REQUIRED_FIELDS = ['name', 'email', 'phone', 'event_type', 'event_date', 'start_time', 'guests', 'pickup_location'];

export async function onRequestPost({ request, env }) {
  try {
    // ── Parse body ────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid request body.' }, 400);
    }

    // ── Validate required fields ──────────────────────────────
    const missing = REQUIRED_FIELDS.filter(f => !body[f]?.toString().trim());
    if (missing.length) {
      return json({
        success: false,
        error: `Please fill in all required fields: ${missing.join(', ')}.`,
      }, 400);
    }

    // ── Basic email validation ────────────────────────────────
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return json({ success: false, error: 'Please enter a valid email address.' }, 400);
    }

    // ── Build n8n payload ─────────────────────────────────────
    const payload = {
      // Contact
      name:             body.name.trim(),
      email:            body.email.trim().toLowerCase(),
      phone:            body.phone.trim(),

      // Event
      event_type:       body.event_type,
      event_date:       body.event_date,
      start_time:       body.start_time || '',
      end_time:         body.end_time   || '',
      guests:           body.guests,
      package:          body.package    || '',
      bus:              'Bus #001',

      // Itinerary
      pickup_location:  body.pickup_location.trim(),
      destinations:     body.destinations  || '',
      notes:            body.notes         || '',

      // Add-ons (checkboxes come as separate boolean-ish fields)
      addons: [
        body.addon_bottle       && 'Bottle Package',
        body.addon_hookah       && 'Hookah',
        body.addon_vibe         && 'Vibe Curator',
        body.addon_entertainment && 'Live Entertainment',
        body.addon_theme        && 'Theme Setup',
      ].filter(Boolean),

      // Meta
      source:     body.source || 'website_quote_form',
      status:     'new_lead',
      submitted_at: new Date().toISOString(),
      lead_id:    generateLeadId(),
    };

    // ── Send to n8n ───────────────────────────────────────────
    const n8nUrl = env.N8N_WEBHOOK_URL;

    if (!n8nUrl) {
      // Log but don't block — still confirm to user. Fix env var ASAP.
      console.error('[PTO Quote] N8N_WEBHOOK_URL is not configured!');
    } else {
      const n8nRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // 8-second timeout so we don't hold the response open
        signal: AbortSignal.timeout(8000),
      });

      if (!n8nRes.ok) {
        const errText = await n8nRes.text().catch(() => '');
        console.error(`[PTO Quote] n8n webhook failed: ${n8nRes.status} — ${errText}`);
        // Still return success to user (we'll see the error in logs)
      }
    }

    // ── Respond ───────────────────────────────────────────────
    return json({
      success: true,
      message: "Quote request received! We'll be in touch within 2 hours.",
      lead_id: payload.lead_id,
    });

  } catch (err) {
    console.error('[PTO Quote] Unexpected error:', err);
    return json({
      success: false,
      error: 'An unexpected error occurred. Please call us directly at (832) 737-0646.',
    }, 500);
  }
}

/** Handle CORS preflight */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Helpers ──────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function generateLeadId() {
  return 'PTO-' + Date.now().toString(36).toUpperCase().slice(-6);
}
