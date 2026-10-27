# KAYAM SPICES

A static, mobile-first storefront for KAYAM SPICES with a Supabase catalogue, saved
orders, and a private administrator area. Orders are saved in the database first and
then opened in WhatsApp for personal delivery and payment confirmation. No payment is
collected by this website.

## Current status

- Public storefront, product catalogue UI, cart, checkout, confirmation, story,
  contact, privacy, terms, and 404 pages are implemented.
- Administrator login, dashboard, order management, product catalogue, product
  editor, category manager, and account settings are implemented.
- The responsive UI, navigation, contact handoff, catalogue fallbacks, and static
  integrity checks pass local QA. See `TEST_REPORT.md`.
- `assets/js/config.js` still contains Supabase placeholders, so live catalogue,
  authentication, order, and admin operations are not yet connected.
- While Supabase is unconfigured, the storefront uses a local 11-product catalogue with five categories. Prices, weights, stock and ingredients remain unconfigured; Add to Cart stays unavailable until real variants are published.
- Product/category photography is mapped in `assets/js/catalogue.js` and `assets/js/home.js`; stock sources and licence notes are recorded in `IMAGE_SOURCE_MANIFEST.md`. Product photos are ingredient/food-context photography, not photos of finished KAYAM packaging.
- When Supabase is configured, its live catalogue is authoritative. A configured-but-failing request shows an error rather than falling back to stale static data. Local artwork remains a temporary image fallback until a live product image is uploaded.
- Product weights, prices, stock, descriptions, ingredients, and images have not been
  fabricated. Add confirmed business data through the administrator area.
- The production URL is not known yet, so canonical URLs, absolute social images,
  and `sitemap.xml` remain pending.

## Stack

- HTML5, CSS3, and vanilla JavaScript
- Supabase Postgres, Auth, Row Level Security, RPC functions, and Storage
- GitHub Pages for static hosting
- Self-hosted font files and local media; no frontend framework or build step

## Project structure

