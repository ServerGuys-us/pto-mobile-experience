# PTO Mobile Experience

**Play Time Over** — Atlanta's Premier Party Bus Company

Booking website hosted on Cloudflare Pages with serverless form processing via Cloudflare Pages Functions, n8n automation, HubSpot CRM, and Stripe deposits.

---

## Project Structure

```text
pto-mobile-experience/
├── index.html              # Homepage (hero, fleet, services, testimonials, CTA)
├── pricing.html            # Pricing & packages
├── about.html              # About us + contact form
├── quote.html              # Quote request form (main lead capture)
├── buses/
│   ├── index.html          # Fleet overview (all 3 vehicles)
│   ├── maverick.html       # The Maverick — up to 20 guests
│   ├── royale.html         # The Royale — up to 35 guests (most popular)
│   └── empire.html         # The Empire — up to 50 guests
├── assets/
│   ├── css/styles.css      # Full design system (mobile-first, dark luxury theme)
│   ├── js/main.js          # Nav, scroll animations, form submission, FAQ
│   └── images/buses/       # ← Add real bus photos here
├── functions/
│   └── api/
│       ├── quote.js        # POST /api/quote → validates form → sends to n8n
│       └── payment.js      # POST /api/payment → creates Stripe Checkout Session
├── wrangler.toml           # Cloudflare Pages config
├── _headers                # Security & cache headers
├── _redirects              # URL alias redirects
└── .dev.vars.example       # Environment variable template
```

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Hosting | Cloudflare Pages |
| API Functions | Cloudflare Pages Functions (Workers) |
| Automation | n8n at serverguys.us |
| CRM | HubSpot (via n8n) |
| Payments | Stripe (Checkout Sessions) |
| Fonts | Google Fonts — Poppins + Inter |

---

## Fleet

| Vehicle | Capacity | Rate |
| ------- | -------- | ---- |
| The Maverick | Up to 20 guests | $150/hr |
| The Royale | Up to 35 guests | $200/hr |
| The Empire | Up to 50 guests | $275/hr |

4-hour minimum on all bookings.

---

## Setup & Deployment

### 1. Add Real Photos

Replace CSS gradient placeholders with actual bus photos:

- `assets/images/buses/maverick-exterior.jpg`
- `assets/images/buses/maverick-interior.jpg`
- `assets/images/buses/royale-exterior.jpg`
- `assets/images/buses/royale-interior.jpg`
- `assets/images/buses/empire-exterior.jpg`
- `assets/images/buses/empire-interior.jpg`

Then update the `bus-img-bg` divs in each bus page to use `<img>` tags instead.

### 2. Update Placeholder Info

Search for and replace these placeholders across all HTML files:

- `(555) 123-4567` → your real phone number
- `info@ptomobileexperience.com` → your real email
- `Atlanta, GA Metro Area` → your actual service area
- `$150`, `$200`, `$275` → your actual rates
- Social media `href="#"` links → your real social profiles

### 3. Configure Environment Variables

Copy `.dev.vars.example` to `.dev.vars` for local dev:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your real values
```

In Cloudflare Pages Dashboard → Settings → Environment Variables, set:

- `N8N_WEBHOOK_URL` = your n8n webhook URL at serverguys.us
- `STRIPE_SECRET_KEY` = your Stripe secret key
- `SITE_URL` = `https://ptomobileexperience.com`

### 4. Deploy to Cloudflare Pages

```bash
# Connect your GitHub repo to Cloudflare Pages
# Or use Wrangler CLI:
npx wrangler pages deploy . --project-name pto-mobile-experience
```

Build settings in Cloudflare Dashboard:

- Build command: *(none — pure static HTML)*
- Build output directory: `/` (root)
- Root directory: `/` (root)

### 5. Local Development

```bash
# Install Wrangler
npm install -g wrangler

# Run local dev server with Pages Functions support
npx wrangler pages dev . --port 8788
```

---

## n8n Automation Setup

Create a workflow in n8n at `serverguys.us` with:

1. **Trigger**: Webhook node (copy URL → `N8N_WEBHOOK_URL`)
2. **HubSpot**: Create/update Contact with lead data
3. **Email (Owner)**: Send quote request notification with all details
4. **Email (Customer)**: Send confirmation with expected response time
5. **Google Calendar**: Create event placeholder for the booking date

### Payload fields sent to n8n

```json
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "event_type": "...",
  "event_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "guests": "...",
  "hours": "4",
  "bus": "royale",
  "pickup_location": "...",
  "destinations": "...",
  "addons": ["Birthday Decor", "Photographer"],
  "notes": "...",
  "lead_id": "PTO-ABC123",
  "source": "website_quote_form",
  "status": "new_lead",
  "submitted_at": "ISO timestamp"
}
```

---

## Stripe Deposit Flow

1. Owner approves quote → n8n calls `POST /api/payment`
2. Cloudflare Worker creates a Stripe Checkout Session
3. n8n emails customer the `checkout_url`
4. Customer pays deposit → Stripe sends webhook to n8n
5. n8n updates HubSpot → marks deal as deposit paid

### Payload to `/api/payment`

```json
{
  "amount_cents": 30000,
  "description": "PTO Mobile Experience — The Royale (6 hrs)",
  "customer_email": "guest@email.com",
  "customer_name": "Guest Name",
  "lead_id": "PTO-ABC123"
}
```
