(function () {
  "use strict";

  const Kayam = window.Kayam;
  let catalogue = null;
  let cartState = null;
  let loading = false;

  function lineMarkup(line) {
    const product = line.product;
    const variant = line.variant;
    const name = product ? product.name : "Unavailable product";
    const image = product ? product.imageUrl : Kayam.Catalogue.placeholder;
    const alt = product && product.primaryImage && product.primaryImage.altText
      ? product.primaryImage.altText
      : `${name} from KAYAM SPICES`;
    const productLink = product ? Kayam.Catalogue.productUrl(product) : "shop.html";
    const removeButton = `<button class="cart-line__remove" type="button" data-cart-remove="${Kayam.escapeHTML(
      line.variantId,
    )}" aria-label="Remove ${Kayam.escapeHTML(name)} from cart">${Kayam.icon("trash")}</button>`;
    const notices = [];
    if (line.reason) {
      notices.push(`<div class="cart-line__notice">${Kayam.escapeHTML(line.reason)} Remove this item or contact us for help.</div>`);
    }
    if (line.priceChanged && line.available) {
      notices.push(
        `<div class="cart-line__notice">The current price has changed. Review and accept the updated catalogue price before checkout.</div>`,
      );
    }
    if (variant && variant.trackStock && line.available && line.quantity > line.maxQuantity) {
      notices.push(`<div class="cart-line__notice">Only ${line.maxQuantity} available. Reduce the quantity to continue.</div>`);
    }
    const maxed = !line.available || line.quantity >= line.maxQuantity;
    const quantityControls = `<div class="quantity" aria-label="Quantity for ${Kayam.escapeHTML(name)}">
      <button type="button" data-cart-decrease="${Kayam.escapeHTML(line.variantId)}" aria-label="Decrease quantity for ${Kayam.escapeHTML(
        name,
      )}"${line.quantity <= 1 || !line.available ? " disabled" : ""}>${Kayam.icon("minus")}</button>
      <span class="cart-line__quantity" aria-live="polite">${line.quantity}</span>
      <button type="button" data-cart-increase="${Kayam.escapeHTML(line.variantId)}" aria-label="Increase quantity for ${Kayam.escapeHTML(
        name,
      )}"${maxed ? " disabled" : ""}>${Kayam.icon("plus")}</button>
    </div>`;
    return `<article class="cart-line${line.available ? "" : " cart-line--unavailable"}" data-line-variant="${Kayam.escapeHTML(
      line.variantId,
    )}">
      <a class="cart-line__image" href="${productLink}" aria-label="View ${Kayam.escapeHTML(name)}">
        <img src="${Kayam.escapeHTML(image)}" alt="${Kayam.escapeHTML(alt)}" width="180" height="220" loading="lazy" data-fallback="${Kayam.Catalogue.placeholder}">
      </a>
      <div class="cart-line__main">
        <div class="cart-line__top">
          <div>
            <h2 class="cart-line__title"><a href="${productLink}">${Kayam.escapeHTML(name)}</a></h2>
            <p class="cart-line__variant">${variant ? Kayam.escapeHTML(variant.label) : "Weight no longer available"}</p>
          </div>
          ${removeButton}
        </div>
        <div class="cart-line__bottom">
          ${quantityControls}
          <div class="cart-line__prices">
            <span class="cart-line__unit">${line.available ? `${Kayam.formatMoney(line.unitPricePaise, { decimals: true })} each` : "Not available"}</span>
            <span class="cart-line__total">${line.available ? Kayam.formatMoney(line.lineTotalPaise, { decimals: true }) : "—"}</span>
          </div>
        </div>
        ${notices.join("")}
      </div>
    </article>`;
  }

  function summaryMarkup() {
    const canCheckout = cartState.canCheckout;
    const blocked = cartState.hasUnavailable
      ? "Remove unavailable items to continue."
      : cartState.hasPriceChanges
        ? "Review and accept the updated prices to continue."
        : cartState.hasStockIssues
          ? "Adjust quantities to match available stock."
          : "";
    const action = canCheckout
      ? '<a class="btn btn--dark btn--block" href="checkout.html">Continue to checkout</a>'
      : `<span class="btn btn--dark btn--block" aria-disabled="true" style="opacity: .5; cursor: not-allowed;">Continue to checkout</span>
         <p class="summary-note" role="status">${Kayam.escapeHTML(blocked)}</p>`;
    return `<aside class="summary-card" aria-label="Cart summary">
      <h2 class="summary-card__title">Cart summary</h2>
      <dl class="summary-rows">
        <div class="summary-row"><dt>Subtotal (${cartState.count} ${
          cartState.count === 1 ? "item" : "items"
        })</dt><dd>${Kayam.formatMoney(cartState.subtotalPaise, { decimals: true })}</dd></div>
        <div class="summary-row"><dt>Delivery charges</dt><dd>To be confirmed</dd></div>
        <div class="summary-row summary-row--total"><dt>Final payable</dt><dd>Confirmed on WhatsApp</dd></div>
      </dl>
      <p class="summary-note">Delivery availability, delivery charges, final payable amount, and payment arrangements will be confirmed by KAYAM SPICES through WhatsApp. Payment is not collected on this website.</p>
      ${action}
      <a class="btn btn--outline btn--block" style="margin-top: .5rem;" href="shop.html">Continue shopping</a>
      <div class="trust-line">${Kayam.icon("shield")}<span>Your cart is saved in this browser. Prices and availability are rechecked before checkout.</span></div>
    </aside>`;
  }

  function render() {
    const container = document.getElementById("cart-content");
    if (!container) return;
    if (!cartState || !cartState.lines.length) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("cart")}</span>
        <h1>Your cart is empty</h1>
        <p>Explore the KAYAM SPICES pantry and add the spices you need for your kitchen.</p>
        <div class="empty-state__actions">
          <a class="btn" href="shop.html">Browse the pantry</a>
          <a class="btn btn--outline" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Ask a question</a>
        </div>
      </div>`;
      return;
    }
    const alerts = [];
    if (cartState.hasUnavailable) {
      alerts.push(`<div class="alert alert--warning" role="status">
        <span aria-hidden="true">${Kayam.icon("info")}</span>
        <div><strong class="alert__title">Some items need attention</strong>One or more products or weights are unavailable. Remove them to proceed, or contact KAYAM SPICES for help.</div>
      </div>`);
    }
    if (cartState.hasPriceChanges) {
      alerts.push(`<div class="alert alert--warning" role="status">
        <span aria-hidden="true">${Kayam.icon("info")}</span>
        <div><strong class="alert__title">Prices have changed</strong>The current catalogue prices are shown below. Review them and accept the updated prices before checkout.
        <button class="btn btn--small btn--outline" type="button" data-accept-prices style="margin-top: .6rem;">Accept updated prices</button></div>
      </div>`);
    }
    container.innerHTML = `<div class="cart-layout">
      <div>
        ${alerts.length ? `<div class="stack" style="--stack-space: .8rem; margin-bottom: 1rem;">${alerts.join("")}</div>` : ""}
        <div class="cart-list">${cartState.lines.map(lineMarkup).join("")}</div>
        <div class="cluster" style="margin-top: 1rem; justify-content: space-between;">
          <a class="text-link" href="shop.html">Continue shopping</a>
          <span class="muted" style="font-size: .7rem;">${cartState.count} ${cartState.count === 1 ? "item" : "items"} in your cart</span>
        </div>
      </div>
      ${summaryMarkup()}
    </div>`;
    bindLineActions(container);
    const accept = container.querySelector("[data-accept-prices]");
    if (accept) {
      accept.addEventListener("click", function () {
        Kayam.Cart.acceptCurrentPrices(cartState.lines);
        Kayam.showToast("Updated prices accepted. Review your cart before checkout.", "success");
        render();
      });
    }
  }

  function bindLineActions(container) {
    container.querySelectorAll("[data-cart-increase]").forEach(function (button) {
      button.addEventListener("click", function () {
        const line = cartState.lines.find((entry) => entry.variantId === button.dataset.cartIncrease);
        if (!line) return;
        const next = Math.min(line.quantity + 1, line.maxQuantity);
        if (next === line.quantity) return;
        try {
          Kayam.Cart.setQuantity(line.variantId, next);
          cartState = Kayam.Cart.getValidated(catalogue);
          render();
        } catch (error) {
          Kayam.showToast(error.message, "error");
        }
      });
    });
    container.querySelectorAll("[data-cart-decrease]").forEach(function (button) {
      button.addEventListener("click", function () {
        const line = cartState.lines.find((entry) => entry.variantId === button.dataset.cartDecrease);
        if (!line) return;
        const next = line.quantity - 1;
        try {
          if (next < 1) {
            Kayam.Cart.remove(line.variantId);
          } else {
            Kayam.Cart.setQuantity(line.variantId, next);
          }
          cartState = Kayam.Cart.getValidated(catalogue);
          render();
        } catch (error) {
          Kayam.showToast(error.message, "error");
        }
      });
    });
    container.querySelectorAll("[data-cart-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
        Kayam.Cart.remove(button.dataset.cartRemove);
        cartState = Kayam.Cart.getValidated(catalogue);
        render();
        Kayam.showToast("Item removed from your cart.", "info");
      });
    });
  }

  function renderError(error) {
    const container = document.getElementById("cart-content");
    if (!container) return;
    const isConfig = error && error.code === "NOT_CONFIGURED";
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">${Kayam.icon("info")}</span>
      <h1>We cannot check your cart right now</h1>
      <p>${Kayam.escapeHTML(
        isConfig
          ? "The online catalogue is being connected. Please contact KAYAM SPICES on WhatsApp for assistance with your order."
          : "The catalogue could not be loaded, so current prices and availability could not be confirmed. Your cart has not been changed.",
      )}</p>
      <div class="empty-state__actions">
        <button class="btn" type="button" data-retry-cart>Try again</button>
        <a class="btn btn--outline" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Contact us</a>
      </div>
    </div>`;
    const retry = container.querySelector("[data-retry-cart]");
    if (retry) {
      retry.addEventListener("click", function () {
        Kayam.Catalogue.invalidateCache();
        loadCart(true);
      });
    }
  }

  async function loadCart(force) {
    if (loading) return;
    loading = true;
    try {
      if (!Kayam.Cart.read().length) {
        cartState = { lines: [], count: 0, subtotalPaise: 0, canCheckout: false };
        render();
        return;
      }
      if (!catalogue || force) {
        catalogue = await Kayam.Catalogue.loadAll({ force: Boolean(force) });
      }
      cartState = Kayam.Cart.getValidated(catalogue);
      render();
    } catch (error) {
      console.error(error);
      renderError(error);
    } finally {
      loading = false;
    }
  }

  document.addEventListener("kayam:cart-updated", function (event) {
    if (event.detail && event.detail.external) {
      loadCart(true);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadCart(true);
    });
  } else {
    loadCart(true);
  }
})();
