(function () {
  "use strict";

  const Kayam = window.Kayam;
  const LAST_ORDER_KEY = "kayam.lastOrder";
  const SUBMISSION_KEY = "kayam.checkout.submission.v1";
  const reference = new URLSearchParams(window.location.search).get("ref") || "";
  const handoff = new URLSearchParams(window.location.search).get("handoff") === "1";
  let order = null;

  function readOrder() {
    try {
      const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.orderReference) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function clearCompletedCart() {
    if (!order) return;
    const ids = Array.isArray(order.orderedVariantIds) && order.orderedVariantIds.length
      ? order.orderedVariantIds
      : (order.items || []).map((item) => item.variantId).filter(Boolean);
    if (ids.length && window.KayamCart) {
      window.KayamCart.clearOrdered(ids);
    }
    try {
      window.localStorage.removeItem(SUBMISSION_KEY);
    } catch (error) {
      return;
    }
  }

  function orderItemMarkup(item) {
    return `<li class="order-item">
      <div>
        <p class="order-item__name">${Kayam.escapeHTML(item.productName)}</p>
        <p class="order-item__meta">${Kayam.escapeHTML(item.variantLabel)} · Qty ${item.quantity} · ${Kayam.formatMoney(
          item.unitPricePaise,
          { decimals: true },
        )} each</p>
      </div>
      <span class="order-item__price">${Kayam.formatMoney(item.lineTotalPaise, { decimals: true })}</span>
    </li>`;
  }

  function render() {
    const container = document.getElementById("confirmation-content");
    if (!container) return;
    order = readOrder();
    if (order && reference && order.orderReference !== reference) order = null;
    if (!order && !reference) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("orders")}</span>
        <h1>No order selected</h1>
        <p>This page shows the order you just saved. Start from the shop or contact KAYAM SPICES if you need help with an existing order.</p>
        <div class="empty-state__actions">
          <a class="btn" href="shop.html">Browse the pantry</a>
          <a class="btn btn--outline" href="contact.html">Contact us</a>
        </div>
      </div>`;
      return;
    }
    if (!order) {
      renderUnavailable(reference);
      return;
    }
    clearCompletedCart();
    document.title = `Order ${order.orderReference} | KAYAM SPICES`;
    const whatsappUrl = Kayam.whatsapp.buildWhatsAppUrl(Kayam.whatsapp.buildOrderMessage(order));
    const shipping =
      order.shippingChargePaise === null || order.shippingChargePaise === undefined
        ? "To be confirmed"
        : Kayam.formatMoney(order.shippingChargePaise, { decimals: true });
    const finalTotal =
      order.finalTotalPaise === null || order.finalTotalPaise === undefined
        ? "Pending confirmation"
        : Kayam.formatMoney(order.finalTotalPaise, { decimals: true });
    container.innerHTML = `<div class="order-success">
      <span class="order-success__mark" aria-hidden="true">${Kayam.icon("check")}</span>
      <p class="order-success__ref">Order reference <strong>${Kayam.escapeHTML(order.orderReference)}</strong></p>
      <h1>Order saved.<br>Awaiting confirmation.</h1>
      <p class="order-success__lede">Your order has been saved with KAYAM SPICES and is pending business confirmation. Delivery availability, charges, final payable amount, and payment are arranged directly on WhatsApp.</p>
      <div class="badge badge--warning"><span class="status-dot" aria-hidden="true"></span> Pending confirmation</div>

      <div id="handoff-status" class="alert alert--info" role="status" style="margin-top: 1.5rem; text-align: left;">
        <span aria-hidden="true">${Kayam.icon("whatsapp")}</span>
        <div><strong class="alert__title">Send your order on WhatsApp</strong>Opening WhatsApp does not send the message by itself. Press Send in WhatsApp to deliver your order reference and details to KAYAM SPICES. If WhatsApp does not open, use the button below. Your saved order will not be duplicated.</div>
      </div>

      <div class="order-actions">
        <a class="btn btn--dark btn--large" id="whatsapp-order-link" href="${Kayam.escapeHTML(
          whatsappUrl,
        )}" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Open WhatsApp order</a>
        <button class="btn btn--outline btn--large" type="button" id="copy-reference-button">Copy order reference</button>
      </div>

      <div class="order-panels">
        <section class="order-panel" aria-labelledby="confirmation-customer-title">
          <h2 id="confirmation-customer-title">Your details</h2>
          <dl class="detail-list">
            <div><dt>Name</dt><dd>${Kayam.escapeHTML(order.customerName)}</dd></div>
            <div><dt>Phone</dt><dd>${Kayam.escapeHTML(order.customerPhone)}</dd></div>
          </dl>
          <div style="margin-top: 1rem;">
            <p class="field__label">Delivery address</p>
            <p class="muted" style="margin-top: .3rem; font-size: .8rem; white-space: pre-line;">${Kayam.escapeHTML(
              order.customerAddress,
            )}</p>
          </div>
        </section>
        <section class="order-panel" aria-labelledby="confirmation-order-title">
          <h2 id="confirmation-order-title">Order summary</h2>
          <ul class="order-items">${(order.items || []).map(orderItemMarkup).join("")}</ul>
          <dl class="summary-rows" style="margin-top: 1rem;">
            <div class="summary-row"><dt>Subtotal</dt><dd>${Kayam.formatMoney(order.subtotalPaise, { decimals: true })}</dd></div>
            <div class="summary-row"><dt>Delivery charges</dt><dd>${shipping}</dd></div>
            <div class="summary-row summary-row--total"><dt>Final payable</dt><dd>${finalTotal}</dd></div>
          </dl>
          <p class="summary-note">No payment is collected on this website. Payment is arranged separately with KAYAM SPICES after confirmation.</p>
        </section>
        <section class="order-panel" style="grid-column: 1 / -1;" aria-labelledby="confirmation-next-title">
          <h2 id="confirmation-next-title">What happens next</h2>
          <div class="detail-list">
            <div><dt>Order status</dt><dd>Pending confirmation</dd></div>
            <div><dt>Order saved</dt><dd>${Kayam.formatDate(order.createdAt, true)}</dd></div>
            <div><dt>Delivery</dt><dd>To be confirmed on WhatsApp</dd></div>
            <div><dt>Payment</dt><dd>Arranged separately</dd></div>
          </div>
          <p class="order-warning">A saved order is not a business confirmation. KAYAM SPICES will confirm delivery availability, delivery charges, the final payable amount, and payment arrangements. If WhatsApp does not open, send the order reference <strong>${Kayam.escapeHTML(
            order.orderReference,
          )}</strong> to <a href="https://wa.me/917888060231" target="_blank" rel="noopener" style="text-decoration: underline; text-decoration-color: var(--gold);">+91 788 806 0231</a> or email <a href="mailto:anikhindi.suchi@gmail.com" style="text-decoration: underline; text-decoration-color: var(--gold);">anikhindi.suchi@gmail.com</a>.</p>
        </section>
      </div>

      <div class="order-actions" style="margin-top: 1.5rem;">
        <a class="btn btn--outline" href="shop.html">Continue shopping</a>
        <a class="btn btn--outline" href="contact.html">Contact KAYAM SPICES</a>
      </div>
    </div>`;

    bindActions(whatsappUrl);
    if (handoff) attemptHandoff(whatsappUrl);
  }

  function bindActions(whatsappUrl) {
    const copy = document.getElementById("copy-reference-button");
    if (copy) {
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(order.orderReference);
          Kayam.showToast("Order reference copied.", "success");
        } catch (error) {
          Kayam.showToast(`Order reference: ${order.orderReference}`, "info", 7000);
        }
      });
    }
    const link = document.getElementById("whatsapp-order-link");
    if (link) {
      link.addEventListener("click", function () {
        const status = document.getElementById("handoff-status");
        if (status) {
          status.innerHTML = `<span aria-hidden="true">${Kayam.icon("whatsapp")}</span><div><strong class="alert__title">WhatsApp opened in a new tab</strong>Press Send in WhatsApp to send your order details. If a new tab did not appear, allow pop-ups for this site and use the WhatsApp order button above.</div>`;
        }
      });
    }
  }

  function attemptHandoff(whatsappUrl) {
    const attemptKey = `kayam.handoff.attempted.${order.orderReference}`;
    if (Kayam.session.get(attemptKey, "0") === "1") return;
    Kayam.session.set(attemptKey, "1");
    window.setTimeout(function () {
      const status = document.getElementById("handoff-status");
      let opened = null;
      try {
        opened = window.open(whatsappUrl, "_blank");
        if (opened) opened.opener = null;
      } catch (error) {
        opened = null;
      }
      if (!status) return;
      if (opened) {
        status.innerHTML = `<span aria-hidden="true">${Kayam.icon("whatsapp")}</span><div><strong class="alert__title">A WhatsApp tab has been opened</strong>Press Send in WhatsApp to send your order details. If no tab appeared, use the WhatsApp order button above.</div>`;
      } else {
        status.innerHTML = `<span aria-hidden="true">${Kayam.icon("info")}</span><div><strong class="alert__title">Automatic WhatsApp opening was blocked</strong>No message has been sent. Use the WhatsApp order button above, or send your reference <strong>${Kayam.escapeHTML(
          order.orderReference,
        )}</strong> to +91 788 806 0231.</div>`;
      }
    }, 900);
  }

  function renderUnavailable(ref) {
    const container = document.getElementById("confirmation-content");
    if (!container) return;
    document.title = "Order details unavailable | KAYAM SPICES";
    container.innerHTML = `<div class="order-success">
      <span class="order-success__mark" aria-hidden="true">${Kayam.icon("alert")}</span>
      <p class="order-success__ref">Order reference <strong>${Kayam.escapeHTML(ref)}</strong></p>
      <h1>Details are unavailable in this tab.</h1>
      <p class="order-success__lede">The order summary is kept only for the current browser session. If you saved this order, contact KAYAM SPICES with the reference shown above to confirm its status.</p>
      <div class="alert alert--warning" style="text-align: left;">
        <span aria-hidden="true">${Kayam.icon("info")}</span>
        <div>This page is not an order lookup service and does not confirm that the business has accepted or dispatched an order.</div>
      </div>
      <div class="order-actions">
        <a class="btn btn--dark btn--large" href="https://wa.me/917888060231?text=${encodeURIComponent(
          `KAYAM SPICES\n\nHello, I would like to ask about order ${ref}.`,
        )}" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Contact on WhatsApp</a>
        <a class="btn btn--outline btn--large" href="mailto:anikhindi.suchi@gmail.com?subject=${encodeURIComponent(
          `Order enquiry ${ref}`,
        )}">${Kayam.icon("mail")} Email us</a>
      </div>
      <div class="order-actions">
        <a class="text-link" href="shop.html">Return to the shop</a>
      </div>
    </div>`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
