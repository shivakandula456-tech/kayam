(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const PLACEHOLDER = "../assets/images/product-placeholder.svg";
  const listHost = document.getElementById("products-list");
  const summaryHost = document.getElementById("products-summary");
  const errorHost = document.getElementById("products-error");
  const filters = document.getElementById("products-filters");
  const searchInput = document.getElementById("products-search");
  const categoryInput = document.getElementById("products-category");
  const statusInput = document.getElementById("products-status");
  const refreshButton = document.getElementById("products-refresh");
  const state = {
    products: [],
    categories: [],
    loading: false,
    busy: false,
  };

  function emptyMarkup(title, text, action) {
    return `<div class="admin-empty">
      <span class="admin-empty__icon" aria-hidden="true">${Admin.icons.products}</span>
      <h3>${Admin.escapeHTML(title)}</h3>
      <p>${Admin.escapeHTML(text)}</p>
      ${action || ""}
    </div>`;
  }

  function effectivePrice(variant) {
    const price = Number(variant.price);
    const sale = variant.sale_price === null ? null : Number(variant.sale_price);
    return sale !== null && Number.isFinite(sale) && sale >= 0 && sale <= price ? sale : price;
  }

  function priceLabel(variants) {
    const prices = variants
      .filter((variant) => variant.is_active)
      .map(effectivePrice)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    if (!prices.length) return '<span class="admin-muted">Pricing pending</span>';
    if (prices[0] === prices[prices.length - 1]) return Admin.formatMoney(prices[0], true);
    return `${Admin.formatMoney(prices[0], true)} – ${Admin.formatMoney(prices[prices.length - 1], true)}`;
  }

  function weightsLabel(variants) {
    const active = variants.filter((variant) => variant.is_active);
    if (!active.length) return '<span class="admin-muted">No weights yet</span>';
    const labels = active.map((variant) => Admin.formatWeight(variant.weight_value, variant.weight_unit));
    const visible = labels.slice(0, 3).join(", ");
    return `${Admin.escapeHTML(visible)}${labels.length > 3 ? ` +${labels.length - 3}` : ""}`;
  }

  function stockLabel(variants) {
    const tracked = variants.filter((variant) => variant.is_active && variant.track_stock);
    if (!variants.some((variant) => variant.is_active)) return '<span class="admin-muted">—</span>';
    if (!tracked.length) return '<span class="admin-muted">Not tracked</span>';
    const total = tracked.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0);
    const color = total === 0 ? "var(--spice-red)" : total <= 10 ? "var(--warning)" : "var(--success)";
    return `<strong style="color:${color};">${total} ${total === 1 ? "unit" : "units"}</strong>`;
  }

  function primaryImage(product) {
    const images = (product.product_images || []).slice().sort(function (a, b) {
      return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
    });
    const path = images[0] ? images[0].storage_path : "";
    return path && window.KayamDB ? window.KayamDB.getPublicImageUrl(path) : PLACEHOLDER;
  }

  function filteredProducts() {
    const term = String(searchInput ? searchInput.value : "").trim().toLowerCase();
    const category = categoryInput ? categoryInput.value : "";
    const status = statusInput ? statusInput.value : "";
    return state.products.filter(function (product) {
      const categoryData = product.categories || {};
      if (category && String(product.category_id) !== category) return false;
      if (status === "active" && !product.is_active) return false;
      if (status === "inactive" && product.is_active) return false;
      if (status === "featured" && !product.is_featured) return false;
      if (!term) return true;
      return [product.name, product.slug, categoryData.name || ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }

  function render() {
    if (!listHost) return;
    const products = filteredProducts();
    if (summaryHost) {
      summaryHost.textContent = state.products.length
        ? `${products.length} of ${state.products.length} products shown`
        : "No products in the catalogue";
    }
    if (!products.length) {
      listHost.innerHTML = emptyMarkup(
        state.products.length ? "No matching products" : "The catalogue is empty",
        state.products.length
          ? "Adjust the search or filters to see other products."
          : "Add the first product to start building the KAYAM SPICES catalogue.",
        '<a class="admin-btn admin-btn--small" href="product-form.html">Add product</a>',
      );
      return;
    }

    listHost.innerHTML = `<div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Product</th><th>Category</th><th>Weights</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${products
            .map(function (product) {
              const variants = product.product_variants || [];
              const category = product.categories || {};
              const image = primaryImage(product);
              return `<tr>
                <td>
                  <div class="admin-product-cell">
                    <img class="admin-thumb" src="${Admin.escapeHTML(image)}" alt="" width="46" height="54" loading="lazy" data-admin-image-fallback>
                    <div>
                      <a class="admin-table__primary" href="product-form.html?id=${encodeURIComponent(product.id)}">${Admin.escapeHTML(
                        product.name,
                      )}</a>
                      <span class="admin-table__secondary">${Admin.escapeHTML(product.slug)}</span>
                    </div>
                  </div>
                </td>
                <td>${Admin.escapeHTML(category.name || "Uncategorised")}</td>
                <td>${weightsLabel(variants)}</td>
                <td>${priceLabel(variants)}</td>
                <td>${stockLabel(variants)}</td>
                <td>
                  <span class="admin-status admin-status--${product.is_active ? "active" : "inactive"}">${
                    product.is_active ? "Active" : "Inactive"
                  }</span>
                  ${product.is_featured ? '<span class="admin-status admin-status--pending_confirmation" style="margin-top:.25rem;">Featured</span>' : ""}
                </td>
                <td>
                  <div class="admin-table__actions">
                    ${
                      product.is_active
                        ? `<a class="admin-btn admin-btn--outline admin-btn--small" href="../product.html?slug=${encodeURIComponent(
                            product.slug,
                          )}" target="_blank" rel="noopener">View</a>`
                        : ""
                    }
                    <a class="admin-btn admin-btn--outline admin-btn--small" href="product-form.html?id=${encodeURIComponent(
                      product.id,
                    )}">Edit</a>
                    <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-toggle-product="${Admin.escapeHTML(
                      product.id,
                    )}" data-next-active="${product.is_active ? "false" : "true"}">${
                      product.is_active ? "Deactivate" : "Activate"
                    }</button>
                  </div>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function populateCategories() {
    if (!categoryInput) return;
    const current = categoryInput.value;
    categoryInput.innerHTML = `<option value="">All categories</option>${state.categories
      .map(
        (category) =>
          `<option value="${Admin.escapeHTML(category.id)}">${Admin.escapeHTML(category.name)}${
            category.is_active ? "" : " (inactive)"
          }</option>`,
      )
      .join("")}`;
    categoryInput.value = state.categories.some((category) => category.id === current) ? current : "";
  }

  async function loadProducts() {
    if (state.loading) return;
    state.loading = true;
    if (errorHost) errorHost.innerHTML = "";
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing…";
    }
    if (listHost) listHost.innerHTML = '<div class="admin-loading">Loading products…</div>';
    try {
      const client = Admin.getClient();
      const [productsResult, categoriesResult] = await Promise.all([
        client
          .from("products")
          .select(
            "id,name,slug,category_id,short_description,is_active,is_featured,display_order,updated_at,categories(id,name,slug,is_active),product_variants(id,weight_value,weight_unit,price,sale_price,track_stock,stock_quantity,is_active,display_order),product_images(id,storage_path,alt_text,display_order)",
          )
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        client.from("categories").select("id,name,slug,is_active,display_order").order("display_order", { ascending: true }),
      ]);
      const error = productsResult.error || categoriesResult.error;
      if (error) throw error;
      state.products = productsResult.data || [];
      state.categories = categoriesResult.data || [];
      populateCategories();
      const requestedCategory = new URLSearchParams(window.location.search).get("category");
      if (requestedCategory && state.categories.some((category) => category.id === requestedCategory)) {
        categoryInput.value = requestedCategory;
      }
      render();
    } catch (error) {
      console.error(error);
      if (errorHost) {
        errorHost.innerHTML = Admin.alertMarkup(
          Admin.errorMessage(error, "The product catalogue could not be loaded."),
          "error",
          "Products unavailable",
        );
      }
      if (listHost) listHost.innerHTML = emptyMarkup("Products unavailable", "Refresh the page to try again.");
      if (summaryHost) summaryHost.textContent = "Could not load products";
    } finally {
      state.loading = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "Refresh";
      }
    }
  }

  async function toggleProduct(button) {
    if (state.busy) return;
    const id = button.dataset.toggleProduct;
    const nextActive = button.dataset.nextActive === "true";
    state.busy = true;
    button.disabled = true;
    try {
      const { data, error } = await Admin.getClient()
        .from("products")
        .update({ is_active: nextActive })
        .eq("id", id)
        .select("id,is_active")
        .single();
      if (error) throw error;
      const product = state.products.find((item) => item.id === id);
      if (product) product.is_active = data.is_active;
      Admin.showToast(nextActive ? "Product activated." : "Product deactivated.", "success");
      render();
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The product status could not be changed."), "error");
      button.disabled = false;
    } finally {
      state.busy = false;
    }
  }

  function bindEvents() {
    if (filters) {
      filters.addEventListener("submit", function (event) {
        event.preventDefault();
        render();
      });
    }
    if (searchInput) searchInput.addEventListener("input", render);
    if (categoryInput) categoryInput.addEventListener("change", render);
    if (statusInput) statusInput.addEventListener("change", render);
    if (refreshButton) refreshButton.addEventListener("click", loadProducts);
    if (listHost) {
      listHost.addEventListener("click", function (event) {
        const toggle = event.target.closest("[data-toggle-product]");
        if (toggle) toggleProduct(toggle);
      });
      listHost.addEventListener(
        "error",
        function (event) {
          const image = event.target;
          if (!(image instanceof HTMLImageElement)) return;
          if (!image.hasAttribute("data-admin-image-fallback")) return;
          image.removeAttribute("data-admin-image-fallback");
          image.src = PLACEHOLDER;
        },
        true,
      );
    }
  }

  Admin.ready().then(function (profile) {
    if (!profile) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("deleted") === "1") {
      Admin.showToast("Product deleted.", "success");
      url.searchParams.delete("deleted");
      window.history.replaceState({}, "", url);
    }
    bindEvents();
    loadProducts();
  });
})();
