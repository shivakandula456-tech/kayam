# KAYAM SPICES Test Report

Date: 28 October 2026

## Environment

- Windows, PowerShell 5.1
- Node.js v24.19.0
- Google Chrome 156.0.8078.48, headless
- Local static server on `127.0.0.1`
- Supabase configuration: placeholders; no live project was available

## Scope completed

### 1. Static inventory and syntax

- Inventory: 18 HTML files, 21 JavaScript files, 6 CSS files.
- Every storefront and administrator JavaScript file passed `node --check`.
- Every HTML file contains a language, charset, viewport, and title.
- No duplicate element IDs were found.
- No missing local stylesheet, script, image, video, or page links were found.
- No empty or `javascript:` internal anchors were found.
- The only static-check warning is the intentional `YOUR_SUPABASE` guard text in
  `assets/js/supabase-client.js`, which is used to show the not-configured state.

The static checker intentionally excludes the pinned `assets/vendor/supabase.js`
bundle. The unused `assets/fonts/google-fonts.css` file was removed after confirming
it had no references.

### 2. Responsive browser sweep

Pages checked:

- Home
- Shop
- Product
- Cart
- Checkout
- Order confirmation
- Story
- Contact
- Privacy
- Terms
- 404
- Administrator login

Widths checked:

`320`, `390`, `430`, `768`, `1024`, `1440`, `1920`, and `2560` CSS pixels.

That is 96 page/width combinations. All 96 passed these automated checks:

- no horizontal page overflow
- layout was not wider than the viewport
- no broken local images
- main content visible
- footer visible
- mobile menu button visible below 900 px
- desktop navigation visible at and above 900 px
- no unexpected console or network errors

`admin/login.html` was checked for overflow, broken assets, and its separate
login-only layout rather than the shared storefront header/footer.

### 3. Visual review

Screenshots were captured at 390 and 1440 px for all 12 pages. Representative layouts
were reviewed at both widths, including the home hero, shop, product fallback, cart,
checkout, confirmation, story, contact, 404, and administrator login.

Observed results:

- The shared header, announcement bar, navigation, footer, forms, cards, and empty
  states align correctly at mobile and desktop widths.
- The mobile menu opens over a scrim, locks body scrolling, moves focus into the
  drawer, and closes with Escape.
- The hero video loads, plays muted, pauses, and resumes from its control.
- The contact form blocks invalid input and builds the expected WhatsApp URL after
  valid input.
- The product purchase controls were checked with a local CSS/DOM fixture because a
  live catalogue was unavailable. At desktop width the quantity, Add to cart, and
  Enquire controls now remain on one line. At mobile width the CTAs stack as intended.

### 4. Interaction results

- Announcement dismissal removes the bar and stores the session preference.
- Mobile drawer state: open, page locked, `aria-expanded="true"`, focus inside.
- Drawer close state: closed, page unlocked, `aria-expanded="false"`.
- Hero video: `readyState=4`, plays muted, pauses, and resumes.
- Invalid contact submission: highlighted the three required fields and displayed
  "Please check the highlighted fields."
- Valid contact submission: generated a `wa.me` URL containing the name, topic, and
  message, and displayed the prepared-message notice without claiming the message was
  sent.

### 5. Defects fixed during this QA pass

- Mobile and desktop stylesheets were both applied at all widths. They are now scoped
  to `max-width: 899px` and `min-width: 900px`, fixing mobile navigation/hero issues
  and desktop layout leakage.
- The product Enquire control no longer combines a full-width block class with the
  desktop flex row, which had forced it onto its own line.
- Removed the unused `assets/fonts/google-fonts.css`.
- Earlier pass: fixed order-list pagination recursion/capture behavior in
  `assets/js/admin-orders.js` and added the settings self-update policy/grant to
  `supabase/schema.sql`.

## Expected development-only messages

Home and shop log a catalogue error while `assets/js/config.js` contains placeholder
Supabase values. This is the intended not-configured fallback, not a runtime defect.
No other page produced a console exception or failed network request in the sweep.

## Not verified

The following require a configured Supabase project, confirmed catalogue data, and a
deployed hosting origin:

