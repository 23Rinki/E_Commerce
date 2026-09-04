# RNVS E-Commerce — Latest Status (updated 4 Sep 2026)

This file explains, in plain language, what this project is, what already works, what is still left to do, how a seller (vendor) account gets created, and how to start the search engine (Meilisearch) on this computer.

---

## 1. What this project actually is

This is a website where many different sellers can each run their own online shop, under one platform. Think of it like Shopify — each seller signs up, gets their own private shop, and sells their own products. The platform (you) takes a small cut and also charges a monthly subscription.

Two main pieces of software make this work:

- **Backend** — the "engine room." Handles logins, products, orders, payments, etc. Built with ASP.NET Core (a Microsoft technology). Lives in `RNVS.ECommerce.Solution/`.
- **Frontend** — the actual website people see and click on. Built with Next.js/React. Lives in `rnvs-ecommerce-frontend/`.

### How the data is split

- **Main database (`RNVSECommerce`)** — only stores login accounts and basic vendor registration info. Nothing about products or orders is here.
- **Vendor databases (one per seller)** — every seller gets their *own separate database*. Their products, orders, employees, stock, receipts — everything about running their shop — lives only in their own database. This means one seller can never accidentally see another seller's data, because it's not even in the same database.

---

## 2. The database — how it's set up

The whole platform runs on **PostgreSQL** (a free, well-known database engine).

### It runs automatically
Unlike Meilisearch, PostgreSQL **is** set up as a real Windows service, so it starts by itself every time this computer starts. You don't need to do anything to turn it on. (Confirmed running as `postgresql-x64-18` service.)

- Address: `localhost`
- Port: `5432`
- Username: `postgres`
- Password: `postgres`

### The databases that currently exist on this computer
As of today, there are **8 databases** in total:

| Database | What it's for |
|---|---|
| `RNVSECommerce` | The main database — logins and vendor registration only |
| `RNVSVendor_Test1` | The original test seller's shop data |
| `RNVSVendor_radheradhe_8f8706` | A seller's shop ("RadheRadhe") |
| `RNVSVendor_guru_9bb858` | A seller's shop ("Guru") |
| `RNVSVendor_pappu_20c44b` | A seller's shop ("Pappu") |
| `RNVSVendor_33878bcfebfd` | A seller's shop |
| `RNVSVendor_3866182f51f3` | A seller's shop |
| `RNVSVendor_cfb108542aef` | A seller's shop |

Every one of those `RNVSVendor_...` databases was created **automatically** the moment that seller finished registering — see section 4 below for exactly how that happens.

### Where the connection details live
The backend reads these from `RNVS.ECommerce.API/appsettings.json`, under `ConnectionStrings`:
- `DefaultConnection` → points at `RNVSECommerce` (the main DB)
- `VendorConnection` → the "template" connection used when creating a brand-new seller database (the database name gets swapped in automatically for each seller)

### One important catch — database updates
When you make a structural change to the database (an "EF migration"), it only ever applies automatically to `RNVSVendor_Test1` and to brand-new sellers signing up after that point. **Existing sellers' databases** (RadheRadhe, Guru, Pappu, etc.) do **not** get updated automatically — those need the same change applied manually, one by one, via SQL. Easy to forget, worth double-checking after any database structure change.

---

## 3. What is already built and working

### Storefront (the shopping side, for customers)
- Home page, product listing, product detail page
- Cart and checkout
- Login / register / forgot password
- Order history, wishlist, saved addresses
- Live search-as-you-type in the top navbar (powered by Meilisearch — see section 6)

### Seller (vendor) side — `/vendor/...`
- Dashboard (sales overview)
- Product management (add/edit/delete products, with images and variants)
- Orders (view and update order status)
- Inventory / stock tracking
- Employee management (seller can add staff with limited access)
- Store branding (logo, colours, store name)
- Custom receipts
- Invoice templates (4 ready-made designs, all show GST properly)
- Sales reports
- Bank account details page (for payouts)
- Shipping settings page
- Store settings page
- Subscription payment page (see section 5 below — this is newer than what we had noted before)

