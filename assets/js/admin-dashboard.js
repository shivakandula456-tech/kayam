(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const metricsHost = document.getElementById("dashboard-metrics");
  const recentHost = document.getElementById("recent-orders");
  const stockHost = document.getElementById("low-stock");
  const errorHost = document.getElementById("dashboard-error");
  const refreshButton = document.getElementById("dashboard-refresh");
  let loading = false;

  function emptyMarkup(title, text) {
    return `<div class="admin-empty">
      <span class="admin-empty__icon" aria-hidden="true">${Admin.icons.info}</span>
      <h3>${Admin.escapeHTML(title)}</h3>
      <p>${Admin.escapeHTML(text)}</p>
    </div>`;
  }

  function metricMarkup(label, value, note, accent) {
    return `<article class="admin-metric${accent ? " admin-metric--accent" : ""}">
      <p class="admin-metric__label">${Admin.escapeHTML(label)}</p>
      <p class="admin-metric__value">${Admin.escapeHTML(String(value))}</p>
      <p class="admin-metric__note">${Admin.escapeHTML(note)}</p>
    </article>`;
  }

  function orderTotal(order) {
    if (order.final_total !== null && order.final_total !== undefined) {
      return Admin.formatMoney(order.final_total, true);
    }
    return `${Admin.formatMoney(order.subtotal, true)} <span class="admin-small admin-muted">+ delivery</span>`;
  }

  function renderMetrics(counts) {
    if (!metricsHost) return;
    metricsHost.innerHTML = [
      metricMarkup("Pending confirmation", counts.pending, "Orders waiting for a personal response", true),
      metricMarkup("Total orders", counts.orders, "All saved orders in the store", false),
      metricMarkup("Active products", counts.products, "Published catalogue products", false),
      metricMarkup("Low-stock weights", counts.lowStock, "Tracked options at five units or fewer", false),
    ].join("");
  }

  function renderOrders(orders) {
    if (!recentHost) return;
    if (!orders.length) {
      recentHost.innerHTML = emptyMarkup(
        "No orders yet",
        "Saved orders will appear here as soon as a customer completes checkout.",
      );
      return;
    }
    recentHost.innerHTML = `<div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Saved</th></tr></thead>
        <tbody>
          ${orders
            .map(function (order) {
              return `<tr>
                <td><a class="admin-table__primary" href="orders.html?order=${encodeURIComponent(
                  order.id,
                )}">${Admin.escapeHTML(order.order_reference)}</a></td>
                <td><span class="admin-table__primary">${Admin.escapeHTML(order.customer_name)}</span></td>
                <td>${Admin.statusMarkup(order.status)}</td>
                <td>${orderTotal(order)}</td>
                <td><span class="admin-table__secondary" style="margin:0;">${Admin.formatDate(order.created_at, true)}</span></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function renderStock(items) {
    if (!stockHost) return;
    const visible = items.filter(function (item) {
      return item.products && item.products.is_active;
    });
    if (!visible.length) {
      stockHost.innerHTML = emptyMarkup(
        "Stock looks healthy",
        "No tracked weight option is currently at five units or fewer.",
      );
      return;
    }
    stockHost.innerHTML = `<div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Weight</th><th>Left</th><th></th></tr></thead>
        <tbody>
          ${visible
            .map(function (item) {
              const product = item.products || {};
              return `<tr>
                <td><span class="admin-table__primary">${Admin.escapeHTML(product.name || "Product")}</span></td>
                <td>${Admin.escapeHTML(Admin.formatWeight(item.weight_value, item.weight_unit))}</td>
                <td><strong style="color:${Number(item.stock_quantity) === 0 ? "var(--spice-red)" : "var(--warning)"};">${Number(
                  item.stock_quantity,
                )}</strong></td>
                <td><a class="admin-link" href="product-form.html?id=${encodeURIComponent(item.product_id)}">Edit</a></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function showError(error) {
    if (!errorHost) return;
    errorHost.innerHTML = Admin.alertMarkup(
      Admin.errorMessage(error, "The dashboard could not be loaded."),
      "error",
      "Dashboard unavailable",
    );
  }

  async function loadDashboard() {
    if (loading) return;
    loading = true;
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing…";
    }
    if (errorHost) errorHost.innerHTML = "";
    try {
      const client = Admin.getClient();
      const [pendingResult, ordersResult, productsResult, stockResult, recentResult] = await Promise.all([
        client.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation"),
        client.from("orders").select("id", { count: "exact", head: true }),
        client.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        client
          .from("product_variants")
          .select("id,product_id,weight_value,weight_unit,stock_quantity,products!inner(id,name,is_active)", {
            count: "exact",
          })
          .eq("track_stock", true)
          .eq("is_active", true)
          .eq("products.is_active", true)
          .lte("stock_quantity", 5)
          .order("stock_quantity", { ascending: true })
          .limit(8),
        client
          .from("orders")
          .select("id,order_reference,customer_name,status,subtotal,final_total,created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const error =
        pendingResult.error || ordersResult.error || productsResult.error || stockResult.error || recentResult.error;
      if (error) throw error;

      renderMetrics({
        pending: pendingResult.count || 0,
        orders: ordersResult.count || 0,
        products: productsResult.count || 0,
        lowStock: stockResult.count || 0,
      });
      renderOrders(recentResult.data || []);
      renderStock(stockResult.data || []);
    } catch (error) {
      console.error(error);
      showError(error);
      if (metricsHost) {
        metricsHost.innerHTML = [
          metricMarkup("Pending confirmation", "—", "Could not load", true),
          metricMarkup("Total orders", "—", "Could not load", false),
          metricMarkup("Active products", "—", "Could not load", false),
          metricMarkup("Low-stock weights", "—", "Could not load", false),
        ].join("");
      }
      if (recentHost) recentHost.innerHTML = emptyMarkup("Orders unavailable", "Refresh the page to try again.");
      if (stockHost) stockHost.innerHTML = emptyMarkup("Stock unavailable", "Refresh the page to try again.");
    } finally {
      loading = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "Refresh";
      }
    }
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", loadDashboard);
  }

  Admin.ready().then(function (profile) {
    if (!profile) return;
    loadDashboard();
  });
})();