- live catalogue reads with real categories, products, variants, prices, and images
- signed-in administrator pages and guards
- product/category create, edit, delete, activation, uploads, and image reordering
- login success/failure, session expiry, sign-out, and password reauthentication
- checkout form submission, real `create_order` validation, stock reservation, and
  duplicate-submission handling
- populated confirmation page and WhatsApp order message
- admin order search, status transitions, shipping charge, cancellation, and stock
  restoration
- real GitHub Pages 404 behavior and deployment path
- cross-browser testing in Firefox and Safari
- formal accessibility audit and performance/Lighthouse measurements
- canonical URLs, absolute social sharing images, `sitemap.xml`, and custom domain

## Current launch blockers

1. Replace the Supabase placeholders in `assets/js/config.js`.
2. Apply the current schema, including the administrator self-update policy and grant.
3. Create the first Auth user and active `admin_profiles` row.
4. Enter confirmed product details, weights, prices, stock, and images.
5. Run the signed-in admin and checkout integration tests above.
6. Supply the production URL so canonical/social metadata and `sitemap.xml` can be
   finalized.
7. Obtain business/legal approval for privacy and terms copy.

## Verdict

The static storefront, responsive layouts, shared interactions, contact handoff, and
unconfigured fallback states pass local QA in Chrome. The site is not yet verified as a
live ordering system because Supabase credentials, business catalogue data, and deployed
hosting details are still missing.


## UI and SQL hardening follow-up — 28 October 2026

Changes on branch `ui/premium-hero-logo-refinement`:

- Removed the duplicate logo card from the homepage hero; the shared header remains the single primary public-site logo placement.
- Removed the repeated logo image from the public footer while retaining the text wordmark and tagline.
- Updated the hero headline to “The Soul of Indian Flavour.” and the primary CTA to “Explore the Collection”.
- Repositioned mobile hero content to the lower safe area after removing the logo card; desktop video negative space is preserved.
- Hardened the SQL setup by revoking unneeded `CREATE` permission on the exposed `public` schema from `PUBLIC`, `anon`, and `authenticated`, and explicitly qualifying temporary order-table references with `pg_temp`.

### Source-level regression checks for this follow-up

- JavaScript parse check passed for `common.js`, `checkout.js`, `cart.js`, `whatsapp.js`, and `supabase-client.js`.
- CSS brace-balance check passed for `components.css`, `desktop.css`, and `mobile.css`.
- Source assertions passed for hero-card removal, new headline, footer logo removal, retained desktop/mobile video paths, continued `create_order` use, and presence of RLS/admin authorization in the SQL schema.
- SQL source assertions passed for the new schema permission restriction and explicitly qualified temporary order tables.

A fresh browser screenshot sweep and live Supabase integration test were not run for this follow-up. The previous browser results above describe the earlier repository revision, so re-run responsive visual tests after checking out this branch. Live Supabase testing still requires real project configuration and product data.


## Static catalogue phase — 28 October 2026

- Added a local static catalogue manifest for all 11 client-provided products across the existing five categories.
- Added product-specific local SVG illustrations at `assets/images/products/<slug>.svg`. These are bespoke illustrative assets, not photographs of the finished KAYAM SPICES packages; replace them with approved product photography when available.
- Before Supabase is configured, the storefront now loads the local catalogue with prices, weights, stock and ingredient lists intentionally unset. Product cards show “Pricing to be confirmed”; product detail pages offer WhatsApp enquiry; Add to Cart remains unavailable until valid database-managed variants are configured.
- When Supabase is configured, the live database remains the source of truth. A configured-but-failing request continues to show the existing catalogue error rather than silently switching to static data.
- When a live product has no uploaded image yet, the product-specific local illustration remains as a temporary image fallback. Once a Supabase product image exists, it takes precedence.
- Existing cart, order-creation RPC, WhatsApp ordering, administrator code, and SQL schema were not changed in this phase.
- Source-level validation completed: JavaScript parse check passed; static-mode catalogue smoke test passed for five categories, 11 products, expected slugs, linked categories, local image paths, no variants/prices, price-pending card labels, and product URLs. A configured Supabase request failure correctly produced `FETCH_FAILED` rather than falling back to static data. All 11 SVG assets have valid outer SVG markup, contain no scripts, and reference no external image URLs.
- A full rendered browser sweep and live Supabase integration test still require a browser run and configured Supabase project.