### Admin side (you, the platform owner)
- List of all vendors, with the ability to remove a vendor (removed vendors are archived, not deleted)
- Product moderation (can deactivate a product or remove an image if something is inappropriate)
- Analytics
- Platform-wide settings

### The "Sell on our platform" signup page — `/sell`
This is the page where a new seller registers. Full details are in section 4 below.

### Search
Product search across the whole site uses **Meilisearch**, a fast search engine (not a plain SQL search). Explained fully in section 6.

---

## 4. How a vendor (seller) account gets created

When someone signs up to become a seller at `/sell`, they go through 6 short steps:

1. **Account** — their name, email, phone (optional), and password
2. **Store** — the name of their shop
3. **Terms** — they must read and tick the Terms & Privacy Policy box before continuing
4. **Business Details** — PAN number (required), GST number (optional), Udyam number (optional)
5. **Payment** — they pick a plan and pay to activate the store
6. **Done** — success screen with a link to their new seller dashboard

### What happens behind the scenes when they finish step 4 (register)
The moment registration succeeds, the system automatically:
1. Creates a brand-new, separate database just for that seller (see section 2 above for how the database side works). The database name is built from their shop name, e.g. `RNVSVendor_rinkeestore_a1b2c3`.
2. Fills that new database with the standard set of starter product categories, so their "Add Product" dropdown isn't empty on day one.
3. Applies all the required database structure automatically (no manual setup needed by you).

### Pricing (as currently set up in the code)
- Registration itself is **free**.
- Introductory price: **₹2,999/month** for the first period, or **₹49,990/year** (yearly plan works out to 2 months free).
- Payment is handled by **Razorpay** (see next section — this part is more built than we previously thought).
- Platform commission on sales: currently set to **0%** in the configuration file (this may be a temporary/testing value — worth double-checking with you, since earlier plans mentioned 5%).

### Roles
Every account has a role number stored on it:
- 1 = Customer
- 2 = Vendor (seller)
- 3 = Employee (staff working for a seller)
- 5 = SuperAdmin (you, the platform owner)
- (Role 4 "Admin" exists in the code but is intentionally unused)

---

## 5. Payments — there are two different payment flows, don't mix them up

This project actually has **two separate payment situations**, and only one of them is built.

### A) Seller subscription payment (a seller paying YOU to activate their store) — ✅ Built
Checking the actual code shows this is already working, ahead of what we'd previously noted:
- The seller payment page (`/vendor/payment`) loads the real Razorpay checkout popup (UPI, cards, net banking, wallets).
- When payment succeeds, the site automatically verifies the payment is genuine (checks a security signature) and then tells the backend to mark that seller as "paid" — no manual step needed for a normal successful payment.
- A confirmation email is sent automatically.

**What's not done yet for this part:**
- The Razorpay account keys in the settings file are still placeholder values (`rzp_test_YOUR_KEY_ID`) — swap in your real Razorpay test/live keys before real payments can be taken.
- Confirmation currently only happens because the seller's browser calls back to the server right after paying. A more bulletproof setup would also listen for Razorpay's own server-to-server "webhook" notification, so it still gets marked paid even if they close the browser right after paying. Nice-to-have, not a blocker.

### B) Customer checkout payment (a shopper paying for products) — ❌ Not built yet
This is a completely different, separate part of the code, and it is **still fake**:
- When a customer checks out today, the order is saved with a made-up transaction ID (just a timestamp + random code) — no real payment gateway is actually called.
- There is no `RazorpayPaymentService` (or Stripe/PayPal service) actually wired into the checkout flow yet, even though Stripe/PayPal have placeholder config in the settings file.
- Refunds are also not real yet — a vendor can mark an order "Refunded" but that only changes a label; no money is ever actually sent back.

**This is the bigger, more important gap** — it means real customers cannot actually pay for anything yet. This needs its own Razorpay (or similar) integration, separate from the subscription payment above.

---

## 6. How to run Meilisearch (the search engine)

