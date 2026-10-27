(function () {
  "use strict";

  const Kayam = window.Kayam;
  const sortValues = new Set(["featured", "name-asc", "name-desc", "price-asc", "price-desc", "newest"]);
  let catalogue = null;
  let filteredProducts = [];
  let filtersRendered = false;
  let lastFilterFocus = null;

  const params = new URLSearchParams(window.location.search);
  const initialSort = params.get("sort");
  const state = {
    query: params.get("q") || "",
    category: params.get("category") || "all",
    min: parsePriceParam(params.get("min")),
    max: parsePriceParam(params.get("max")),
    inStock: params.get("availability") === "in-stock",
    sort: initialSort && sortValues.has(initialSort) ? initialSort : "featured",
  };

  function parsePriceParam(value) {
    if (value === null || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }

  function moneyInputValue(value) {
    if (value === null || value === undefined) return "";
    return String(Math.round(Number(value) * 100) / 100);
  }

  function normalise(value) {
    return String(value || "").toLocaleLowerCase("en-IN");
  }

  function matchesSearch(product, query) {
    if (!query) return true;
    const haystack = [
      product.name,
      product.short_description,
      product.description,
      product.ingredients,
      product.categoryName,
    ]
      .map(normalise)
      .join(" ");
    return haystack.includes(query);
  }

  function matchesPrice(product) {
    if (state.min === null && state.max === null) return true;
    const variants = product.variants || [];
    if (!variants.length) return false;
    const minPaise = state.min === null ? 0 : Math.round(state.min * 100);
    const maxPaise = state.max === null ? Number.POSITIVE_INFINITY : Math.round(state.max * 100);
    if (minPaise > maxPaise) return false;
    return variants.some(function (variant) {
      return variant.effectivePricePaise >= minPaise && variant.effectivePricePaise <= maxPaise;
    });
  }

  function filterProducts() {
    if (!catalogue) return [];
    const query = normalise(state.query.trim());
    const category = catalogue.categories.find((entry) => entry.slug === state.category);
    const categoryId = category ? category.id : null;
    const products = catalogue.products.filter(function (product) {
      if (category && product.category_id !== categoryId) return false;
      if (state.inStock && !product.hasAvailableVariant) return false;
      if (!matchesSearch(product, query)) return false;
      if (!matchesPrice(product)) return false;
      return true;
    });
    return products.sort(function (a, b) {
      if (state.sort === "name-asc") return a.name.localeCompare(b.name);
      if (state.sort === "name-desc") return b.name.localeCompare(a.name);
      if (state.sort === "price-asc") {
        return (a.lowestPricePaise ?? Number.MAX_SAFE_INTEGER) - (b.lowestPricePaise ?? Number.MAX_SAFE_INTEGER);
      }
      if (state.sort === "price-desc") {
        return (b.lowestPricePaise ?? -1) - (a.lowestPricePaise ?? -1);
      }
      if (state.sort === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return a.name.localeCompare(b.name);
    });
  }

  function categoryCount(categoryId) {
    return catalogue.products.filter((product) => product.category_id === categoryId).length;
  }

  function filterPanelMarkup() {
    const hasVariantData = catalogue.products.some((product) => product.variants && product.variants.length > 0);
    const priceFilter = hasVariantData
      ? `<div class="filter-group">
          <h3 class="filter-group__title">Price range</h3>
          <div class="price-range">
            <label class="sr-only" for="filter-min-price">Minimum price in rupees</label>
            <input id="filter-min-price" type="number" min="0" step="1" inputmode="decimal" placeholder="Min ₹" value="${Kayam.escapeHTML(
              moneyInputValue(state.min),
            )}">
            <span>to</span>
            <label class="sr-only" for="filter-max-price">Maximum price in rupees</label>
            <input id="filter-max-price" type="number" min="0" step="1" inputmode="decimal" placeholder="Max ₹" value="${Kayam.escapeHTML(
              moneyInputValue(state.max),
            )}">
          </div>
          <p class="field__hint">Prices shown are current catalogue prices and exclude delivery.</p>
        </div>`
      : "";
    const availabilityFilter = hasVariantData
      ? `<div class="filter-group">
          <h3 class="filter-group__title">Availability</h3>
          <label class="filter-option">
            <input type="checkbox" id="filter-in-stock" ${state.inStock ? "checked" : ""}>
            <span>In-stock weights only</span>
          </label>
        </div>`
      : "";
    const allCategories = catalogue.categories
      .map(function (category) {
        return `<label class="filter-option">
          <input type="radio" name="category" value="${Kayam.escapeHTML(category.slug)}" ${
            state.category === category.slug ? "checked" : ""
          }>
          <span>${Kayam.escapeHTML(category.name)}</span>
          <small>${categoryCount(category.id)}</small>
        </label>`;
      })
      .join("");
    return `<form class="filter-panel" id="shop-filter-form" novalidate>
      <div class="filter-group">
        <h3 class="filter-group__title">Category</h3>
        <label class="filter-option">
          <input type="radio" name="category" value="all" ${state.category === "all" ? "checked" : ""}>
          <span>All spices</span>
          <small>${catalogue.products.length}</small>
        </label>
        ${allCategories}
      </div>
      ${priceFilter}
      ${availabilityFilter}
      <div class="filter-actions">
        <button class="btn btn--outline" type="reset">Clear all</button>
        <button class="btn btn--dark" type="button" data-apply-filters>Show results</button>
      </div>
    </form>`;
  }

  function renderFilters() {
    const container = document.getElementById("shop-filters");
    if (!container || !catalogue) return;
    if (state.category !== "all" && !catalogue.categories.some((category) => category.slug === state.category)) {
      state.category = "all";
    }
    container.innerHTML = filterPanelMarkup();
    filtersRendered = true;
    bindFilterEvents();
  }

  function syncFilterForm() {
    if (!filtersRendered) return;
    const form = document.getElementById("shop-filter-form");
    if (!form) return;
    const categoryInput = form.querySelector(`input[name="category"][value="${CSS.escape(state.category)}"]`);
    if (categoryInput) categoryInput.checked = true;
    const stockInput = document.getElementById("filter-in-stock");
    if (stockInput) stockInput.checked = state.inStock;
    const minInput = document.getElementById("filter-min-price");
    const maxInput = document.getElementById("filter-max-price");
    if (minInput) minInput.value = moneyInputValue(state.min);
    if (maxInput) maxInput.value = moneyInputValue(state.max);
  }

  function activeFilterCount() {
    let count = 0;
    if (state.category !== "all") count += 1;
    if (state.query.trim()) count += 1;
    if (state.min !== null || state.max !== null) count += 1;
    if (state.inStock) count += 1;
    return count;
  }

  function renderActiveFilters() {
    const container = document.getElementById("active-filters");
    const countBadge = document.querySelector("[data-filter-count]");
    if (!container) return;
    const chips = [];
    if (state.category !== "all") {
      const category = catalogue.categories.find((entry) => entry.slug === state.category);
      if (category) {
        chips.push(
          `<span class="filter-chip">${Kayam.escapeHTML(category.name)}<button type="button" data-clear-filter="category" aria-label="Remove category filter">×</button></span>`,
        );
      }
    }
    if (state.query.trim()) {
      chips.push(
        `<span class="filter-chip">“${Kayam.escapeHTML(state.query.trim())}”<button type="button" data-clear-filter="search" aria-label="Remove search filter">×</button></span>`,
      );
    }
    if (state.min !== null || state.max !== null) {
      const label =
        state.min !== null && state.max !== null
          ? `₹${state.min} – ₹${state.max}`
          : state.min !== null
            ? `From ₹${state.min}`
            : `Up to ₹${state.max}`;
      chips.push(
        `<span class="filter-chip">${Kayam.escapeHTML(label)}<button type="button" data-clear-filter="price" aria-label="Remove price filter">×</button></span>`,
      );
    }
    if (state.inStock) {
      chips.push(
        `<span class="filter-chip">In stock<button type="button" data-clear-filter="stock" aria-label="Remove availability filter">×</button></span>`,
      );
    }
    container.innerHTML = chips.join("");
    if (countBadge) {
      const count = activeFilterCount();
      countBadge.textContent = String(count);
      countBadge.hidden = count === 0;
    }
    container.querySelectorAll("[data-clear-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        const filter = button.dataset.clearFilter;
        if (filter === "category") state.category = "all";
        if (filter === "search") {
          state.query = "";
          const search = document.getElementById("shop-search");
          if (search) search.value = "";
          syncSearchClear();
        }
        if (filter === "price") {
          state.min = null;
          state.max = null;
        }
        if (filter === "stock") state.inStock = false;
        syncFilterForm();
        applyFilters();
      });
    });
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    if (state.query.trim()) url.searchParams.set("q", state.query.trim());
    if (state.category !== "all") url.searchParams.set("category", state.category);
    if (state.min !== null) url.searchParams.set("min", String(state.min));
    if (state.max !== null) url.searchParams.set("max", String(state.max));
    if (state.inStock) url.searchParams.set("availability", "in-stock");
    if (state.sort !== "featured") url.searchParams.set("sort", state.sort);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function renderResults() {
    const container = document.getElementById("shop-products");
    const countNode = document.getElementById("shop-results-count");
    const noteNode = document.getElementById("shop-results-note");
    if (!container || !catalogue) return;
    filteredProducts = filterProducts();
    if (countNode) {
      countNode.innerHTML = `<strong>${filteredProducts.length}</strong> of ${catalogue.products.length} ${
        catalogue.products.length === 1 ? "spice" : "spices"
      }`;
    }
    if (noteNode) noteNode.textContent = catalogue.products.some((product) => product.hasVariants)
      ? "Current catalogue prices"
      : "";
    if (!filteredProducts.length) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("search")}</span>
        <h2>No spices match these filters</h2>
        <p>Try a different search, broaden the price range, or clear the filters to see the full pantry.</p>
        <button class="btn btn--outline" type="button" data-reset-empty>Clear filters</button>
      </div>`;
      const reset = container.querySelector("[data-reset-empty]");
      if (reset) reset.addEventListener("click", resetFilters);
    } else {
      container.innerHTML = `<div class="product-grid">${filteredProducts
        .map(Kayam.Catalogue.renderProductCard)
        .join("")}</div>`;
      Kayam.Catalogue.setupCardActions(container);
    }
    renderActiveFilters();
    updateUrl();
  }

  function applyFilters() {
    renderResults();
  }

  function resetFilters() {
    state.query = "";
    state.category = "all";
    state.min = null;
    state.max = null;
    state.inStock = false;
    const search = document.getElementById("shop-search");
    if (search) search.value = "";
    syncSearchClear();
    syncFilterForm();
    applyFilters();
  }

  function syncSearchClear() {
    const clear = document.querySelector("[data-clear-search]");
    const search = document.getElementById("shop-search");
    if (clear) clear.hidden = !(search && search.value);
  }

  function bindFilterEvents() {
    const form = document.getElementById("shop-filter-form");
    if (!form) return;
    const minInput = document.getElementById("filter-min-price");
    const maxInput = document.getElementById("filter-max-price");
    const debouncedPrice = Kayam.debounce(function () {
      state.min = parsePriceParam(minInput ? minInput.value : "");
      state.max = parsePriceParam(maxInput ? maxInput.value : "");
      applyFilters();
    }, 350);
    form.addEventListener("change", function (event) {
      if (event.target.name === "category") {
        state.category = event.target.value;
        applyFilters();
      }
      if (event.target.id === "filter-in-stock") {
        state.inStock = event.target.checked;
        applyFilters();
      }
      if (event.target === minInput || event.target === maxInput) {
        debouncedPrice();
      }
    });
    form.addEventListener("input", function (event) {
      if (event.target === minInput || event.target === maxInput) debouncedPrice();
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
    form.addEventListener("reset", function (event) {
      event.preventDefault();
      resetFilters();
    });
    const apply = form.querySelector("[data-apply-filters]");
    if (apply) {
      apply.addEventListener("click", function () {
        applyFilters();
        closeFilters();
        const results = document.getElementById("shop-products");
        if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function renderCatalogueError(error) {
    const container = document.getElementById("shop-products");
    const filters = document.getElementById("shop-filters");
    const isConfig = error && error.code === "NOT_CONFIGURED";
    const message = isConfig
      ? "The online catalogue is being connected. Please contact KAYAM SPICES on WhatsApp for product and price details."
      : "We could not load the spice catalogue. Check your connection and try again.";
    if (filters) {
      filters.innerHTML = `<p class="muted" style="font-size: .78rem;">Filters will be available once the catalogue is connected.</p>`;
    }
    if (container) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("info")}</span>
        <h2>The catalogue is unavailable</h2>
        <p>${Kayam.escapeHTML(message)}</p>
        <div class="empty-state__actions">
          <button class="btn" type="button" data-retry-catalogue>Try again</button>
          <a class="btn btn--outline" href="contact.html">Contact us</a>
        </div>
      </div>`;
      const retry = container.querySelector("[data-retry-catalogue]");
      if (retry) {
        retry.addEventListener("click", function () {
          Kayam.Catalogue.invalidateCache();
          window.location.reload();
        });
      }
    }
    const countNode = document.getElementById("shop-results-count");
    if (countNode) countNode.textContent = "Catalogue unavailable";
  }

  function focusableIn(sidebar) {
    return Array.from(
      sidebar.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(function (element) {
      return element.getClientRects().length > 0;
    });
  }

  function openFilters() {
    const sidebar = document.getElementById("shop-sidebar");
    const trigger = document.querySelector("[data-open-filters]");
    const scrim = document.querySelector("[data-filter-scrim]");
    if (!sidebar) return;
    lastFilterFocus = document.activeElement;
    sidebar.classList.add("is-mobile-open");
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
    document.body.classList.add("is-locked");
    if (scrim) scrim.hidden = false;
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    const close = sidebar.querySelector("[data-close-filters]");
    window.setTimeout(function () {
      if (close) close.focus();
    }, 30);
  }

  function closeFilters() {
    const sidebar = document.getElementById("shop-sidebar");
    const trigger = document.querySelector("[data-open-filters]");
    const scrim = document.querySelector("[data-filter-scrim]");
    if (!sidebar || !sidebar.classList.contains("is-mobile-open")) return;
    sidebar.classList.remove("is-mobile-open");
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
    document.body.classList.remove("is-locked");
    if (scrim) scrim.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    const returnFocus = lastFilterFocus && document.contains(lastFilterFocus) ? lastFilterFocus : trigger;
    lastFilterFocus = null;
    if (returnFocus && window.matchMedia("(max-width: 899px)").matches) returnFocus.focus();
  }

  function initFilterDrawer() {
    const trigger = document.querySelector("[data-open-filters]");
    const scrim = document.querySelector("[data-filter-scrim]");
    const sidebar = document.getElementById("shop-sidebar");
    if (trigger) trigger.addEventListener("click", openFilters);
    if (scrim) scrim.addEventListener("click", closeFilters);
    if (sidebar) {
      const close = sidebar.querySelector("[data-close-filters]");
      if (close) close.addEventListener("click", closeFilters);
      sidebar.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeFilters();
          return;
        }
        if (event.key !== "Tab" || !sidebar.classList.contains("is-mobile-open")) return;
        const focusable = focusableIn(sidebar);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!sidebar.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) closeFilters();
    });
  }

  function initSearchAndSort() {
    const search = document.getElementById("shop-search");
    const clear = document.querySelector("[data-clear-search]");
    const sort = document.getElementById("shop-sort");
    if (search) {
      search.value = state.query;
      const debouncedSearch = Kayam.debounce(function () {
        state.query = search.value;
        syncSearchClear();
        applyFilters();
      }, 220);
      search.addEventListener("input", debouncedSearch);
      search.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && search.value) {
          search.value = "";
          state.query = "";
          syncSearchClear();
          applyFilters();
        }
      });
      syncSearchClear();
    }
    if (clear) {
      clear.addEventListener("click", function () {
        if (search) search.value = "";
        state.query = "";
        syncSearchClear();
        applyFilters();
        if (search) search.focus();
      });
    }
    if (sort) {
      sort.value = state.sort;
      sort.addEventListener("change", function () {
        state.sort = sortValues.has(sort.value) ? sort.value : "featured";
        applyFilters();
      });
    }
  }

  function configureVariantDependentControls() {
    if (!catalogue) return;
    const hasVariantData = catalogue.products.some((product) => product.variants && product.variants.length > 0);
    const hasCreatedDates = catalogue.products.some((product) => Boolean(product.created_at));
    if (!hasVariantData) {
      state.min = null;
      state.max = null;
      state.inStock = false;
      if (state.sort === "price-asc" || state.sort === "price-desc" || state.sort === "newest") state.sort = "featured";
    } else if (!hasCreatedDates && state.sort === "newest") {
      state.sort = "featured";
    }
    const sort = document.getElementById("shop-sort");
    if (sort) {
      ["price-asc", "price-desc"].forEach(function (value) {
        const option = sort.querySelector(`option[value="${value}"]`);
        if (option) {
          option.hidden = !hasVariantData;
          option.disabled = !hasVariantData;
        }
      });
      const newest = sort.querySelector('option[value="newest"]');
      if (newest) {
        newest.hidden = !hasCreatedDates;
        newest.disabled = !hasCreatedDates;
      }
      sort.value = state.sort;
    }
  }

  async function init() {
    initFilterDrawer();
    initSearchAndSort();
    try {
      catalogue = await Kayam.Catalogue.loadAll();
      configureVariantDependentControls();
      renderFilters();
      applyFilters();
      if (params.get("focus") === "search") {
        const search = document.getElementById("shop-search");
        if (search) {
          search.focus({ preventScroll: false });
          params.delete("focus");
        }
      }
    } catch (error) {
      console.error(error);
      renderCatalogueError(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
