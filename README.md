# PTO Mobile Experience

**Play Time Over** — Houston's Premier Party Bus Company

Booking website hosted on Cloudflare Pages with serverless form processing, n8n automation, HubSpot CRM, and Stripe deposits.

- **Live site:** <https://ptomobile.com>
- **Phone:** (832) 737-0646
- **Email:** <booking@ptomobile.com>
- **Address:** 2910 Antoine Dr, Houston, TX 77092

---

## Project Structure

```text
pto-mobile-experience/
├── index.html              # Homepage — hero, bus showcase, services, FAQ, CTA
├── pricing.html            # Pricing & packages (weekend + weekday + add-ons)
├── about.html              # About us + contact form
├── quote.html              # Quote request form (main lead capture)
├── buses/
│   ├── index.html          # Redirects → maverick.html
│   ├── maverick.html       # Bus #001 detail page — up to 20 guests
│   ├── royale.html         # Redirects → maverick.html (URL compatibility)
│   └── empire.html         # Redirects → maverick.html (URL compatibility)
├── assets/
│   ├── css/styles.css      # Full design system (dark luxury, red + white)
│   ├── js/main.js          # Nav, scroll animations, form validation, FAQ accordion
│   └── images/
│       ├── logo.svg        # PTO logo (SVG, viewBox cropped for legibility)
│       └── bus-hero.jpg    # ← Add your bus photo here
├── functions/
│   └── api/
│       ├── quote.js        # POST /api/quote — validates + sends to n8n webhook
│       └── payment.js      # POST /api/payment — creates Stripe Checkout Session
├── worker.js               # Cloudflare Worker entry point (routes API calls)
├── wrangler.toml           # Cloudflare Pages / Workers config
├── _headers                # Security & cache headers
├── _redirects              # Clean URL redirects
└── .dev.vars.example       # Environment variable template
```

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Hosting | Cloudflare Pages |
| API Functions | Cloudflare Pages Functions (Workers runtime) |
| Automation | n8n (serverguys.us) |
| CRM | HubSpot (via n8n) |
| Payments | Stripe Checkout Sessions |
| Fonts | Google Fonts — Poppins + Inter |

---

## Fleet

| Vehicle | Capacity | Status |
| ------- | -------- | ------ |
| Bus #001 | Up to 20 guests | Active |

### Packages

| Day | Duration | Price |
| --- | -------- | ----- |
| Weekend | 3 Hours | $1,000 |
| Weekend | 4 Hours | $1,200 |
| Weekend | 5 Hours | $1,500 |
| Weekend | 6 Hours (Signature) | $1,800 |
| Weekday | 2 Hours | $400 |
| Weekday | 3 Hours | $600 |
| Weekday | 4 Hours | $800 |

### Add-Ons

| Add-On | Price |
| ------ | ----- |
| Bottle Package | $300 |
| Hookah | $150 |
| Vibe Curator | $200 |
| Live Entertainment | $300+ |
| Theme Setup | $150 |
| VIP Lounge | Included |

---

## Setup & Deployment

### 1. Add Your Bus Photo

Drop your party bus photo at:

```plaintext
assets/images/bus-hero.jpg
```

This image appears in the hero card on the homepage and is referenced by all Open Graph / Twitter Card `og:image` tags. The gradient background shows automatically as a fallback when the file is missing.

### 2. Add Social Media Links

Search for `href="#"` in all HTML files and replace with your real profiles:

- Instagram
- Facebook
- TikTok

### 3. Configure Environment Variables

Copy `.dev.vars.example` to `.dev.vars` for local dev:

```bash
cp .dev.vars.example .dev.vars
```

In **Cloudflare Pages Dashboard → Settings → Environment Variables**, set:

| Variable | Value |
| -------- | ----- |
| `N8N_WEBHOOK_URL` | Your n8n webhook URL at serverguys.us |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...`) |
| `SITE_URL` | `https://ptomobile.com` |

### 4. Deploy to Cloudflare Pages

Connect your GitHub repo in the Cloudflare Dashboard:

- **Build command:** *(none — pure static HTML)*
- **Build output directory:** `/` (root)
- **Root directory:** `/` (root)

Or deploy via CLI:

```bash
npx wrangler pages deploy . --project-name pto-mobile-experience
```

### 5. Local Development

```bash
npm install -g wrangler
npx wrangler pages dev . --port 8788
```

The local server supports Pages Functions, so `/api/quote` and `/api/payment` work during development (use `.dev.vars` for secrets).

---

## Form Validation

The quote form (`quote.html`) has two layers of validation.

**Client-side (instant feedback):**

- Inline red error messages appear beneath each invalid field on submit
- Fields highlight with a red border
- Page scrolls to and focuses the first error
- Errors clear in real-time as the user fixes each field
- Email format validated via regex
- Event date blocked to future dates only (date picker `min` enforced)

**Server-side (`functions/api/quote.js`):**

- Quote form requires: `name`, `email`, `phone`, `event_type`, `event_date`, `start_time`, `guests`, `pickup_location`
- Contact form (about page) requires only: `name`, `email`, `event_type` — detected via `source: 'contact_page'`

---

## n8n Automation

Create a workflow in n8n with:

1. **Trigger** — Webhook node → copy URL → set as `N8N_WEBHOOK_URL`
2. **HubSpot** — Create/update Contact with lead data
3. **Email (Owner)** — Quote request notification with full event details
4. **Email (Customer)** — Booking confirmation with 2-hour response promise
5. **Google Calendar** — Create event placeholder for the booking date

### Payload sent to n8n

```json
{
  "name": "Jane Smith",
  "email": "jane@email.com",
  "phone": "(832) 555-0100",
  "event_type": "Bachelorette Party",
  "event_date": "2025-08-15",
  "start_time": "20:00",
  "end_time": "23:00",
  "guests": "11-15 guests",
  "package": "weekend_4hr",
  "bus": "Bus #001",
  "pickup_location": "2910 Antoine Dr, Houston TX",
  "destinations": "Downtown Houston, Midtown",
  "addons": ["Bottle Package", "Hookah"],
  "notes": "Surprise party",
  "source": "website_quote_form",
  "status": "new_lead",
  "lead_id": "PTO-ABC123",
  "submitted_at": "2025-04-25T18:00:00.000Z"
}
```

---

## Stripe Deposit Flow

1. Owner approves quote → n8n calls `POST /api/payment`
2. Cloudflare Worker creates a Stripe Checkout Session
3. n8n emails the customer a secure `checkout_url`
4. Customer pays → Stripe webhook → n8n updates HubSpot deal status

Minimum deposit is $50. The `SITE_URL` env var sets the Stripe success/cancel redirect URLs.

---

## SEO

All pages include full keyword meta tags, Open Graph, Twitter Cards, canonical links, robots, and geo meta tags.

The homepage additionally includes JSON-LD `LocalBusiness` structured data with the address, phone, 12-city service area, all 7 packages with prices, and opening hours — powering Google's local business panel and rich results.

---

## Design System

- **Primary:** `#CC1C1C` red on `#07070E` near-black background
- **Text:** `#E5E7EB` body / `#FFFFFF` headings
- **Fonts:** Poppins (headings) + Inter (body)
- **Mobile `≤ 767px`:** hero card hidden, stats 2×2 grid, sticky bottom action bar (Call Now | Book Now)
- **Desktop `≥ 1024px`:** 2-column hero with floating bus card and accent badges