**Correction to earlier notes:** Meilisearch was thought to run automatically as a background Windows service. That is **not actually the case** — right now it is **not running**, and there is no Windows service for it. It has to be started manually.

### How to start it
Meilisearch is already installed at `C:\Meilisearch`. There's a ready-made start script there.

**Easiest way:**
Double-click this file:
```
C:\Meilisearch\start-meilisearch.bat
```

**Or from a terminal:**
```powershell
C:\Meilisearch\meilisearch.exe --master-key=rnvs-meilisearch-secret-key --env=development
```

This starts it on `http://localhost:7700`, which is the address the backend is already configured to talk to (see `appsettings.json` → `Search` section). The security key (`rnvs-meilisearch-secret-key`) already matches what's in the backend config, so no extra setup is needed there.

**Important:** If you restart your computer, Meilisearch will **not** come back on its own — you'll need to run the `.bat` file again. If you want it to truly run automatically at all times, that would need to be set up as a proper Windows service — currently it isn't one, it's just installed as a plain program folder.

### If search results look empty or out of date
As the platform owner (SuperAdmin), you can force a full rebuild of the search index by calling:
```
POST /api/search/reindex
```
This pulls every product from every seller's database and rebuilds the search index from scratch.

---

## 7. What is still left to do

### Fixed since the last update (Sep 2026)
- **Phone OTP delivery** — previously the app pretended to send a text (just wrote it to a server log, nobody's phone ever buzzed). Now wired to real **Twilio** SMS sending. Verified working, currently sending from the raw trial phone number.
- Confirmed PostgreSQL data (all 8 databases, real rows) survived a full local reinstall without any loss.

| Item | Status |
|---|---|
| **Customer checkout payment (real gateway)** | **Not built — biggest gap.** Orders currently save a fake transaction ID; no real money is ever actually charged to a customer |
| **Refunds** | Not built — a vendor can label an order "Refunded" but no money actually moves and stock isn't restocked |
| Seller subscription payment — Razorpay live/real API keys | Placeholder keys only — swap in real ones before going live |
| Seller subscription payment — webhook confirmation | Not built — currently relies only on the browser calling back after payment |
| OTP texts show a raw phone number, not "RNVS EComm" | Twilio is still on the **free trial** — named senders are blocked entirely on trial accounts (Twilio error 21267), not just a registration delay. Needs: 1) upgrade Twilio account (add payment method), 2) then submit "RNVS EComm" for alphanumeric sender ID approval (~1 week, India-only). Code already auto-switches to the name the moment it's approved — no further code change needed then |
| 2FA (two-factor login) — backend | Done and working |
| 2FA (two-factor login) — frontend screen | Not built — there's no login screen or settings toggle for it yet, even though the backend supports it |
| Passkey login (fingerprint/face login) | Not built at all — no backend or frontend |
| Guest checkout (buy without creating an account) | Not built — customers must register/login to buy |
| External courier integrations (BlueDart, Delhivery, FedEx, UPS, DTDC) | Turned off — only "in-house delivery" and "self pickup" are active right now |
| Meilisearch auto-start on computer restart | Not set up — must be started manually each time (see section 6) |
| Vendor DB migrations for existing sellers | Manual, per-database SQL needed after any structural change (see section 2) — easy to miss |
| Commission rate | Currently 0% in config — confirm with you if this is intentional or should be restored to 5% |
| Invoice download testing | Built, but hasn't been fully tested end-to-end yet |
| Sales reports page | Built, but hasn't been fully tested end-to-end yet |

---

## 8. Quick reference — starting everything for local testing

1. PostgreSQL — already running automatically, nothing to do
2. Start Meilisearch: double-click `C:\Meilisearch\start-meilisearch.bat`
3. Start the backend: run the API project (`RNVS.ECommerce.API`) — it will be available at `https://localhost:7147`
4. Start the frontend: from `rnvs-ecommerce-frontend/`, run `npm run dev` — available at `http://localhost:3000`

That's it — Meilisearch, the backend, and the frontend need to be running at the same time for the site to fully work, including search.
