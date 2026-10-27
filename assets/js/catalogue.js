(function () {
  "use strict";

  const Kayam = (window.Kayam = window.Kayam || {});
  const PLACEHOLDER_IMAGE = "assets/images/product-placeholder.svg";
  let cachedData = null;
  let inFlight = null;
  let cachedAt = 0;
  const CACHE_MS = 60000;

  class CatalogueError extends Error {
    constructor(message, code, original) {
      super(message);
      this.name = "CatalogueError";
      this.code = code || "CATALOGUE_ERROR";
      this.original = original || null;
    }
  }

  function sortByOrder(a, b) {
    const orderA = Number(a.display_order) || 0;
    const orderB = Number(b.display_order) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || a.alt_text || "").localeCompare(String(b.name || b.alt_text || ""));
  }

  function normalizeImage(image) {
    const storagePath = image.storage_path || "";
    const url = window.KayamDB ? window.KayamDB.getPublicImageUrl(storagePath) : "";
    return {
      id: image.id,
      storagePath,
      altText: image.alt_text || "",
      displayOrder: Number(image.display_order) || 0,
      url: url || PLACEHOLDER_IMAGE,
    };
  }

  function normalizeVariant(variant) {
    const pricePaise = Kayam.moneyToPaise(variant.price);
    const salePricePaise =
      variant.sale_price === null || variant.sale_price === undefined || variant.sale_price === ""
        ? null
        : Kayam.moneyToPaise(variant.sale_price);
    const effectivePricePaise =
      salePricePaise !== null && salePricePaise >= 0 && salePricePaise <= pricePaise ? salePricePaise : pricePaise;
    const trackStock = Boolean(variant.track_stock);
    const stockQuantity = Number(variant.stock_quantity) || 0;
    return {
      ...variant,
      weightValue: Number(variant.weight_value),
      weightUnit: variant.weight_unit,
      label: Kayam.formatWeight(variant.weight_value, variant.weight_unit),
      pricePaise,
      salePricePaise,
      effectivePricePaise,
      onSale: salePricePaise !== null && salePricePaise < pricePaise,
      trackStock,
      stockQuantity,
      inStock: !trackStock || stockQuantity > 0,
      displayOrder: Number(variant.display_order) || 0,
    };
  }

  function normalizeProduct(product) {
    const category = product.categories || null;
    const variants = (product.product_variants || [])
      .filter(function (variant) {
        return variant.is_active !== false;
      })
      .map(normalizeVariant)
      .sort(sortByOrder);
    const images = (product.product_images || []).map(normalizeImage).sort(sortByOrder);
    const availableVariants = variants.filter(function (variant) {
      return variant.inStock;
    });
    const priceVariants = availableVariants.length ? availableVariants : variants;
    const priceVariantsSorted = priceVariants.slice().sort(function (a, b) {
      return a.effectivePricePaise - b.effectivePricePaise;
    });
    const lowest = priceVariantsSorted[0] || null;
    return {
      ...product,
      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            isActive: category.is_active !== false,
          }
        : null,
      categoryName: category ? category.name : "Uncategorised",
      categorySlug: category ? category.slug : "",
      variants,
      availableVariants,
      images,
      primaryImage: images[0] || null,
      imageUrl: images[0] ? images[0].url : PLACEHOLDER_IMAGE,
      hasVariants: variants.length > 0,
      hasAvailableVariant: availableVariants.length > 0,
      lowestPricePaise: lowest ? lowest.effectivePricePaise : null,
      lowestRegularPricePaise: lowest ? lowest.pricePaise : null,
      onSale: Boolean(lowest && lowest.onSale),
      isOutOfStock: variants.length > 0 && availableVariants.length === 0,
      displayOrder: Number(product.display_order) || 0,
    };
  }

  function normalizeCategory(category) {
    return {
      ...category,
      displayOrder: Number(category.display_order) || 0,
    };
  }

  async function fetchCatalogue(options) {
    const opts = options || {};
    if (!window.KayamDB || !window.KayamDB.isConfigured()) {
      throw new CatalogueError(
        "The online catalogue is not connected yet. Add the Supabase project URL and public anon key in assets/js/config.js.",
        "NOT_CONFIGURED",
      );
    }
    const client = window.KayamDB.getClient();
    const categoryRequest = client
      .from("categories")
      .select("id,name,slug,description,is_active,display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    const productRequest = client
      .from("products")
      .select(
        "id,category_id,name,slug,short_description,description,ingredients,is_active,is_featured,display_order,created_at,updated_at,categories(id,name,slug,is_active),product_variants(id,product_id,weight_value,weight_unit,price,sale_price,track_stock,stock_quantity,is_active,display_order),product_images(id,product_id,storage_path,alt_text,display_order)",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    const [categoryResult, productResult] = await Promise.all([categoryRequest, productRequest]);
    if (categoryResult.error || productResult.error) {
      const error = categoryResult.error || productResult.error;
      throw new CatalogueError(
        "We could not load the spice catalogue. Please check your connection and try again.",
        "FETCH_FAILED",
        error,
      );
    }
    const categories = (categoryResult.data || []).map(normalizeCategory);
    const activeCategoryIds = new Set(categories.map((category) => category.id));
    const products = (productResult.data || [])
      .filter(function (product) {
        return !product.category_id || activeCategoryIds.has(product.category_id);
      })
      .map(normalizeProduct);
    return { categories, products };
  }

  async function loadAll(options) {
    const opts = options || {};
    const now = Date.now();
    if (!opts.force && cachedData && now - cachedAt < CACHE_MS) {
      return cachedData;
    }
    if (inFlight) return inFlight;
    inFlight = fetchCatalogue(opts)
      .then(function (data) {
        cachedData = data;
        cachedAt = Date.now();
        return data;
      })
      .finally(function () {
        inFlight = null;
      });
    return inFlight;
  }

  function invalidateCache() {
    cachedData = null;
    cachedAt = 0;
  }

  async function findProduct(slug, options) {
    const data = await loadAll(options);
    return data.products.find((product) => product.slug === slug) || null;
  }

  function priceToken(paise) {
    let hash = 2166136261;
    const source = `ks1:${Number(paise) || 0}`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function productUrl(product) {
    return `product.html?slug=${encodeURIComponent(product.slug)}`;
  }

  function primaryVariant(product) {
    if (!product || !product.variants) return null;
    return product.availableVariants[0] || product.variants[0] || null;
  }

  function cardImageAttributes(product) {
    return `src="${Kayam.escapeHTML(product.imageUrl)}" alt="${Kayam.escapeHTML(
      product.primaryImage && product.primaryImage.altText ? product.primaryImage.altText : `${product.name} from KAYAM SPICES`,
    )}" width="800" height="1000" loading="lazy" decoding="async" data-fallback="${PLACEHOLDER_IMAGE}"`;
  }

  function priceMarkup(product) {
    if (!product.hasVariants) {
      return '<span class="product-card__coming">Pricing to be confirmed</span>';
    }
    if (product.lowestPricePaise === null) {
      return '<span class="product-card__coming">Pricing to be confirmed</span>';
    }
    const from = product.variants.length > 1 ? '<span class="price--from">From</span>' : "";
    const old =
      product.onSale && product.lowestRegularPricePaise > product.lowestPricePaise
        ? `<span class="price-old">${Kayam.formatMoney(product.lowestRegularPricePaise)}</span>`
        : "";
    return `${from}<span class="price${product.onSale ? " price--sale" : ""}">${Kayam.formatMoney(
      product.lowestPricePaise,
    )}</span>${old}`;
  }

  function renderProductCard(product) {
    const defaultVariant = primaryVariant(product);
    const canAdd = Boolean(defaultVariant && defaultVariant.inStock);
    const weights = product.variants
      .slice(0, 3)
      .map(function (variant) {
        return `<span class="weight-chip">${Kayam.escapeHTML(variant.label)}</span>`;
      })
      .join("");
    const availability = !product.hasVariants
      ? '<p class="product-card__availability product-card__availability--soon">Details soon</p>'
      : product.isOutOfStock
        ? '<p class="product-card__availability product-card__availability--out">Out of stock</p>'
        : '<p class="product-card__availability">Available</p>';
    const badges = [];
    if (product.onSale) badges.push('<span class="badge badge--sale">Sale</span>');
    if (product.is_featured) badges.push('<span class="badge badge--gold">Featured</span>');
    if (product.isOutOfStock) badges.push('<span class="badge badge--muted">Out of stock</span>');
    const quickAdd = canAdd
      ? `<button class="product-card__quick-add" type="button" data-add-product="${Kayam.escapeHTML(
          product.id,
        )}" data-add-variant="${Kayam.escapeHTML(defaultVariant.id)}" aria-label="Add ${Kayam.escapeHTML(
          product.name,
        )} to cart">${Kayam.icon("plus")}</button>`
      : "";
    const action = canAdd
      ? `<button class="btn btn--dark btn--small btn--block" type="button" data-add-product="${Kayam.escapeHTML(
          product.id,
        )}" data-add-variant="${Kayam.escapeHTML(defaultVariant.id)}">Add to cart</button>`
      : `<a class="btn btn--outline btn--small btn--block" href="${productUrl(product)}">View details</a>`;

    return `<article class="product-card" data-product-card="${Kayam.escapeHTML(product.id)}">
      <a class="product-card__media" href="${productUrl(product)}" aria-label="View ${Kayam.escapeHTML(product.name)}">
        <img ${cardImageAttributes(product)}>
        <span class="product-card__badges">${badges.join("")}</span>
      </a>
      ${quickAdd}
      <div class="product-card__body">
        <p class="product-card__category">${Kayam.escapeHTML(product.categoryName)}</p>
        <h3 class="product-card__title"><a href="${productUrl(product)}">${Kayam.escapeHTML(product.name)}</a></h3>
        <p class="product-card__desc">${Kayam.escapeHTML(product.short_description || "Product details coming soon.")}</p>
        ${weights ? `<div class="product-card__weights" aria-label="Available weights">${weights}</div>` : ""}
        <div class="product-card__footer">
          <div class="product-card__price">${priceMarkup(product)}</div>
          ${availability}
        </div>
        <div class="product-card__actions">${action}</div>
      </div>
    </article>`;
  }

  function renderSkeletonGrid(count) {
    return `<div class="skeleton-grid" aria-hidden="true">${Array.from({ length: count || 4 })
      .map(
        function () {
          return `<div class="skeleton-card">
            <div class="skeleton skeleton--image"></div>
            <div class="skeleton skeleton--line"></div>
            <div class="skeleton skeleton--line skeleton--line-short"></div>
          </div>`;
        },
      )
      .join("")}</div>`;
  }

  function setupCardActions(container) {
    if (!container || container.dataset.cardActionsBound === "true") return;
    container.dataset.cardActionsBound = "true";
    container.addEventListener("click", function (event) {
      const button = event.target.closest("[data-add-product][data-add-variant]");
      if (!button) return;
      event.preventDefault();
      const productId = button.dataset.addProduct;
      const variantId = button.dataset.addVariant;
      if (!window.KayamCart) {
        Kayam.showToast("The cart is still loading. Please try again.", "error");
        return;
      }
      window.KayamCart.addByIds(productId, variantId, 1)
        .then(function () {
          Kayam.showToast("Added to your cart.", "success");
        })
        .catch(function (error) {
          Kayam.showToast(error.message || "This item could not be added to the cart.", "error");
        });
    });
  }

  Kayam.Catalogue = {
    loadAll,
    findProduct,
    invalidateCache,
    priceToken,
    primaryVariant,
    productUrl,
    renderProductCard,
    renderSkeletonGrid,
    setupCardActions,
    placeholder: PLACEHOLDER_IMAGE,
    CatalogueError,
  };
})();