```text
.
|-- admin/                    Administrator pages
|-- assets/
|   |-- css/                  Shared, responsive, and administrator styles
|   |-- fonts/                Self-hosted WOFF2 font files
|   |-- images/               Brand, category, editorial, and placeholder images
|   |-- js/                   Storefront, shared, and administrator JavaScript
|   |-- vendor/               Pinned Supabase browser bundle
|   `-- videos/               Optimized desktop and mobile hero videos
|-- supabase/
|   `-- schema.sql            Database, RLS, RPC, storage, and seed setup
|-- 404.html                  Not-found page
|-- cart.html                 Cart
|-- checkout.html             Order details and Supabase submission
|-- contact.html              WhatsApp/email enquiry form
|-- index.html                Home
|-- order-confirmation.html   Saved order handoff to WhatsApp
|-- privacy.html              Privacy policy
|-- product.html              Product detail
|-- shop.html                 Catalogue
|-- story.html                Brand story
|-- terms.html                Terms of use
|-- TEST_REPORT.md            QA scope, results, and open checks
`-- README.md                 This file
```

## Supabase setup

### 1. Create the project

Create a Supabase project and keep the project URL and public anon key available.
The anon key is designed for browser use when Row Level Security is enabled. Never put
the service-role key in this repository or in browser code.

### 2. Run the schema

For a new project, open the Supabase SQL editor and run the complete
`supabase/schema.sql` file once. It creates:

- catalogue, product image, order, order event, and administrator tables
- public/admin Row Level Security policies and grants
- validated `create_order`, order-status, and shipping RPC functions
- the public `product-images` Storage bucket and storage policies
- the starting categories and product names

The seed product names intentionally have no weights, prices, stock, or images.

For an existing installation created from an older version of the schema, apply the
new `admin_profiles_self_update` policy and the related grants from
`supabase/schema.sql` before using the settings display-name form. The relevant block
is in the RLS/grants section around `admin_profiles`. The file uses
`create table if not exists`, so it does not migrate changed columns in an existing
database by itself.

### 3. Create the first administrator

Create the user in Supabase Dashboard > Authentication > Users. Copy the new user's
UUID and add an active administrator profile in the SQL editor:

```sql
insert into public.admin_profiles (user_id, email, display_name, is_active)
values (
  '00000000-0000-0000-0000-000000000000',
  'owner@example.com',
  'KAYAM Administrator',
  true
)
on conflict (user_id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    is_active = true;
```

Replace the UUID and email with the real values. Keep public registration disabled.
Administrator accounts and password resets are managed through Supabase Auth.

### 4. Configure the browser

Edit `assets/js/config.js`:

```js
window.KAYAM_CONFIG = Object.freeze({
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-public-anon-key",
  WHATSAPP_NUMBER: "917888060231",
  CONTACT_EMAIL: "anikhindi.suchi@gmail.com",
  STORAGE_BUCKET: "product-images",
  CURRENCY: "INR",
  LOCALE: "en-IN",
});
```

Use the project URL without a trailing slash. Reload the site after saving the file.

### 5. Add the real catalogue

Sign in at `admin/login.html`, then:

1. Review the seeded categories.
2. Open each product and confirm its description, ingredients, and category.
3. Add each confirmed weight, price, optional sale price, and stock quantity.
4. Upload product images with useful alt text and set their display order.
5. Activate the product only when its public content is ready.

Products without variants publish a truthful "pricing is being finalised" message.
The public catalogue is filtered by active product, category, and variant state.

## Local preview

Serve the directory over HTTP rather than opening the HTML files directly:

```powershell
npx --yes http-server . -p 8080
```

Then open `http://127.0.0.1:8080/`. The administrator area is at
`http://127.0.0.1:8080/admin/login.html`.

## GitHub Pages deployment

1. Push this directory to a GitHub repository.
2. In repository Settings > Pages, deploy from the desired branch and the repository
   root.
3. Keep `.nojekyll` in the deployed root.
4. Test the public pages, `/admin/login.html`, and a missing URL after deployment.
5. Add the final production origin to the static canonical and social metadata, then
   create and reference `sitemap.xml`.
6. If using a custom domain, configure it in GitHub Pages and update the same metadata.

GitHub Pages serves `404.html` for missing paths. Pages and products are plain static
files; no server rewrites or build command are required.

## Order flow

1. A customer adds active product variants to the browser-local cart.
2. Checkout rechecks current catalogue prices and availability.
3. `create_order` validates the customer details, current prices, and stock inside
   Postgres, then saves the order and order lines with price snapshots.
4. The confirmation page opens WhatsApp with a message containing the saved order
   reference. The customer still has to press Send inside WhatsApp.
5. An administrator confirms delivery details and payment separately, adjusts the
   shipping charge, and advances the order status.
6. Cancelling an order restores stock once through the database function.

A browser-generated submission key prevents accidental duplicate orders when a
checkout request is retried.

## Security notes

- Row Level Security is required for all exposed tables. Do not disable it.
- Public users can read only active catalogue content and execute the validated order
  creation function.
- Order and administrator data are readable only by an active administrator.
- The service-role key must never be placed in `assets/js/config.js`, HTML, a commit,
  or any browser-accessible file.
- Privacy and terms copy must be reviewed by the business or its legal adviser before
  launch.

## Pre-launch checklist

- [ ] Apply the latest schema and confirm the administrator self-update policy/grant.
- [ ] Add real Supabase URL and anon key.
- [ ] Create the first Auth user and `admin_profiles` row.
- [ ] Enter confirmed product details, weights, prices, stock, and images.
- [ ] Test sign-in, catalogue CRUD, uploads, checkout, duplicate prevention, status
      changes, shipping charges, cancellation, and stock restoration against Supabase.
- [ ] Test the deployed GitHub Pages URL, custom domain, and 404 behavior.
- [ ] Add the final canonical/OG URL and generate `sitemap.xml`.
- [ ] Have privacy, delivery, cancellation, returns, and terms copy legally reviewed.
- [ ] Run final cross-browser, accessibility, and performance checks.

## QA

See `TEST_REPORT.md` for the exact local test scope, results, expected development
console messages, and remaining unverified paths.


## Premium Heritage 2.0 UI refresh — 28 October 2026

- The shared public header uses a sticky outer mount so the announcement can scroll off while the navigation remains available; dismissing the announcement restores the header's correct sticky offset.
- Added a desktop Shop category mega-menu and a category group inside the mobile drawer.
- Added a mobile-only, fixed quick-navigation bar for Home, Shop, WhatsApp and Bag, with safe-area padding and cart-count support.
- Polished header scroll state, interactions, category cards, product cards, search fields, and responsive shop toolbar spacing.
- The shop filter panel and price/newest sort choices are hidden or reset when the catalogue does not yet contain the data those controls require.
- No framework, build step, custom backend or database changes were added.


## Stock photography and image de-duplication — 28 October 2026

- Replaced the five homepage category cards with five distinct Pexels stock photographs. Each source is different and none comes from the hero film or its extracted frames.
- Replaced the 11 product SVG illustrations with stock photographs selected for the spice, ingredient, spice-blend or dish context.
- Replaced the old story images, including the visible hero-frame image. The homepage story and two story-page photographs now each use a different stock photo, none from the hero film.
- Stock image URLs are served from the Pexels CDN with image-resizing/compression parameters. Creator, source page, usage and licence reference are tracked in `IMAGE_SOURCE_MANIFEST.md`.
- These photos represent ingredients or food context, not KAYAM-branded packages or a verified recipe formula. The Groundnut Chutney Powder stock photo depicts whole groundnuts as an ingredient reference.
