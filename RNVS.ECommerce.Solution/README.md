# RNVS CommerceX — Complete Developer Guide

---

## Before You Start Reading

This guide is written for a developer who is setting up this project **for the first time** and has not worked on it before.

Read every step carefully. Do not skip steps. Do not change the order of steps.

If something goes wrong, check the **Troubleshooting** section at the bottom.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [How the Pages Look](#2-how-the-pages-look)
3. [The Two Database Concept — Must Understand](#3-the-two-database-concept--must-understand)
4. [Install These First](#4-install-these-first) — includes Meilisearch
5. [Local Setup — Step by Step](#5-local-setup--step-by-step) — 10 steps including Meilisearch config + reindex
6. [How to Run the Project](#6-how-to-run-the-project)
7. [Is Everything Working? Checklist](#7-is-everything-working-checklist)
8. [How Migrations Work](#8-how-migrations-work)
9. [Hosting on Production Server](#9-hosting-on-production-server)
10. [User Roles Explained](#10-user-roles-explained)
11. [Vendor Shipping Setup](#11-vendor-shipping-setup)
12. [Configuration Reference](#12-configuration-reference)
13. [Common Mistakes to Avoid](#13-common-mistakes-to-avoid)
14. [Troubleshooting](#14-troubleshooting)
15. [Project Folder Structure](#15-project-folder-structure)
16. [Quick Command Reference](#16-quick-command-reference)

---

## 1. What Is This Project?

**RNVS CommerceX** is a multi-vendor e-commerce platform — similar to Amazon or Flipkart, but built as a SaaS (Software as a Service) product.

Here is how it works in simple words:

- A **vendor** (seller) comes to the platform and registers their store
- The platform creates a **separate database** just for that vendor automatically
- The vendor gets their own portal to manage products, orders, employees, invoices, etc.
- **Customers** browse all vendors' products together on one storefront and place orders
- The **platform admin** (you) manages all vendors, moderates products, and controls platform settings

Think of it like this:
> You are running the marketplace. Vendors rent space on your marketplace. Each vendor's data is completely private and separate from other vendors.

### What is built

| Part | Technology | What it does |
|------|-----------|--------------|
| Backend API | ASP.NET Core 9 | Handles all data, authentication, business logic |
| Frontend | Next.js 16 + TypeScript | The website customers and vendors see |
| Database | PostgreSQL | Stores all data |

### The project has three types of users

**1. Customer** — browses products, adds to cart, places orders, tracks deliveries

**2. Vendor** — logs into their seller portal, manages their products, views orders, manages employees, downloads invoices, configures shipping

**3. Admin (SuperAdmin)** — platform owner, can see all vendors, remove vendors, moderate product images, change platform settings

---

## 2. How the Pages Look

### Storefront (what customers see)

| Page | URL | What it does |
|------|-----|-------------|
| Home | `/` | Shows all products from all vendors, search bar, categories |
| Product Detail | `/products/123` | Single product page with images, price, Add to Cart, Buy Now |
| Cart | `/cart` | Items added to cart, order summary, proceed to checkout |
| Checkout | `/checkout` | Shipping address, payment method, optional GSTIN for business buyers |
| My Account | `/account` | Profile, GST number, sign out |
| My Orders | `/account/orders` | Order history with product images |
| Wishlist | `/account/wishlist` | Saved products |
| Addresses | `/account/addresses` | Manage delivery addresses |
| Login / Register | `/auth/login` | Sign in or create account |

### Vendor Portal (what sellers see after logging in)

| Page | URL | What it does |
|------|-----|-------------|
| Dashboard | `/vendor/dashboard` | Overview of sales, orders, recent activity |
| Products | `/vendor/products` | Add, edit, delete products, upload images |
| Orders | `/vendor/orders` | View and update customer orders, download invoices |
| Inventory | `/vendor/inventory` | Track stock levels, set low stock alerts |
| Employees | `/vendor/employees` | Add staff members with specific access levels |
| Receipts | `/vendor/receipts` | Custom receipt builder |
| Invoices | `/vendor/invoices` | Choose GST invoice template (4 styles available) |
| Reports | `/vendor/reports` | Sales charts, top products, revenue by month |
| Shipping | `/vendor/shipping` | Set up InHouse flat rate or connect courier APIs |
| Profile | `/vendor/profile` | Edit vendor profile, store name, GSTIN |
| Bank Account | `/vendor/bank-account` | Bank details for payouts |
| Settings | `/vendor/settings` | Tax rate, currency, min order amount, features |

### Admin Panel (what the platform owner sees)

| Page | URL | What it does |
|------|-----|-------------|
| Vendors | `/admin/vendors` | List of all registered vendors, remove vendors |
| Products | `/admin/products` | Moderate product images across all vendors |
| Analytics | `/admin/analytics` | Platform-wide sales and usage data |
| Settings | `/admin/settings` | Platform configuration |

### Vendor Registration

| Page | URL | What it does |
|------|-----|-------------|
| Sell Page | `/sell` | 6-step vendor registration form — business details, terms, password setup |

---

## 3. The Two Database Concept — Must Understand

This is the most important thing to understand about this project. **Read this before touching any code.**

### There are TWO types of databases

#### Database 1 — Main Database (`RNVSECommerce`)

This is **one database** for the entire platform.

It stores only:
- All user accounts (customers, vendors, admins)
- Vendor registration records (one row per vendor) — including the connection string to that vendor's own database
- Records of removed vendors

It does **NOT** store: products, orders, categories, employees, or any vendor business data.

#### Database 2 — Vendor Databases (one per vendor)

When a vendor registers, the backend **automatically creates a new database** just for them.

Example database names:
- `RNVSVendor_Test1` ← test database used during development
- `RNVSVendor_radheradhe_8f8706` ← RadheRadhe vendor's database
- `RNVSVendor_guru_9bb858` ← Guru vendor's database

Each vendor database stores:
- That vendor's products, categories, product images
- That vendor's orders and order items
- That vendor's employees
- That vendor's invoice templates, branding settings, receipts
- That vendor's inventory records
- That vendor's platform settings (tax rate, shipping config, etc.)

### How does the backend know which database to use?

Every API request includes a JWT token (login token). The backend reads the vendor's ID from the token, looks up the main database to find that vendor's database connection string, and connects to the right database automatically.

The developer does not need to do anything — this happens automatically.

### Visual summary

```
RNVSECommerce (Main DB)
├── User: customer@gmail.com (Role: Customer)
├── User: vendor1@test.com (Role: Vendor) → RailwayDatabaseUrl: "...RNVSVendor_Test1..."
├── User: radhe@vendor.com (Role: Vendor) → RailwayDatabaseUrl: "...RNVSVendor_radheradhe_8f8706..."
└── User: admin@rnvs.com (Role: SuperAdmin)

RNVSVendor_Test1 (Vendor 1's DB)
├── Products: Knife Set, Steel Bowl...
├── Orders: ORD-20260630...
└── Employees: manager@vendor1.com

RNVSVendor_radheradhe_8f8706 (RadheRadhe's DB)
├── Products: ...
└── Orders: ...
```

---

## 4. Install These First

Install all of these before starting. Do not skip any.

### 4.1 — .NET 9 SDK

Download from: https://dotnet.microsoft.com/download/dotnet/9.0

After installing, verify by opening a terminal and running:
```bash
dotnet --version
```
It should show `9.0.x`.

### 4.2 — Node.js (version 18 or higher)

Download from: https://nodejs.org

After installing, verify:
```bash
node --version
npm --version
```

### 4.3 — PostgreSQL (version 15 or higher)

Download from: https://www.postgresql.org/download/windows/

During installation:
- Remember the password you set for the `postgres` user — you will need it
- Keep the default port: `5432`
- Install pgAdmin 4 when offered (it is the GUI tool to view your databases)

After installing, verify:
```bash
psql --version
```

### 4.4 — EF Core CLI Tool

This tool is needed to create and run database migrations. Run this in any terminal:

```bash
dotnet tool install --global dotnet-ef
```

After installing, verify:
```bash
dotnet ef --version
```

### 4.5 — Visual Studio 2022

Download from: https://visualstudio.microsoft.com/

During installation, select the workload: **ASP.NET and web development**

### 4.6 — VS Code (for frontend)

Download from: https://code.visualstudio.com/

### 4.7 — Meilisearch (search engine)

Meilisearch is the search engine that powers the product search bar on the storefront. Without it, the search bar will not return results (the rest of the site still works).

**Download from:** https://github.com/meilisearch/meilisearch/releases

1. Download `meilisearch-windows-amd64.exe` from the releases page
2. Rename it to `meilisearch.exe` and move it to a permanent folder like `C:/meilisearch/`
3. Start it once manually to verify it works:
   ```bash
   C:/meilisearch/meilisearch.exe --master-key="rnvs-meilisearch-secret-key"
   ```
4. Open `http://localhost:7700` in the browser — you should see the Meilisearch welcome page
5. Set it up as a **Windows Service** so it starts automatically with Windows (optional but recommended):
   ```bash
   # Install NSSM (Non-Sucking Service Manager) first: https://nssm.cc/download
   # Then run in PowerShell as Administrator:
   nssm install Meilisearch "C:/meilisearch/meilisearch.exe" "--master-key=rnvs-meilisearch-secret-key"
   nssm start Meilisearch
   ```

After setup, Meilisearch will always be running at `http://localhost:7700`.

---

## 5. Local Setup — Step by Step

> **Do these steps in exactly this order. The order matters.**

### Step 1 — Configure the backend connection string

Open this file:
```
G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API/appsettings.json
```

Find the `ConnectionStrings` section and update the password:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=RNVSECommerce;Username=postgres;Password=YOUR_POSTGRES_PASSWORD",
  "VendorConnection": "Host=localhost;Port=5432;Database=RNVSVendor_Test1;Username=postgres;Password=YOUR_POSTGRES_PASSWORD"
}
```

Replace `YOUR_POSTGRES_PASSWORD` with the password you set when installing PostgreSQL.

> **Why this must be done first:** The migration commands in the next steps use this connection string to know which database to connect to. If the password is wrong, all migration commands will fail.

### Step 2 — Trust the HTTPS development certificate

The backend runs on HTTPS (port 7147). Without this step, the browser will block all API calls and the frontend will not work.

Run this command once:

```bash
dotnet dev-certs https --trust
```

When Windows asks "Do you want to install this certificate?", click **Yes**.

You only need to do this once per machine. You do not need to repeat this step in the future.

### Step 3 — Create the main database

First, create the empty database:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE \"RNVSECommerce\";"
```

This will ask for the postgres password. Type it and press Enter.

Then, run the migration to create all the tables inside it:

```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

dotnet ef database update --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

This creates tables like `AspNetUsers`, `TenantRegistrations`, etc. inside `RNVSECommerce`.

**How to verify it worked:** Open pgAdmin → expand `RNVSECommerce` → Schemas → public → Tables. You should see tables like `AspNetUsers`, `TenantRegistrations`, `__EFMigrationsHistory`, etc.

### Step 4 — Create the test vendor database

This is the database used during development and testing. Real vendors get their own databases automatically when they register.

Create the empty database:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE \"RNVSVendor_Test1\";"
```

Then run the migration to create all tables inside it:

```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

dotnet ef database update --context VendorDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

This creates tables like `Products`, `Orders`, `Categories`, `Employees`, etc. inside `RNVSVendor_Test1`.

**How to verify it worked:** Open pgAdmin → expand `RNVSVendor_Test1` → Schemas → public → Tables. You should see `Products`, `Orders`, `Categories`, `Stocks`, etc.

> **Note:** This test database is for development only. It will be deleted once the project goes live and real vendor accounts are set up.

### Step 5 — Create the uploads folder

Vendors upload product images through the portal. The backend saves these images in a specific folder. Create it now:

```bash
mkdir "G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API/wwwroot/uploads"
```

If this folder does not exist, image uploads will silently fail.

### Step 6 — Create the frontend environment file

Go to the frontend folder:
```
G:/E_Commerce/rnvs-ecommerce-frontend/
```

Create a new file called `.env.local` (exactly that name, with the dot at the start) with this content:

```
NEXT_PUBLIC_API_URL=https://localhost:7147
```

This tells the frontend where to find the backend API.

### Step 7 — Install frontend dependencies

```bash
cd G:/E_Commerce/rnvs-ecommerce-frontend
npm install
```

This downloads all the required packages. It may take a few minutes. You only need to do this once (or again if `package.json` changes).

### Step 8 — Configure Meilisearch in appsettings.json

Open `appsettings.json` and find the `Search` section. Make sure it looks like this:

```json
"Search": {
  "Provider": "Meilisearch",
  "MeilisearchUrl": "http://localhost:7700",
  "MeilisearchApiKey": "rnvs-meilisearch-secret-key"
}
```

The `MeilisearchApiKey` must match the `--master-key` value you used when starting Meilisearch. If they do not match, the backend will fail to connect to Meilisearch and search will not work.

### Step 9 — Populate the search index

After adding products via the vendor portal, you need to tell Meilisearch to index them. Do this **once** after you have added some products (and repeat it whenever you want to refresh the index):

1. Make sure both the backend and Meilisearch are running
2. Log in as a **SuperAdmin** account
3. Call this API endpoint (you can use Swagger at `https://localhost:7147/swagger`):
   ```
   POST /api/search/reindex
   ```
4. The backend will index all products from all vendor databases into Meilisearch
5. Search on the storefront home page will now return results

> You do NOT need to call reindex every time a vendor adds a product — the backend automatically updates the Meilisearch index when a product is created or edited. Reindex is only needed on first setup or if the index gets corrupted.

### Step 10 — Create your admin account

After the backend starts for the first time, there are no user accounts. You need to create your admin account.

1. Start the backend (see Section 6)
2. Start the frontend (see Section 6)
3. Go to `http://localhost:3000/auth/register`
4. Register a normal account with your email and password
5. Open psql or pgAdmin and run this SQL to make it a SuperAdmin:

```sql
-- Connect to RNVSECommerce first, then run:
UPDATE public."AspNetUsers"
SET "Role" = 5
WHERE "Email" = 'your@email.com';
```

6. Log out and log back in
7. You now have full admin access — go to `http://localhost:3000/admin/vendors`

---

## 6. How to Run the Project

### Start the backend

**Option A — Visual Studio 2022 (recommended):**
1. Open `G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.Solution.sln`
2. Press **F5** or click the green Run button

**Option B — Terminal:**
```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API
dotnet run
```

The backend will be available at:
- `https://localhost:7147` — main API URL
- `https://localhost:7147/swagger` — interactive API documentation (useful for testing)

**What happens on startup automatically:**
- All pending migrations are applied to the main database
- All pending migrations are applied to every vendor database
- Default product categories are seeded if none exist

### Start the frontend

Open a new terminal (keep the backend running):

```bash
cd G:/E_Commerce/rnvs-ecommerce-frontend
npm run dev
```

The frontend will be available at: `http://localhost:3000`

> **Both must be running at the same time.** The frontend calls the backend API constantly — if the backend is not running, the frontend will show errors.

---

## 7. Is Everything Working? Checklist

Go through each item after setup. If any item fails, check the Troubleshooting section.

### Meilisearch checklist

- [ ] Open `http://localhost:7700` in the browser — you should see the Meilisearch welcome screen (not a connection error)
- [ ] If it does not open, Meilisearch is not running — start it manually: `C:/meilisearch/meilisearch.exe --master-key="rnvs-meilisearch-secret-key"`

### Backend checklist

- [ ] Open `https://localhost:7147/swagger` in the browser — you should see the Swagger API documentation page (not a security error)
- [ ] If you see a certificate warning, click "Advanced" → "Proceed anyway" (this means Step 2 was skipped — re-run `dotnet dev-certs https --trust`)
- [ ] Open pgAdmin → `RNVSECommerce` → Tables → you should see `AspNetUsers`, `TenantRegistrations`
- [ ] Open pgAdmin → `RNVSVendor_Test1` → Tables → you should see `Products`, `Orders`, `Categories`

### Frontend checklist

- [ ] Open `http://localhost:3000` — you should see the RNVS CommerceX homepage with a search bar and product grid
- [ ] Click "Sign In" in the top right — the login modal or login page should open
- [ ] Register a new account — you should be redirected to the home page after registering
- [ ] Go to `http://localhost:3000/account` — you should see your name and email on the account page

### Admin checklist (after creating admin account in Step 8)

- [ ] Log in with your admin account
- [ ] Go to `http://localhost:3000/admin/vendors` — you should see the vendor management page
- [ ] The page should load without errors

### Vendor checklist (after a vendor registers)

- [ ] A vendor registers via `http://localhost:3000/sell`
- [ ] After registration approval, vendor logs in and lands on `http://localhost:3000/vendor/dashboard`
- [ ] Go to `/vendor/products` → add a product — it should appear in the storefront home page
- [ ] Go to the storefront and type in the search bar — a dropdown with product suggestions should appear (if search returns nothing, run the reindex — see Step 9)
- [ ] Go to `/vendor/shipping` → the InHouse card should be visible with flat rate fields
- [ ] Go to `/vendor/invoices` → select a template → set as default
- [ ] Go to `/vendor/orders` → an order should show an "Invoice" button directly on the order card

---

## 8. How Migrations Work

### What is a migration?

When you change the database structure (add a new column, add a new table, rename something), you need to tell the database about it. A **migration** is a set of instructions that tells the database exactly what to change.

### The two commands you need to know

**Command 1 — Create a migration file (YOU run this)**
```bash
dotnet ef migrations add YourMigrationName --context ContextName --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

This creates a `.cs` file in the `Migrations/` folder describing what SQL to run.

**Command 2 — Apply the migration to the database (the BACKEND runs this automatically on startup)**

You do NOT need to run this manually after the first-time setup. The backend applies all pending migrations every time it starts.

### When do you need to create a migration?

Any time you:
- Add a new property/column to an existing entity
- Create a new entity/table
- Delete or rename a column
- Change a column's data type or length

### Which context to use?

| What you changed | Which context |
|-----------------|---------------|
| Something in `ApplicationUser`, `TenantRegistration`, or any file under `Domain/Entities/User/` | `ApplicationDbContext` |
| Something in `Product`, `Order`, `Category`, `Employee`, `BrandingSettings`, or any other vendor business entity | `VendorDbContext` |

### Step-by-step example

**Example:** You added a new field `DeliveryNotes` to the `Order` entity.

**Step 1 — Create the migration file:**
```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

dotnet ef migrations add AddDeliveryNotesToOrder --context VendorDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

**Step 2 — Restart the backend.**

That is it. When the backend starts, it automatically applies the migration to:
- `RNVSVendor_Test1` (test database)
- Every real vendor database registered in `TenantRegistrations`

No SQL, no manual commands, nothing else.

### What NOT to do

- Do NOT run `dotnet ef database update` after the first-time setup — the backend handles this
- Do NOT delete migration files — this breaks the migration history
- Do NOT use or connect to the `RNVSVendor_Design` database — it is a stale artifact from a wrong migration run, ignore it
- Do NOT hardcode `RNVSVendor_Test1` anywhere in the code — this database will be deleted when the project goes live

---

## 9. Hosting on Production Server

This section covers what to do when deploying to a live server or cloud platform.

### 9.1 — Production database setup

On your production server or cloud PostgreSQL service, create the main database:

```bash
psql -U postgres -h YOUR_PRODUCTION_HOST -p 5432 -c "CREATE DATABASE \"RNVSECommerce\";"
```

Replace `YOUR_PRODUCTION_HOST` with your server's IP or hostname.

Then apply all migrations to create the tables:

```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

dotnet ef database update --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API --connection "Host=YOUR_PRODUCTION_HOST;Port=5432;Database=RNVSECommerce;Username=postgres;Password=YOUR_PRODUCTION_PASSWORD"
```

> **You do NOT need to create vendor databases manually on production.** When a vendor registers on the live platform, the backend creates their database automatically using the connection string they provide (stored in `TenantRegistrations.RailwayDatabaseUrl`).

### 9.2 — Update production configuration

On the production server, update `appsettings.json` (or use environment variables):

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=YOUR_PRODUCTION_HOST;Port=5432;Database=RNVSECommerce;Username=postgres;Password=YOUR_PRODUCTION_PASSWORD",
  "VendorConnection": ""
}
```

Leave `VendorConnection` empty on production — it is only used during local development.

Also update:

```json
"Cors": {
  "AllowedOrigins": ["https://your-production-domain.com"]
}
```

### 9.3 — Environment variables for sensitive values

Never put real API keys in `appsettings.json` in production. Use environment variables instead:

```bash
# Set these as environment variables on your server:
ConnectionStrings__DefaultConnection=Host=...;Database=RNVSECommerce;...
Jwt__Secret=your-very-strong-secret-key-minimum-32-characters
Resend__ApiKey=re_your_resend_api_key
```

### 9.4 — What happens automatically on first production start

When the backend starts on production for the first time:
1. It reads all migration files and applies them to `RNVSECommerce`
2. It seeds default product categories
3. It is ready to accept vendor registrations

When any vendor registers:
1. A new database is created for them automatically
2. All migrations are applied to their new database automatically
3. Default categories are seeded in their database

You do not need to do anything manually for new vendors.

### 9.5 — After deploying a new migration to production

Whenever you add a new migration (`dotnet ef migrations add ...`) and deploy the updated backend:

1. Deploy the new backend code to your server
2. Restart the backend

The backend will automatically apply the new migration to:
- The main `RNVSECommerce` database
- Every vendor database registered in `TenantRegistrations`

No manual SQL, no manual migration commands needed on production.

### 9.6 — Frontend production build

```bash
cd G:/E_Commerce/rnvs-ecommerce-frontend

# Create production environment file
echo "NEXT_PUBLIC_API_URL=https://your-production-api-domain.com" > .env.production

# Build for production
npm run build

# Start production server
npm start
```

---

## 10. User Roles Explained

The platform has 4 active user roles. Roles are stored as numbers in the database.

| Role Number | Role Name | Who is this? | What can they do? |
|-------------|-----------|-------------|------------------|
| 1 | Customer | Regular shoppers | Browse products, add to cart, place orders, manage their account |
| 2 | Vendor | Store owners | Full access to vendor portal — manage products, orders, employees, invoices, shipping, reports |
| 3 | Employee | Vendor's staff | Limited access to vendor portal based on their designation |
| 5 | SuperAdmin | Platform owner (you) | Full access to admin panel — manage all vendors, moderate products, platform-wide settings |

> **Role 4 (Admin) is NOT used.** The code has it but it was never activated. Always use Role 5 for admin access.

### Employee access levels

Employees are created by vendors. Each employee gets a designation that controls which pages they can access:

| Designation | What they can access |
|-------------|---------------------|
| Manager | Everything the vendor can see |
| Sales Staff | Dashboard, Products, Orders only |
| Support | Dashboard, Orders only |
| Cashier | Dashboard, Orders, Receipts only |
| Warehouse Staff | Dashboard, Inventory only |
| Delivery Staff | Dashboard, Orders only |

### How to change a user's role manually

If you need to change a user's role (for example, making someone a SuperAdmin), run this SQL in pgAdmin or psql connected to `RNVSECommerce`:

```sql
UPDATE public."AspNetUsers"
SET "Role" = 5
WHERE "Email" = 'the-users-email@example.com';
```

The user must log out and log back in for the role change to take effect.

---

## 11. Vendor Shipping Setup

Vendors set up their own shipping from the vendor portal at `/vendor/shipping`.

### InHouse Shipping

This is the default. The vendor handles their own delivery and sets a flat delivery charge.

- **Flat Rate** — what customers pay for shipping (e.g. ₹50)
- **Free Shipping Above** — orders above this amount get free shipping (e.g. ₹1,000)
- This can be enabled or disabled with a toggle

### External Couriers

Vendors can connect their own accounts with courier companies. They enter their API credentials in the portal — you do not need to set anything up for them.

| Courier | What the vendor needs |
|---------|----------------------|
| Blue Dart | API Key + Customer ID |
| Delhivery | API Token |
| DTDC | API Key + Customer Code |
| FedEx | API Key + Account Number |
| UPS | API Key + Username + Password |

> **Warning shown to vendors:** If a vendor disables InHouse shipping AND has no external courier connected, a red warning appears in the portal saying "No shipping method is active — customers cannot complete checkout."

---

## 12. Configuration Reference

All backend configuration is in:
```
RNVS.ECommerce.Solution/RNVS.ECommerce.API/appsettings.json
```

### Database connections
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=RNVSECommerce;Username=postgres;Password=YOUR_PASSWORD",
  "VendorConnection": "Host=localhost;Port=5432;Database=RNVSVendor_Test1;Username=postgres;Password=YOUR_PASSWORD"
}
```

### JWT (login tokens)
```json
"Jwt": {
  "Secret": "must-be-at-least-32-characters-long-keep-this-secret",
  "Issuer": "RNVS.ECommerce",
  "ExpirationInMinutes": 60
}
```
> The secret key must be at least 32 characters. Use a long random string in production. Never share it.

### Email (Resend)
```json
"Resend": {
  "ApiKey": "re_your_resend_api_key",
  "FromEmail": "noreply@yourdomain.com",
  "FromName": "RNVS CommerceX"
}
```
> **Security warning:** Do not commit the live API key to source control. Move it to an environment variable before going to production.

### Platform defaults
```json
"Platform": {
  "Currency": "INR",
  "CurrencySymbol": "₹",
  "DefaultTaxRate": 0.18,
  "CommissionRate": 0.15
}
```

### CORS (which frontend URLs can call the backend)
```json
"Cors": {
  "AllowedOrigins": ["http://localhost:3000"]
}
```
> In production, replace `http://localhost:3000` with your actual frontend domain.

### Meilisearch (search engine)
```json
"Search": {
  "Provider": "Meilisearch",
  "MeilisearchUrl": "http://localhost:7700",
  "MeilisearchApiKey": "rnvs-meilisearch-secret-key"
}
```
> The `MeilisearchApiKey` must exactly match the `--master-key` you start Meilisearch with. If they differ, search will silently fail. In production, use a strong random key and keep it in an environment variable.

### InHouse shipping defaults (platform-level fallback)
```json
"Shipping": {
  "InHouse": {
    "Enabled": true,
    "FlatRate": 50,
    "FreeShippingThreshold": 1000
  }
}
```

---

## 13. Common Mistakes to Avoid

These are real mistakes that caused problems during development of this project.

### ❌ Running migrations before configuring the connection string

If you run `dotnet ef database update` before setting the correct password in `appsettings.json`, the command fails with a connection error. Always configure the connection string first.

### ❌ Running `dotnet ef database update` after the first-time setup

After the first-time setup is complete, you should NEVER run `dotnet ef database update` manually again. The backend handles this automatically on startup. Running it manually can cause migration conflicts.

### ❌ Using `RNVSVendor_Design` database

This database was accidentally created during a wrong migration run. It is empty and useless. Do not connect to it, do not use it, do not run migrations on it. You can delete it.

### ❌ Hardcoding `RNVSVendor_Test1` anywhere in the code

The test database is for local development only. It will be deleted when the project goes live. If any code references this database name directly, it will break in production.

### ❌ Running the migration add command from the wrong folder

The migration commands must be run from inside `RNVS.ECommerce.Solution/`. If you run them from a different folder, you get "No project was found" errors.

### ❌ Not creating the `wwwroot/uploads` folder

If this folder does not exist, product image uploads will fail silently — the vendor will think the image was uploaded but it will not appear.

### ❌ Forgetting to restart the backend after adding a migration

After running `dotnet ef migrations add`, you must restart the backend for the migration to be applied to all databases. Just saving the file is not enough.

### ❌ Skipping the HTTPS certificate trust step

If you skip `dotnet dev-certs https --trust`, the frontend will fail to call the backend and show network errors. This is a one-time setup step for each developer machine.

### ❌ Not creating `.env.local` in the frontend

Without this file, the frontend does not know where the backend is and all API calls will fail. The file must contain `NEXT_PUBLIC_API_URL=https://localhost:7147`.

### ❌ Meilisearch master key mismatch

If the `--master-key` you start Meilisearch with does not exactly match `MeilisearchApiKey` in `appsettings.json`, the backend cannot connect to Meilisearch and search silently stops working. Both values must be identical.

### ❌ Forgetting to run reindex after first setup

After setup, the Meilisearch index is empty. Search returns nothing until you call `POST /api/search/reindex` once (as SuperAdmin via Swagger). After that, new/updated products are automatically indexed — you only need to reindex manually on first setup.

---

## 14. Troubleshooting

### "relation does not exist" — backend crashes on startup

**Meaning:** A database table is missing.

**Fix:** The migration was not applied to that database. Run:
```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

# For main database
dotnet ef database update --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API

# For vendor database
dotnet ef database update --context VendorDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

---

### "column X does not exist" — vendor orders or products page shows Internal Server Error

**Meaning:** A new migration was added that adds a column, but it was not applied to that vendor's database.

**Fix:** Simply restart the backend. The auto-migration runs on startup and applies the missing column to all vendor databases.

---

### Frontend shows blank page, network errors, or "Cannot connect"

Check these in order:
1. Is the backend running? Open `https://localhost:7147/swagger` in the browser. If it does not open, start the backend first.
2. Does `.env.local` exist in `rnvs-ecommerce-frontend/`? It must contain `NEXT_PUBLIC_API_URL=https://localhost:7147`
3. Did you trust the HTTPS certificate? Run `dotnet dev-certs https --trust` if not done

---

### Frontend shows certificate / SSL error when calling API

Run this and click Yes when prompted:
```bash
dotnet dev-certs https --trust
```
Then restart both backend and frontend.

---

### Login works but immediately redirects back to login

Clear the browser localStorage:
1. Press `F12` to open developer tools
2. Go to **Application** tab
3. Click **Local Storage** on the left
4. Right-click `http://localhost:3000` → **Clear**
5. Refresh and log in again

---

### "No project was found" when running migration command

You are in the wrong folder. Always run migration commands from inside `RNVS.ECommerce.Solution/`:

```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

dotnet ef migrations add YourMigrationName --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API
```

---

### Cannot connect to PostgreSQL

1. Open Windows Services (press Win+R → type `services.msc`) and make sure **postgresql-x64-15** (or similar) is running
2. Check the password in `appsettings.json` matches the postgres user password you set during installation
3. Make sure port `5432` is not blocked by firewall

---

### Product images not showing

The `wwwroot/uploads/` folder does not exist. Create it:
```bash
mkdir "G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API/wwwroot/uploads"
```
Then restart the backend.

---

### Where to find error logs

All backend errors are logged to:
```
G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API/Logs/ecommerce-YYYYMMDD.log
```

A new log file is created each day. Open the latest one to see full error messages and stack traces when something goes wrong.

---

### Search bar shows no results / dropdown is empty

Check in this order:
1. Is Meilisearch running? Open `http://localhost:7700` — if it does not open, start it: `C:/meilisearch/meilisearch.exe --master-key="rnvs-meilisearch-secret-key"`
2. Did you run the reindex? Log in as SuperAdmin → go to `https://localhost:7147/swagger` → call `POST /api/search/reindex`
3. Does the API key match? The `--master-key` you started Meilisearch with must be identical to `MeilisearchApiKey` in `appsettings.json`

---

### Inventory page shows "Cannot reach the server"

This usually means the backend is not running or the frontend `.env.local` is missing/wrong. Check both.

---

### `RNVSVendor_Design` database appeared

This is harmless but useless. Delete it:
```sql
DROP DATABASE "RNVSVendor_Design";
```

---

## 15. Project Folder Structure

### Backend
```
RNVS.ECommerce.Solution/
│
├── RNVS.ECommerce.Domain/              ← Business entities and enums (no logic here)
│   ├── Entities/
│   │   ├── User/                       ApplicationUser, Employee, CompanyProfile
│   │   ├── Product/                    Product, Category, ProductImage, ProductVariant
│   │   ├── Order/                      Order, OrderItem, Address, OrderStatusHistory
│   │   ├── Shopping/                   Cart, CartItem, Wishlist
│   │   ├── Payment/                    Payment, PaymentMethod
│   │   ├── Inventory/                  Stock, InventoryTransaction
│   │   ├── Receipt/                    BrandingSettings, CustomReceipt, InvoiceTemplate
│   │   └── System/                     ActivityLog, Notification, PlatformSetting
│   └── Enums/                          UserRole, OrderStatus, PaymentStatus, etc.
│
├── RNVS.ECommerce.Application/         ← Business logic (services, DTOs)
│   ├── DTOs/                           Request/response data shapes for all entities
│   ├── Services/                       Business logic (StorefrontProductsService, etc.)
│   └── Interfaces/                     Repository interfaces
│
├── RNVS.ECommerce.Infrastructure/      ← Database, external services
│   ├── Data/
│   │   ├── ApplicationDbContext.cs     ← Main DB context (RNVSECommerce)
│   │   ├── VendorDbContext.cs          ← Vendor DB context (one per vendor)
│   │   ├── Migrations/                 ← Main DB migration files (do not delete)
│   │   └── VendorMigrations/           ← Vendor DB migration files (do not delete)
│   └── ExternalServices/
│       ├── ShippingProviders/          BlueDart, Delhivery, DTDC, FedEx, UPS, InHouse
│       ├── Email/                      Resend email service
│       └── Storage/                    Local file storage for product images
│
└── RNVS.ECommerce.API/                 ← Web API layer
    ├── Controllers/                    All API endpoints (one file per feature)
    ├── Middleware/                     Rate limiting, error handling
    ├── Logs/                           Daily log files — check here when debugging
    ├── wwwroot/uploads/                Product images uploaded by vendors
    ├── Program.cs                      App startup, auto-migration, dependency injection
    └── appsettings.json                All configuration — update this for your environment
```

### Frontend
```
rnvs-ecommerce-frontend/
├── .env.local                          ← Create this yourself (not in source control)
└── src/
    ├── app/
    │   ├── page.tsx                    Home page — all products
    │   ├── products/[id]/page.tsx      Product detail page
    │   ├── cart/page.tsx               Shopping cart
    │   ├── checkout/page.tsx           Checkout with GSTIN
    │   ├── auth/                       Login, register, forgot password
    │   ├── account/                    Customer account pages
    │   ├── vendor/                     Vendor portal (all vendor pages)
    │   └── admin/                      Admin panel pages
    ├── components/
    │   └── layout/Navbar.tsx           Top navigation bar
    ├── lib/
    │   ├── api.ts                      All API calls — add new API methods here
    │   └── utils.ts                    Helper functions (formatPrice, getImageUrl)
    └── store/
        ├── authStore.ts                Login state management
        ├── cartStore.ts                Cart state management
        └── vendorStore.ts              Vendor/employee state
```

---

## 16. Quick Command Reference

Copy and paste these when needed.

### Start Meilisearch (if not running as a Windows service)

```bash
C:/meilisearch/meilisearch.exe --master-key="rnvs-meilisearch-secret-key"
```

### Populate search index (run once after first-time setup, then only if index is lost)

Call this in Swagger (`https://localhost:7147/swagger`) while logged in as SuperAdmin:
```
POST /api/search/reindex
```

### First-time setup (run once in this order)

```bash
# 1. Trust HTTPS certificate
dotnet dev-certs https --trust

# 2. Create main database
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE \"RNVSECommerce\";"

# 3. Apply migrations to main database
cd G:/E_Commerce/RNVS.ECommerce.Solution
dotnet ef database update --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API

# 4. Create test vendor database
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE \"RNVSVendor_Test1\";"

# 5. Apply migrations to test vendor database
dotnet ef database update --context VendorDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API

# 6. Create uploads folder
mkdir "G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API/wwwroot/uploads"

# 7. Install frontend packages
cd G:/E_Commerce/rnvs-ecommerce-frontend
npm install
```

### Daily development

```bash
# Start backend
cd G:/E_Commerce/RNVS.ECommerce.Solution/RNVS.ECommerce.API
dotnet run

# Start frontend (in a separate terminal)
cd G:/E_Commerce/rnvs-ecommerce-frontend
npm run dev
```

### Adding a new migration

```bash
cd G:/E_Commerce/RNVS.ECommerce.Solution

# For main database change (user accounts, tenant registrations)
dotnet ef migrations add YourMigrationName --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API

# For vendor database change (products, orders, employees, etc.)
dotnet ef migrations add YourMigrationName --context VendorDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API

# After adding migration → restart the backend
# The backend auto-applies it to all databases on startup
```

### Production — create main database and apply migrations

```bash
# Create the database on production server
psql -U postgres -h YOUR_PRODUCTION_HOST -p 5432 -c "CREATE DATABASE \"RNVSECommerce\";"

# Apply all migrations with production connection string
cd G:/E_Commerce/RNVS.ECommerce.Solution
dotnet ef database update --context ApplicationDbContext --project RNVS.ECommerce.Infrastructure --startup-project RNVS.ECommerce.API --connection "Host=YOUR_PRODUCTION_HOST;Port=5432;Database=RNVSECommerce;Username=postgres;Password=YOUR_PRODUCTION_PASSWORD"
```

### Promote a user to SuperAdmin

```sql
-- Run this in pgAdmin or psql connected to RNVSECommerce:
UPDATE public."AspNetUsers"
SET "Role" = 5
WHERE "Email" = 'your@email.com';
```

### Delete stale artifact database

```sql
DROP DATABASE "RNVSVendor_Design";
```

---

*Built with ASP.NET Core 9 · Next.js 16 · PostgreSQL · EF Core 9*  
*Made in India*
