(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const PAGE_SIZE = 20;
  const transitions = {
    pending_confirmation: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["dispatched", "cancelled"],
    dispatched: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  const listHost = document.getElementById("orders-list");
  const summaryHost = document.getElementById("orders-summary");
  const paginationHost = document.getElementById("orders-pagination");
  const errorHost = document.getElementById("orders-error");
  const filters = document.getElementById("orders-filters");
  const searchInput = document.getElementById("orders-search");
  const statusInput = document.getElementById("orders-status");
  const refreshButton = document.getElementById("orders-refresh");
  const dialog = document.getElementById("order-dialog");
  const dialogTitle = document.getElementById("order-dialog-title");
  const dialogSubtitle = document.getElementById("order-dialog-subtitle");
  const dialogBody = document.getElementById("order-dialog-body");
  const closeButton = dialog ? dialog.querySelector("[data-close-order]") : null;

  const state = {
    offset: 0,
    total: 0,
    search: "",
    status: "",
    loading: false,
    currentOrderId: null,
    actionBusy: false,
    requestId: 0,
  };

  function emptyMarkup(title, text, action) {
    return `<div class="admin-empty">
      <span class="admin-empty__icon" aria-hidden="true">${Admin.icons.orders}</span>
      <h3>${Admin.escapeHTML(title)}</h3>
      <p>${Admin.escapeHTML(text)}</p>
      ${action || ""}
    </div>`;
  }

  function cleanSearch(value) {
    return String(value || "")
      .replace(/[(),"\\%]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function orderAmount(order) {
    if (order.final_total !== null && order.final_total !== undefined) {
      return Admin.formatMoney(order.final_total, true);
    }
    return `${Admin.formatMoney(order.subtotal, true)} <span class="admin-small admin-muted">+ delivery</span>`;
  }

  function setRefreshBusy(value) {
    if (!refreshButton) return;
    refreshButton.disabled = value;
    refreshButton.textContent = value ? "Refreshing…" : "Refresh";
  }

  function renderOrders(orders) {
    if (!listHost) return;
    if (!orders.length) {
      listHost.innerHTML = emptyMarkup(
        "No matching orders",
        "Try a different search or status filter. New orders appear here after checkout.",
      );
      return;
    }
    listHost.innerHTML = `<div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Order</th><th>Customer</th><th>Status</th><th>Amount</th><th>Saved</th><th></th></tr>
        </thead>
        <tbody>
          ${orders
            .map(function (order) {
              return `<tr>
                <td>
                  <a class="admin-table__primary" href="orders.html?order=${encodeURIComponent(order.id)}" data-open-order="${encodeURIComponent(
                    order.id,
                  )}">${Admin.escapeHTML(order.order_reference)}</a>
                  <span class="admin-table__secondary">${Admin.escapeHTML(order.id.slice(0, 8))}</span>
                </td>
                <td>
                  <span class="admin-table__primary">${Admin.escapeHTML(order.customer_name)}</span>
                  <span class="admin-table__secondary">${Admin.escapeHTML(order.customer_phone)}</span>
                </td>
                <td>${Admin.statusMarkup(order.status)}</td>
                <td>${orderAmount(order)}</td>
                <td><span class="admin-table__secondary" style="margin:0;">${Admin.formatDate(order.created_at, true)}</span></td>
                <td>
                  <div class="admin-table__actions">
                    <a class="admin-btn admin-btn--outline admin-btn--small" href="orders.html?order=${encodeURIComponent(order.id)}" data-open-order="${encodeURIComponent(
                      order.id,
                    )}">Open</a>
                  </div>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function renderPagination() {
    if (!paginationHost) return;
    if (!state.total) {
      paginationHost.hidden = true;
      paginationHost.innerHTML = "";
      return;
    }
    const page = Math.floor(state.offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    const start = state.offset + 1;
    const end = Math.min(state.offset + PAGE_SIZE, state.total);
    paginationHost.hidden = false;
    paginationHost.innerHTML = `<span>Showing ${start}–${end} of ${state.total} orders</span>
      <div class="admin-pagination__buttons">
        <button class="admin-btn admin-btn--outline" type="button" data-page-prev${page <= 1 ? " disabled" : ""}>Previous</button>
        <button class="admin-btn admin-btn--outline" type="button" data-page-next${page >= pages ? " disabled" : ""}>Next</button>
      </div>`;
  }

  async function loadOrders(options) {
    if (state.loading) return;
    const opts = options || {};
    state.loading = true;
    setRefreshBusy(true);
    if (errorHost) errorHost.innerHTML = "";
    if (!opts.silent && listHost) listHost.innerHTML = '<div class="admin-loading">Loading orders…</div>';
    if (summaryHost && !opts.silent) summaryHost.textContent = "Loading orders…";

    try {
      const client = Admin.getClient();
      let query = client
        .from("orders")
        .select(
          "id,order_reference,customer_name,customer_phone,status,subtotal,shipping_charge,final_total,created_at",
          { count: "exact" },
        );
      if (state.status) query = query.eq("status", state.status);
      if (state.search) {
        const term = state.search;
        query = query.or(
          `order_reference.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`,
        );
      }
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(state.offset, state.offset + PAGE_SIZE - 1);
      if (error) throw error;
      state.total = count || 0;
      if (state.total && state.offset >= state.total) {
        state.offset = Math.max(0, (Math.ceil(state.total / PAGE_SIZE) - 1) * PAGE_SIZE);
        window.setTimeout(function () {
          loadOrders(opts);
        }, 0);
        return;
      }
      renderOrders(data || []);
      if (summaryHost) {
        summaryHost.textContent = state.total
          ? `${state.total} ${state.total === 1 ? "order" : "orders"} found`
          : "No orders found";
      }
      renderPagination();
    } catch (error) {
      console.error(error);
      if (errorHost) {
        errorHost.innerHTML = Admin.alertMarkup(
          Admin.errorMessage(error, "Orders could not be loaded."),
          "error",
          "Orders unavailable",
        );
      }
      if (listHost) listHost.innerHTML = emptyMarkup("Orders unavailable", "Refresh the page to try loading them again.");
      if (summaryHost) summaryHost.textContent = "Could not load orders";
      if (paginationHost) paginationHost.hidden = true;
    } finally {
      state.loading = false;
      setRefreshBusy(false);
    }
  }

  function setDialogUrl(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("order", id);
    else url.searchParams.delete("order");
    window.history.replaceState(null, "", url);
  }

  function openOrder(id) {
    if (!dialog || !dialogBody || !id) return;
    state.currentOrderId = id;
    setDialogUrl(id);
    if (!dialog.open) dialog.showModal();
    loadOrderDetail(id);
  }

  function closeOrder() {
    if (!dialog) return;
    if (dialog.open) dialog.close();
  }

  function whatsappDigits(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
  }

  function renderDetail(order, items, events) {
    if (!dialogBody) return;
    const canTransition = (transitions[order.status] || []).length > 0;
    const waNumber = whatsappDigits(order.customer_phone);
    dialogTitle.textContent = order.order_reference;
    dialogSubtitle.textContent = `Saved ${Admin.formatDate(order.created_at, true)} · ${Admin.statusLabel(order.status)}`;
    dialogBody.innerHTML = `<div id="order-dialog-alert" aria-live="assertive"></div>
      <div class="admin-order-grid">
        <section class="admin-panel">
          <h3>Customer</h3>
          <dl class="admin-detail-list">
            <div><dt>Name</dt><dd>${Admin.escapeHTML(order.customer_name)}</dd></div>
            <div><dt>Phone</dt><dd><a class="admin-link" href="https://wa.me/${Admin.escapeHTML(
              waNumber,
            )}" target="_blank" rel="noopener">${Admin.escapeHTML(order.customer_phone)}</a></dd></div>
            <div><dt>Reference</dt><dd>${Admin.escapeHTML(order.order_reference)}</dd></div>
          </dl>
          <p class="admin-address">${Admin.escapeHTML(order.delivery_address)}</p>
          <div class="admin-form-actions">
            <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-copy-reference="${Admin.escapeHTML(
              order.order_reference,
            )}">Copy reference</button>
            <a class="admin-btn admin-btn--outline admin-btn--small" href="https://wa.me/${Admin.escapeHTML(
              waNumber,
            )}" target="_blank" rel="noopener">Message customer</a>
          </div>
        </section>
        <section class="admin-panel">
          <h3>Items</h3>
          <ul class="admin-line-items">
            ${items
              .map(function (item) {
                return `<li class="admin-line-item">
                  <div>
                    <p class="admin-line-item__name">${Admin.escapeHTML(item.product_name_snapshot)}</p>
                    <p class="admin-line-item__meta">${Admin.escapeHTML(item.variant_snapshot)} · Qty ${Number(
                      item.quantity,
                    )} · ${Admin.formatMoney(item.unit_price_snapshot, true)} each</p>
                  </div>
                  <span class="admin-line-item__total">${Admin.formatMoney(item.line_total, true)}</span>
                </li>`;
              })
              .join("")}
          </ul>
          <dl class="admin-totals">
            <div><dt>Subtotal</dt><dd>${Admin.formatMoney(order.subtotal, true)}</dd></div>
            <div><dt>Delivery charge</dt><dd>${
              order.shipping_charge === null ? "Not set" : Admin.formatMoney(order.shipping_charge, true)
            }</dd></div>
            <div class="admin-totals__final"><dt>Final payable</dt><dd>${
              order.final_total === null ? "Pending confirmation" : Admin.formatMoney(order.final_total, true)
            }</dd></div>
          </dl>
        </section>
      </div>

      <div class="admin-order-grid" style="margin-top: 1rem;">
        <section class="admin-panel">
          <h3>Update status</h3>
          ${
            canTransition
              ? `<form id="order-status-form" novalidate>
                  <div class="admin-inline-stack">
                    <div class="admin-field">
                      <label for="order-status-select">Next status</label>
                      <select class="admin-select" id="order-status-select" name="status" required>
                        ${(transitions[order.status] || [])
                          .map(
                            (status) =>
                              `<option value="${status}">${Admin.escapeHTML(Admin.statusLabel(status))}</option>`,
                          )
                          .join("")}
                      </select>
                    </div>
                    <div class="admin-field">
                      <label for="order-status-note">Internal note (optional)</label>
                      <textarea class="admin-textarea" id="order-status-note" name="note" rows="3" maxlength="1000"></textarea>
                      <p class="admin-field__hint">This note is visible to administrators only.</p>
                    </div>
                    <button class="admin-btn" type="submit">Update order status</button>
                  </div>
                </form>`
              : '<p class="admin-small admin-muted">This order has reached a final status and cannot be moved further.</p>'
          }
        </section>
        <section class="admin-panel">
          <h3>Delivery charge</h3>
          ${
            order.status === "cancelled"
              ? '<p class="admin-small admin-muted">Delivery charges cannot be set on a cancelled order.</p>'
              : `<form id="order-shipping-form" novalidate>
                  <div class="admin-inline-stack">
                    <div class="admin-field">
                      <label for="order-shipping-input">Charge in INR (₹)</label>
                      <input class="admin-input" id="order-shipping-input" name="shipping" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" required value="${
                        order.shipping_charge === null ? "" : Admin.escapeHTML(String(order.shipping_charge))
                      }">
                      <p class="admin-field__hint">Saving this sets the final payable amount to the subtotal plus this charge.</p>
                    </div>
                    <div class="admin-field">
                      <label for="order-shipping-note">Internal note (optional)</label>
                      <textarea class="admin-textarea" id="order-shipping-note" name="note" rows="2" maxlength="1000"></textarea>
                    </div>
                    <button class="admin-btn" type="submit">Save delivery charge</button>
                  </div>
                </form>`
          }
        </section>
      </div>

      <section class="admin-panel" style="margin-top: 1rem;">
        <h3>Admin activity</h3>
        ${
          events.length
            ? `<ul class="admin-timeline">${events
                .map(function (event) {
                  const label =
                    event.event_type === "shipping_updated"
                      ? "Delivery charge updated"
                      : `${Admin.statusLabel(event.old_status)} → ${Admin.statusLabel(event.new_status)}`;
                  return `<li><strong>${Admin.escapeHTML(label)}</strong> · ${Admin.formatDate(
                    event.created_at,
                    true,
                  )}${event.note ? `<br>${Admin.escapeHTML(event.note)}` : ""}</li>`;
                })
                .join("")}</ul>`
            : '<p class="admin-small admin-muted">No administrator changes have been recorded yet.</p>'
        }
      </section>`;
  }

  async function loadOrderDetail(id) {
    if (!dialogBody) return;
    const requestId = ++state.requestId;
    dialogBody.innerHTML = '<div class="admin-loading">Loading saved order…</div>';
    dialogSubtitle.textContent = "Loading saved order…";
    try {
      const client = Admin.getClient();
      const [orderResult, itemsResult, eventsResult] = await Promise.all([
        client
          .from("orders")
          .select(
            "id,order_reference,customer_name,customer_phone,delivery_address,subtotal,shipping_charge,final_total,status,admin_note,created_at,updated_at",
          )
          .eq("id", id)
          .single(),
        client
          .from("order_items")
          .select(
            "id,product_id,variant_id,product_name_snapshot,variant_snapshot,quantity,unit_price_snapshot,line_total,stock_tracked",
          )
          .eq("order_id", id)
          .order("id", { ascending: true }),
        client
          .from("order_events")
          .select("id,event_type,old_status,new_status,note,created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      const error = orderResult.error || itemsResult.error || eventsResult.error;
      if (error) throw error;
      if (requestId !== state.requestId) return;
      renderDetail(orderResult.data, itemsResult.data || [], eventsResult.data || []);
    } catch (error) {
      if (requestId !== state.requestId) return;
      console.error(error);
      dialogSubtitle.textContent = "Order could not be loaded";
      dialogBody.innerHTML = Admin.alertMarkup(
        Admin.errorMessage(error, "The saved order could not be loaded."),
        "error",
        "Order unavailable",
      );
    }
  }

  function dialogAlert(message, type) {
    const target = document.getElementById("order-dialog-alert");
    if (!target) {
      Admin.showToast(message, type);
      return;
    }
    target.innerHTML = Admin.alertMarkup(message, type);
    target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function updateStatus(form) {
    if (state.actionBusy || !state.currentOrderId) return;
    const orderId = state.currentOrderId;
    const status = form.elements.status.value;
    const note = form.elements.note.value.trim();
    if (!status) {
      dialogAlert("Select the next order status.", "error");
      return;
    }
    if (
      status === "cancelled" &&
      !window.confirm("Cancel this order? Tracked stock will be restored and this status change cannot be reversed.")
    ) {
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    state.actionBusy = true;
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Updating…";
    }
    try {
      const { error } = await Admin.getClient().rpc("admin_update_order_status", {
        p_order_id: orderId,
        p_status: status,
        p_note: note || null,
      });
      if (error) throw error;
      Admin.showToast(`Order moved to ${Admin.statusLabel(status)}.`, "success");
      if (dialog.open && state.currentOrderId === orderId) await loadOrderDetail(orderId);
      loadOrders({ silent: true });
    } catch (error) {
      console.error(error);
      dialogAlert(Admin.errorMessage(error, "The order status could not be updated."), "error");
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Update order status";
      }
    } finally {
      state.actionBusy = false;
    }
  }

  async function updateShipping(form) {
    if (state.actionBusy || !state.currentOrderId) return;
    const orderId = state.currentOrderId;
    const raw = form.elements.shipping.value.trim();
    const charge = Number(raw);
    const note = form.elements.note.value.trim();
    if (raw === "" || !Number.isFinite(charge) || charge < 0 || charge > 1000000) {
      dialogAlert("Enter a valid non-negative delivery charge.", "error");
      form.elements.shipping.focus();
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    state.actionBusy = true;
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Saving…";
    }
    try {
      const { error } = await Admin.getClient().rpc("admin_set_order_shipping", {
        p_order_id: orderId,
        p_shipping_charge: charge,
        p_note: note || null,
      });
      if (error) throw error;
      Admin.showToast("Delivery charge saved.", "success");
      if (dialog.open && state.currentOrderId === orderId) await loadOrderDetail(orderId);
      loadOrders({ silent: true });
    } catch (error) {
      console.error(error);
      dialogAlert(Admin.errorMessage(error, "The delivery charge could not be saved."), "error");
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Save delivery charge";
      }
    } finally {
      state.actionBusy = false;
    }
  }

  function bindEvents() {
    if (filters) {
      filters.addEventListener("submit", function (event) {
        event.preventDefault();
        state.search = cleanSearch(searchInput.value);
        state.status = statusInput.value;
        state.offset = 0;
        loadOrders();
      });
    }

    if (statusInput) {
      statusInput.addEventListener("change", function () {
        state.search = cleanSearch(searchInput.value);
        state.status = statusInput.value;
        state.offset = 0;
        loadOrders();
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        loadOrders();
      });
    }

    if (listHost) {
      listHost.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-open-order]");
        if (!trigger) return;
        event.preventDefault();
        openOrder(trigger.dataset.openOrder);
      });
    }

    if (paginationHost) {
      paginationHost.addEventListener("click", function (event) {
        if (event.target.closest("[data-page-prev]")) {
          state.offset = Math.max(0, state.offset - PAGE_SIZE);
          loadOrders();
        }
        if (event.target.closest("[data-page-next]")) {
          state.offset += PAGE_SIZE;
          loadOrders();
        }
      });
    }

    if (closeButton) closeButton.addEventListener("click", closeOrder);
    if (dialog) {
      dialog.addEventListener("close", function () {
        state.currentOrderId = null;
        setDialogUrl("");
      });
      dialog.addEventListener("click", function (event) {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          closeOrder();
        }
      });
      dialog.addEventListener("submit", function (event) {
        if (event.target.id === "order-status-form") {
          event.preventDefault();
          updateStatus(event.target);
        }
        if (event.target.id === "order-shipping-form") {
          event.preventDefault();
          updateShipping(event.target);
        }
      });
      dialog.addEventListener("click", function (event) {
        const copy = event.target.closest("[data-copy-reference]");
        if (!copy) return;
        const reference = copy.dataset.copyReference;
        if (!navigator.clipboard) {
          Admin.showToast(`Order reference: ${reference}`, "info");
          return;
        }
        navigator.clipboard
          .writeText(reference)
          .then(function () {
            Admin.showToast("Order reference copied.", "success");
          })
          .catch(function () {
            Admin.showToast(`Order reference: ${reference}`, "info");
          });
      });
    }
  }

  Admin.ready().then(function (profile) {
    if (!profile) return;
    bindEvents();
    loadOrders();
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (orderId) openOrder(orderId);
  });
})();
