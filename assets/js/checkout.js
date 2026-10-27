(function () {
  "use strict";

  const Kayam = window.Kayam;
  const SUBMISSION_KEY = "kayam.checkout.submission.v1";
  const LAST_ORDER_KEY = "kayam.lastOrder";
  let catalogue = null;
  let cartState = null;
  let currentSignature = "";
  let submitting = false;

  function makeUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (character) {
      const random = (Math.random() * 16) | 0;
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function cartSignature(lines) {
    return lines
      .map((line) => `${line.variantId}:${line.quantity}`)
      .sort()
      .join("|");
  }

  function readJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function clearCompletedCheckout(variantIds) {
    const ids = Array.isArray(variantIds) ? variantIds.filter(Boolean) : [];
    if (ids.length && window.KayamCart) {
      window.KayamCart.clearOrdered(ids);
    }
    try {
      window.localStorage.removeItem(SUBMISSION_KEY);
    } catch (error) {
      return;
    }
  }

  function getSubmissionKey(signature) {
    const existing = readJson(SUBMISSION_KEY);
    if (
      existing &&
      existing.signature === signature &&
      typeof existing.key === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing.key)
    ) {
      return existing.key;
    }
    const key = makeUuid();
    try {
      window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify({ key, signature }));
    } catch (error) {
      return key;
    }
    return key;
  }

  function summaryMarkup() {
    return `<aside class="summary-card checkout-summary" aria-label="Order summary">
      <h2 class="summary-card__title">Order summary</h2>
      <div class="checkout-summary__items">
        ${cartState.lines
          .map(function (line) {
            return `<div class="checkout-item">
              <div class="checkout-item__image"><img src="${Kayam.escapeHTML(
                line.product.imageUrl,
              )}" alt="" width="92" height="112" loading="lazy" data-fallback="${Kayam.Catalogue.placeholder}"></div>
              <div>
                <p class="checkout-item__name">${Kayam.escapeHTML(line.product.name)}</p>
                <p class="checkout-item__variant">${Kayam.escapeHTML(line.variant.label)} · Qty ${line.quantity}</p>
              </div>
              <span class="checkout-item__price">${Kayam.formatMoney(line.lineTotalPaise, { decimals: true })}</span>
            </div>`;
          })
          .join("")}
      </div>
      <dl class="summary-rows">
        <div class="summary-row"><dt>Subtotal</dt><dd>${Kayam.formatMoney(cartState.subtotalPaise, { decimals: true })}</dd></div>
        <div class="summary-row"><dt>Delivery charges</dt><dd>To be confirmed</dd></div>
        <div class="summary-row summary-row--total"><dt>Final payable</dt><dd>Pending confirmation</dd></div>
      </dl>
      <p class="summary-note">Delivery availability, delivery charges, final payable amount, and payment arrangements will be confirmed by KAYAM SPICES through WhatsApp.</p>
      <a class="text-link" href="cart.html" style="margin-top: 1rem; display: inline-flex;">Edit cart</a>
      <div class="trust-line">${Kayam.icon("shield")}<span>No payment is collected on this website. Your order is saved as pending confirmation before WhatsApp opens.</span></div>
    </aside>`;
  }

  function formMarkup() {
    return `<div class="checkout-layout">
      <div class="checkout-main">
        <div id="checkout-alert" aria-live="assertive"></div>
        <form id="checkout-form" novalidate>
          <section class="form-section" aria-labelledby="contact-title">
            <div class="form-section__head">
              <span class="form-section__number" aria-hidden="true">1</span>
              <h2 class="form-section__title" id="contact-title">Contact details</h2>
            </div>
            <div class="form-grid form-grid--two">
              <div class="field field--full" data-field="name">
                <label class="field__label" for="checkout-name">Full name <span class="required" aria-hidden="true">*</span></label>
                <input class="input" id="checkout-name" name="name" type="text" autocomplete="name" required maxlength="120" aria-describedby="checkout-name-error">
                <p class="field__error" id="checkout-name-error"></p>
              </div>
              <div class="field field--full" data-field="phone">
                <label class="field__label" for="checkout-phone">Phone number <span class="required" aria-hidden="true">*</span></label>
                <input class="input" id="checkout-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="24" placeholder="+91" aria-describedby="checkout-phone-hint checkout-phone-error">
                <p class="field__hint" id="checkout-phone-hint">Use the number KAYAM SPICES should use for WhatsApp confirmation.</p>
                <p class="field__error" id="checkout-phone-error"></p>
              </div>
            </div>
          </section>
          <section class="form-section" aria-labelledby="delivery-title">
            <div class="form-section__head">
              <span class="form-section__number" aria-hidden="true">2</span>
              <h2 class="form-section__title" id="delivery-title">Delivery address</h2>
            </div>
            <div class="field" data-field="address">
              <label class="field__label" for="checkout-address">Full delivery address <span class="required" aria-hidden="true">*</span></label>
              <textarea class="textarea" id="checkout-address" name="address" autocomplete="street-address" required maxlength="1000" rows="5" placeholder="House or flat number, street, area, city, state, and PIN code" aria-describedby="checkout-address-hint checkout-address-error"></textarea>
              <p class="field__hint" id="checkout-address-hint">Include landmarks if they help. Delivery availability is confirmed after the order is sent.</p>
              <p class="field__error" id="checkout-address-error"></p>
            </div>
          </section>
          <section class="form-section" aria-labelledby="review-title">
            <div class="form-section__head">
              <span class="form-section__number" aria-hidden="true">3</span>
              <h2 class="form-section__title" id="review-title">Review &amp; save</h2>
            </div>
            <div class="inline-note">
              ${Kayam.icon("info")}
              <div>Delivery availability, delivery charges, final payable amount, and payment arrangements will be confirmed by KAYAM SPICES through WhatsApp. Your order will be saved with a pending-confirmation status. Payment is arranged separately.</div>
            </div>
            <div class="stack" style="margin-top: 1rem;">
              <button class="btn btn--dark btn--large btn--block" type="submit" id="place-order-button">Save order &amp; continue to WhatsApp</button>
              <p class="field__hint" style="text-align: center;">WhatsApp opens only after the order has been saved successfully.</p>
            </div>
          </section>
        </form>
      </div>
      ${summaryMarkup()}
    </div>`;
  }

  function bindForm() {
    const form = document.getElementById("checkout-form");
    if (!form) return;
    const fields = {
      name: document.getElementById("checkout-name"),
      phone: document.getElementById("checkout-phone"),
      address: document.getElementById("checkout-address"),
    };
    Object.keys(fields).forEach(function (key) {
      const input = fields[key];
      if (!input) return;
      input.addEventListener("input", function () {
        clearFieldError(key);
      });
      input.addEventListener("blur", function () {
        validateField(key, input.value);
      });
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      handleSubmit(fields);
    });
  }

  function validateField(name, value) {
    const trimmed = String(value || "").trim();
    if (name === "name") {
      if (trimmed.length < 2) return "Enter your full name.";
      if (trimmed.length > 120) return "Please keep your name under 120 characters.";
      return "";
    }
    if (name === "phone") {
      const digits = trimmed.replace(/\D/g, "");
      if (!trimmed) return "Enter your phone number.";
      if (!/^\+?[\d\s().-]{7,24}$/.test(trimmed)) return "Enter a valid phone number.";
      if (digits.length < 7 || digits.length > 15) return "Enter a phone number with 7 to 15 digits.";
      return "";
    }
    if (name === "address") {
      if (trimmed.length < 10) return "Enter your full delivery address.";
      if (trimmed.length > 1000) return "Please keep the address under 1,000 characters.";
      return "";
    }
    return "";
  }

  function setFieldError(name, message) {
    const field = document.querySelector(`[data-field="${name}"]`);
    const input = document.querySelector(`[data-field="${name}"] input, [data-field="${name}"] textarea`);
    const error = document.getElementById(`checkout-${name}-error`);
    if (field) field.classList.toggle("is-invalid", Boolean(message));
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message || "";
  }

  function clearFieldError(name) {
    setFieldError(name, "");
  }

  function validateForm(fields) {
    let firstInvalid = null;
    Object.keys(fields).forEach(function (name) {
      const input = fields[name];
      const message = validateField(name, input ? input.value : "");
      setFieldError(name, message);
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function showAlert(message, type) {
    const container = document.getElementById("checkout-alert");
    if (!container) return;
    container.innerHTML = `<div class="alert alert--${type || "error"}" role="alert">
      <span aria-hidden="true">${Kayam.icon(type === "success" ? "check" : type === "warning" ? "info" : "alert")}</span>
      <div>${message}</div>
    </div>`;
    container.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setSubmitting(value, label) {
    const button = document.getElementById("place-order-button");
    if (!button) return;
    button.disabled = value;
    if (value) {
      button.setAttribute("aria-busy", "true");
      button.textContent = label || "Saving your order…";
    } else {
      button.removeAttribute("aria-busy");
      button.textContent = "Save order & continue to WhatsApp";
    }
  }

  function handleSubmit(fields) {
    if (submitting) return;
    if (!validateForm(fields)) return;
    submitting = true;
    setSubmitting(true);
    const formData = {
      name: fields.name.value.trim(),
      phone: fields.phone.value.trim(),
      address: fields.address.value.trim(),
    };
    saveOrder(formData);
  }

  function friendlyRpcError(error) {
    const message = String((error && error.message) || "").toUpperCase();
    if (message.includes("PRICE_CHANGED")) {
      return {
        type: "review",
        title: "Prices have changed",
        text: "The catalogue prices changed while you were checking out. Review your cart and accept the current prices before placing the order.",
      };
    }
    if (message.includes("ITEM_UNAVAILABLE")) {
      return {
        type: "review",
        title: "A selected item is unavailable",
        text: "One or more products or weights are no longer available. Review your cart before continuing.",
      };
    }
    if (message.includes("INSUFFICIENT_STOCK")) {
      return {
        type: "review",
        title: "Stock has changed",
        text: "One or more selected weights do not have enough stock. Review the quantities in your cart.",
      };
    }
    if (message.includes("INVALID_")) {
      return {
        type: "review",
        title: "Please review your cart",
        text: "The order details could not be validated. Return to the cart and check each item and quantity.",
      };
    }
    return {
      type: "error",
      title: "Order not saved",
      text: "We could not save your order. Your cart has been kept. Please check your connection and try again. If the problem continues, contact KAYAM SPICES on WhatsApp.",
    };
  }

  async function saveOrder(customer) {
    let savedReference = "";
    let savedVariantIds = [];
    try {
      const freshCatalogue = await Kayam.Catalogue.loadAll({ force: true });
      const freshState = Kayam.Cart.getValidated(freshCatalogue);
      const freshSignature = cartSignature(freshState.lines);
      if (freshSignature !== currentSignature) {
        catalogue = freshCatalogue;
        cartState = freshState;
        renderBlocked({
          title: "Your cart has changed",
          text: "The cart changed in another tab or window. Review the latest cart before placing the order.",
          link: true,
        });
        submitting = false;
        return;
      }
      if (freshState.hasPriceChanges || !freshState.canCheckout || !freshState.lines.length) {
        catalogue = freshCatalogue;
        cartState = freshState;
        renderBlocked({
          title: freshState.hasPriceChanges ? "Prices have changed" : "Your cart needs attention",
          text: freshState.hasPriceChanges
            ? "The current catalogue prices are different from the prices you reviewed. Return to the cart, review the updated prices, and accept them before checking out."
            : "One or more items are no longer available in the selected quantity. Return to the cart to review it before continuing.",
          link: true,
        });
        submitting = false;
        return;
      }
      cartState = freshState;
      const signature = cartSignature(freshState.lines);
      const submissionKey = getSubmissionKey(signature);
      const items = freshState.lines.map(function (line) {
        return {
          product_id: line.product.id,
          variant_id: line.variant.id,
          quantity: line.quantity,
        };
      });
      const expectedPrices = {};
      freshState.lines.forEach(function (line) {
        expectedPrices[line.variant.id] = Kayam.paiseToDecimal(line.unitPricePaise);
      });
      const { data, error } = await window.KayamDB.getClient().rpc("create_order", {
        p_customer_name: customer.name,
        p_customer_phone: customer.phone,
        p_delivery_address: customer.address,
        p_items: items,
        p_submission_key: submissionKey,
        p_expected_prices: expectedPrices,
      });
      if (error) {
        const friendly = friendlyRpcError(error);
        console.error("Order creation failed", error);
        if (friendly.type === "review") {
          Kayam.Catalogue.invalidateCache();
          const latestCatalogue = await Kayam.Catalogue.loadAll({ force: true });
          catalogue = latestCatalogue;
          cartState = Kayam.Cart.getValidated(latestCatalogue);
          renderBlocked({ title: friendly.title, text: friendly.text, link: true });
        } else {
          showAlert(`<strong>${Kayam.escapeHTML(friendly.title)}</strong>${Kayam.escapeHTML(friendly.text)}`, "error");
          setSubmitting(false);
        }
        submitting = false;
        return;
      }
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (!result || !result.order_reference) {
        throw new Error("The order response did not include a reference.");
      }
      savedReference = String(result.order_reference);
      savedVariantIds = freshState.lines.map((line) => line.variant.id);
      const savedItems =
        Array.isArray(result.items) && result.items.length
          ? result.items.map(function (item) {
              return {
                productName: item.product_name_snapshot,
                variantLabel: item.variant_snapshot,
                quantity: Number(item.quantity),
                unitPricePaise: Kayam.moneyToPaise(item.unit_price_snapshot),
                lineTotalPaise: Kayam.moneyToPaise(item.line_total),
                variantId: item.variant_id,
              };
            })
          : freshState.lines.map(function (line) {
              return {
                productName: line.product.name,
                variantLabel: line.variant.label,
                quantity: line.quantity,
                unitPricePaise: line.unitPricePaise,
                lineTotalPaise: line.lineTotalPaise,
                variantId: line.variant.id,
              };
            });
      const order = {
        orderReference: result.order_reference,
        orderId: result.order_id,
        status: result.status || "pending_confirmation",
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        items: savedItems,
        orderedVariantIds: savedItems.map((item) => item.variantId).filter(Boolean),
        subtotalPaise: Kayam.moneyToPaise(result.subtotal),
        shippingChargePaise:
          result.shipping_charge === null || result.shipping_charge === undefined
            ? null
            : Kayam.moneyToPaise(result.shipping_charge),
        finalTotalPaise:
          result.final_total === null || result.final_total === undefined
            ? null
            : Kayam.moneyToPaise(result.final_total),
        createdAt: result.created_at || new Date().toISOString(),
        cartSignature: signature,
      };
      const saved = Kayam.session.set(LAST_ORDER_KEY, JSON.stringify(order));
      const submitButton = document.getElementById("place-order-button");
      if (submitButton) {
        submitButton.textContent = `Order saved · ${result.order_reference}`;
        submitButton.setAttribute("aria-busy", "true");
      }
      if (!saved) {
        clearCompletedCheckout(order.orderedVariantIds);
        renderInlineConfirmation(order);
        return;
      }
      window.location.assign(
        `order-confirmation.html?ref=${encodeURIComponent(result.order_reference)}&handoff=1`,
      );
    } catch (error) {
      console.error(error);
      if (savedReference) {
        clearCompletedCheckout(savedVariantIds);
        renderSavedRecovery(savedReference);
        setSubmitting(false);
        submitting = false;
        return;
      }
      const message =
        error && error.code === "NOT_CONFIGURED"
          ? "The order system is not connected. Please contact KAYAM SPICES on WhatsApp."
          : "We could not confirm the order. Your cart has been kept. Check your connection and try again. Duplicate protection is active if the order was already saved.";
      showAlert(`<strong>Order not saved</strong>${Kayam.escapeHTML(message)}`, "error");
      setSubmitting(false);
      submitting = false;
    }
  }

  function renderBlocked(options) {
    const container = document.getElementById("checkout-content");
    if (!container) return;
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">${Kayam.icon("info")}</span>
      <h1>${Kayam.escapeHTML(options.title)}</h1>
      <p>${Kayam.escapeHTML(options.text)}</p>
      <div class="empty-state__actions">
        <a class="btn" href="${options.link ? "cart.html" : "shop.html"}">${options.link ? "Review cart" : "Browse the pantry"}</a>
        <a class="btn btn--outline" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Need help?</a>
      </div>
    </div>`;
  }

  function renderInlineConfirmation(order) {
    const container = document.getElementById("checkout-content");
    if (!container) return;
    container.innerHTML = `<div class="order-success">
      <span class="order-success__mark">${Kayam.icon("check")}</span>
      <p class="order-success__ref">Order saved · ${Kayam.escapeHTML(order.orderReference)}</p>
      <h1>Your order is pending confirmation.</h1>
      <p class="order-success__lede">We could not keep the confirmation details in this browser session, but your order was saved and your cart has been cleared for the saved items. Please open WhatsApp to send the order reference to KAYAM SPICES.</p>
      <div class="order-actions">
        <a class="btn btn--dark btn--large" id="inline-whatsapp-link" href="${Kayam.whatsapp.buildWhatsAppUrl(
          Kayam.whatsapp.buildOrderMessage(order),
        )}" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Open WhatsApp</a>
        <a class="btn btn--outline btn--large" href="contact.html">Contact KAYAM SPICES</a>
      </div>
      <p class="order-warning">Delivery availability, delivery charges, final payable amount, and payment arrangements must be confirmed by KAYAM SPICES. No payment is collected on this website.</p>
    </div>`;
  }

  function renderSavedRecovery(reference) {
    const container = document.getElementById("checkout-content");
    if (!container) return;
    const number = String(Kayam.config.WHATSAPP_NUMBER || "917888060231").replace(/\D/g, "");
    const message = `KAYAM SPICES\n\nHello, my order ${reference} was saved, but I could not open the confirmation page. Please confirm my order.\n\nOrder reference: ${reference}`;
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    container.innerHTML = `<div class="order-success">
      <span class="order-success__mark">${Kayam.icon("check")}</span>
      <p class="order-success__ref">Order saved · ${Kayam.escapeHTML(reference)}</p>
      <h1>Your order was saved.</h1>
      <p class="order-success__lede">We could not prepare the confirmation page in this browser, but your order was recorded. Your cart has been cleared for the saved items. Send the order reference to KAYAM SPICES on WhatsApp so they can confirm delivery and payment.</p>
      <div class="order-actions">
        <a class="btn btn--dark btn--large" href="${Kayam.escapeHTML(whatsappUrl)}" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Open WhatsApp</a>
        <a class="btn btn--outline btn--large" href="contact.html">Contact KAYAM SPICES</a>
      </div>
      <p class="order-warning">Delivery availability, delivery charges, final payable amount, and payment arrangements must be confirmed by KAYAM SPICES. No payment is collected on this website.</p>
    </div>`;
  }

  function renderEmpty() {
    const container = document.getElementById("checkout-content");
    if (!container) return;
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">${Kayam.icon("cart")}</span>
      <h1>Your cart is empty</h1>
      <p>Add spices to your cart before beginning checkout.</p>
      <a class="btn" href="shop.html">Browse the pantry</a>
    </div>`;
  }

  function renderError(error) {
    const container = document.getElementById("checkout-content");
    if (!container) return;
    const isConfig = error && error.code === "NOT_CONFIGURED";
    container.innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">${Kayam.icon("info")}</span>
      <h1>Checkout is unavailable</h1>
      <p>${Kayam.escapeHTML(
        isConfig
          ? "The order system is being connected. Please contact KAYAM SPICES on WhatsApp to place your order."
          : "We could not check the current catalogue. Your cart has not been changed.",
      )}</p>
      <div class="empty-state__actions">
        <button class="btn" type="button" data-retry-checkout>Try again</button>
        <a class="btn btn--outline" href="cart.html">Back to cart</a>
      </div>
    </div>`;
    const retry = container.querySelector("[data-retry-checkout]");
    if (retry) {
      retry.addEventListener("click", function () {
        Kayam.Catalogue.invalidateCache();
        init();
      });
    }
  }

  async function init() {
    submitting = false;
    const container = document.getElementById("checkout-content");
    if (!container) return;
    if (!Kayam.Cart.read().length) {
      renderEmpty();
      return;
    }
    try {
      catalogue = await Kayam.Catalogue.loadAll({ force: true });
      cartState = Kayam.Cart.getValidated(catalogue);
      if (!cartState.lines.length) {
        renderEmpty();
        return;
      }
      if (!cartState.canCheckout) {
        renderBlocked({
          title: cartState.hasPriceChanges ? "Please review the updated prices" : "Your cart needs attention",
          text: cartState.hasPriceChanges
            ? "Prices in the current catalogue differ from what you last reviewed. Return to the cart, review and accept the current prices, then continue."
            : "One or more items are unavailable or exceed the available stock. Return to the cart to adjust your selection.",
          link: true,
        });
        return;
      }
      currentSignature = cartSignature(cartState.lines);
      container.innerHTML = formMarkup();
      bindForm();
    } catch (error) {
      console.error(error);
      renderError(error);
    }
  }

  document.addEventListener("kayam:cart-updated", function (event) {
    if (!event.detail || !event.detail.external) return;
    if (submitting) return;
    init();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
