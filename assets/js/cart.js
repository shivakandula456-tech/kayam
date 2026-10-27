(function () {
  "use strict";

  const Kayam = (window.Kayam = window.Kayam || {});
  const STORAGE_KEY = "kayam.cart.v1";
  const MAX_QUANTITY = 99;

  class CartError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "CartError";
      this.code = code || "CART_ERROR";
    }
  }

  function sanitiseItem(item) {
    if (!item || typeof item !== "object") return null;
    const productId = String(item.productId || "").trim().slice(0, 64);
    const variantId = String(item.variantId || "").trim().slice(0, 64);
    const quantity = Math.floor(Number(item.quantity));
    const priceCheck = String(item.priceCheck || "").trim().slice(0, 32);
    if (!productId || !variantId) return null;
    if (!Number.isFinite(quantity) || quantity < 1) return null;
    return {
      productId,
      variantId,
      quantity: Math.min(quantity, MAX_QUANTITY),
      priceCheck,
    };
  }

  function read() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const merged = new Map();
      parsed.forEach(function (entry) {
        const item = sanitiseItem(entry);
        if (!item) return;
        const existing = merged.get(item.variantId);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + item.quantity, MAX_QUANTITY);
        } else {
          merged.set(item.variantId, item);
        }
      });
      return Array.from(merged.values());
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    const sanitised = (items || []).map(sanitiseItem).filter(Boolean);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitised));
    } catch (error) {
      throw new CartError("Your browser could not save the cart. Please check browser storage settings.", "STORAGE_FAILED");
    }
    if (Kayam.updateCartBadge) Kayam.updateCartBadge();
    document.dispatchEvent(new CustomEvent("kayam:cart-updated", { detail: { items: sanitised } }));
    return sanitised;
  }

  function count() {
    return read().reduce(function (total, item) {
      return total + item.quantity;
    }, 0);
  }

  function findByVariant(variantId) {
    return read().find((item) => item.variantId === String(variantId)) || null;
  }

  function validateAddition(variant, requestedQuantity, existingQuantity) {
    if (!variant || variant.is_active === false) {
      throw new CartError("This weight option is no longer available.", "VARIANT_UNAVAILABLE");
    }
    const quantity = Math.floor(Number(requestedQuantity)) || 1;
    if (quantity < 1) throw new CartError("Choose a quantity of at least 1.", "INVALID_QUANTITY");
    if (variant.trackStock && variant.stockQuantity <= 0) {
      throw new CartError("This weight is currently out of stock.", "OUT_OF_STOCK");
    }
    const total = (existingQuantity || 0) + quantity;
    if (total > MAX_QUANTITY) {
      throw new CartError(`You can add up to ${MAX_QUANTITY} of one weight option.`, "MAX_QUANTITY");
    }
    if (variant.trackStock && total > variant.stockQuantity) {
      throw new CartError(`Only ${variant.stockQuantity} available for this weight.`, "INSUFFICIENT_STOCK");
    }
    return total;
  }

  async function addProduct(product, variant, quantity) {
    if (!product || !variant) throw new CartError("Choose a spice and weight before adding to the cart.", "INVALID_ITEM");
    if (product.is_active === false) {
      throw new CartError("This product is no longer available.", "PRODUCT_UNAVAILABLE");
    }
    const items = read();
    const existing = items.find((item) => item.variantId === String(variant.id));
    const nextQuantity = validateAddition(variant, quantity, existing ? existing.quantity : 0);
    if (existing) {
      existing.quantity = nextQuantity;
      existing.priceCheck = Kayam.Catalogue.priceToken(variant.effectivePricePaise);
    } else {
      items.push({
        productId: String(product.id),
        variantId: String(variant.id),
        quantity: nextQuantity,
        priceCheck: Kayam.Catalogue.priceToken(variant.effectivePricePaise),
      });
    }
    write(items);
    return read().find((item) => item.variantId === String(variant.id));
  }

  async function addByIds(productId, variantId, quantity) {
    const data = await Kayam.Catalogue.loadAll();
    const product = data.products.find((entry) => entry.id === String(productId));
    if (!product) throw new CartError("This product is no longer available.", "PRODUCT_UNAVAILABLE");
    const variant = product.variants.find((entry) => entry.id === String(variantId));
    if (!variant) throw new CartError("This weight option is no longer available.", "VARIANT_UNAVAILABLE");
    return addProduct(product, variant, quantity || 1);
  }

  function setQuantity(variantId, quantity) {
    const items = read();
    const item = items.find((entry) => entry.variantId === String(variantId));
    if (!item) return [];
    const numeric = Math.floor(Number(quantity));
    if (!Number.isFinite(numeric) || numeric < 1) {
      throw new CartError("Quantity must be at least 1.", "INVALID_QUANTITY");
    }
    if (numeric > MAX_QUANTITY) {
      throw new CartError(`The maximum quantity is ${MAX_QUANTITY}.`, "MAX_QUANTITY");
    }
    item.quantity = numeric;
    return write(items);
  }

  function remove(variantId) {
    return write(read().filter((item) => item.variantId !== String(variantId)));
  }

  function clear() {
    return write([]);
  }

  function clearOrdered(variantIds) {
    const ordered = new Set((variantIds || []).map(String));
    if (!ordered.size) return read();
    return write(read().filter((item) => !ordered.has(item.variantId)));
  }

  function acceptCurrentPrices(lines) {
    const items = read();
    if (!lines || !lines.length) return items;
    const tokenByVariant = new Map();
    lines.forEach(function (line) {
      if (line && line.variant && line.available) {
        tokenByVariant.set(line.variant.id, Kayam.Catalogue.priceToken(line.variant.effectivePricePaise));
      }
    });
    items.forEach(function (item) {
      if (tokenByVariant.has(item.variantId)) {
        item.priceCheck = tokenByVariant.get(item.variantId);
      }
    });
    return write(items);
  }

  function getValidated(catalogue) {
    const items = read();
    const products = new Map((catalogue.products || []).map((product) => [product.id, product]));
    let subtotalPaise = 0;
    let hasPriceChanges = false;
    let hasUnavailable = false;
    let hasStockIssues = false;
    const lines = items.map(function (item) {
      const product = products.get(item.productId);
      const variant =
        product && (product.variants.find((entry) => entry.id === item.variantId) || null);
      let available = true;
      let reason = "";
      if (!product || product.is_active === false) {
        available = false;
        reason = "This product is no longer available.";
      } else if (!variant) {
        available = false;
        reason = "This weight option is no longer available.";
      } else if (!variant.inStock) {
        available = false;
        reason = "This weight is currently out of stock.";
      } else if (variant.trackStock && item.quantity > variant.stockQuantity) {
        available = false;
        reason = `Only ${variant.stockQuantity} available for this weight.`;
      }
      if (!available) hasUnavailable = true;
      const priceChanged = Boolean(
        variant && item.priceCheck !== Kayam.Catalogue.priceToken(variant.effectivePricePaise),
      );
      if (priceChanged) hasPriceChanges = true;
      const unitPricePaise = variant ? variant.effectivePricePaise : 0;
      const lineTotalPaise = available ? unitPricePaise * item.quantity : 0;
      if (available) subtotalPaise += lineTotalPaise;
      const maxQuantity = variant && variant.trackStock ? Math.max(0, Math.min(variant.stockQuantity, MAX_QUANTITY)) : MAX_QUANTITY;
      if (variant && item.quantity > maxQuantity) hasStockIssues = true;
      return {
        ...item,
        product,
        variant,
        available,
        reason,
        priceChanged,
        unitPricePaise,
        lineTotalPaise,
        maxQuantity,
      };
    });
    return {
      items,
      lines,
      subtotalPaise,
      hasPriceChanges,
      hasUnavailable,
      hasStockIssues,
      requiresReview: hasPriceChanges,
      canCheckout: lines.length > 0 && !hasUnavailable && !hasPriceChanges && !hasStockIssues,
      count: items.reduce((total, item) => total + item.quantity, 0),
    };
  }

  function increase(variantId) {
    return setQuantity(variantId, (findByVariant(variantId) || {}).quantity + 1 || 1);
  }

  function decrease(variantId) {
    const item = findByVariant(variantId);
    if (!item) return read();
    if (item.quantity <= 1) return remove(variantId);
    return setQuantity(variantId, item.quantity - 1);
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    if (Kayam.updateCartBadge) Kayam.updateCartBadge();
    document.dispatchEvent(new CustomEvent("kayam:cart-updated", { detail: { external: true } }));
  });

  Kayam.Cart = {
    STORAGE_KEY,
    MAX_QUANTITY,
    read,
    write,
    count,
    addProduct,
    addByIds,
    setQuantity,
    increase,
    decrease,
    remove,
    clear,
    clearOrdered,
    acceptCurrentPrices,
    getValidated,
    findByVariant,
    CartError,
  };
  window.KayamCart = Kayam.Cart;
})();
