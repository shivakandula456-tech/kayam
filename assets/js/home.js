(function () {
  "use strict";

  const Kayam = window.Kayam;
  const categoryImages = {
    "spice-powders": "assets/images/category-spice-powders.jpg",
    "traditional-masalas": "assets/images/category-traditional-masalas.jpg",
    premixes: "assets/images/category-premixes.jpg",
    "cooking-masalas": "assets/images/category-cooking-masalas.jpg",
    "podi-chutney-powders": "assets/images/category-podi-chutney.jpg",
  };

  function categoryMarkup(category, count) {
    const image = categoryImages[category.slug] || "assets/images/category-spice-powders.jpg";
    const countLabel = count === 1 ? "1 product" : `${count} products`;
    return `<a class="category-card" href="shop.html?category=${encodeURIComponent(category.slug)}" data-reveal>
      <img src="${image}" alt="" width="900" height="600" loading="lazy" decoding="async">
      <span class="category-card__content">
        <span class="category-card__count">${Kayam.escapeHTML(countLabel)}</span>
        <span class="category-card__title">${Kayam.escapeHTML(category.name)}</span>
        <span class="category-card__action">Explore ${Kayam.icon("arrow")}</span>
      </span>
    </a>`;
  }

  function renderCategories(data) {
    const container = document.getElementById("home-category-grid");
    if (!container) return;
    if (!data.categories.length) {
      container.className = "";
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("spice")}</span>
        <h3>The pantry is being prepared</h3>
        <p>Categories will appear here once the catalogue is set up. You can still contact KAYAM SPICES for assistance.</p>
        <a class="btn btn--outline" href="contact.html">Contact KAYAM SPICES</a>
      </div>`;
      return;
    }
    const productCounts = new Map();
    data.products.forEach(function (product) {
      productCounts.set(product.category_id, (productCounts.get(product.category_id) || 0) + 1);
    });
    container.innerHTML = data.categories
      .map((category) => categoryMarkup(category, productCounts.get(category.id) || 0))
      .join("");
    container.querySelectorAll("[data-reveal]").forEach(function (element, index) {
      element.classList.add("is-visible");
      element.style.transitionDelay = `${index * 60}ms`;
    });
    const categoryStat = document.querySelector("[data-category-count]");
    const productStat = document.querySelector("[data-product-count]");
    if (categoryStat) categoryStat.textContent = String(data.categories.length).padStart(2, "0");
    if (productStat) productStat.textContent = String(data.products.length).padStart(2, "0");
  }

  function renderFeatured(data) {
    const container = document.getElementById("featured-products");
    const title = document.getElementById("featured-title");
    if (!container) return;
    const featured = data.products.filter((product) => product.is_featured);
    const selection = (featured.length ? featured : data.products).slice(0, 4);
    if (title && !featured.length) title.textContent = "From our pantry.";
    if (!selection.length) {
      container.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("bag")}</span>
        <h3>The online pantry is being prepared</h3>
        <p>Products will appear here once they have been published. For help with an order, contact KAYAM SPICES directly.</p>
        <div class="empty-state__actions">
          <a class="btn" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} WhatsApp</a>
          <a class="btn btn--outline" href="shop.html">Visit the shop</a>
        </div>
      </div>`;
      return;
    }
    container.innerHTML = `<div class="product-grid">${selection.map(Kayam.Catalogue.renderProductCard).join("")}</div>`;
    Kayam.Catalogue.setupCardActions(container);
  }

  function renderError(error) {
    const message =
      error && error.code === "NOT_CONFIGURED"
        ? "The online catalogue is being connected. Please contact KAYAM SPICES on WhatsApp for products and prices."
        : "The catalogue could not load right now. Please try again or contact KAYAM SPICES.";
    const categoryContainer = document.getElementById("home-category-grid");
    if (categoryContainer) {
      categoryContainer.className = "";
      categoryContainer.innerHTML = `<div class="alert alert--warning" role="status"><span aria-hidden="true">${Kayam.icon(
        "info",
      )}</span><div><strong class="alert__title">Catalogue unavailable</strong>${Kayam.escapeHTML(message)}</div></div>`;
    }
    const featuredContainer = document.getElementById("featured-products");
    if (featuredContainer) {
      featuredContainer.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${Kayam.icon("spice")}</span>
        <h3>We cannot show products just now</h3>
        <p>${Kayam.escapeHTML(message)}</p>
        <div class="empty-state__actions">
          <a class="btn" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Chat on WhatsApp</a>
          <button class="btn btn--outline" type="button" data-retry-catalogue>Try again</button>
        </div>
      </div>`;
      const retry = featuredContainer.querySelector("[data-retry-catalogue]");
      if (retry) {
        retry.addEventListener("click", function () {
          window.location.reload();
        });
      }
    }
    const stats = document.querySelectorAll("[data-category-count], [data-product-count]");
    stats.forEach(function (node) {
      node.textContent = "—";
    });
  }

  async function init() {
    if (!document.getElementById("featured-products")) return;
    try {
      const data = await Kayam.Catalogue.loadAll();
      renderCategories(data);
      renderFeatured(data);
    } catch (error) {
      console.error(error);
      renderError(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
