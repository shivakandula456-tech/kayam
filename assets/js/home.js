(function () {
  "use strict";

  const Kayam = window.Kayam;
  function pexelsImageUrl(id, width) {
    return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width || 960}`;
  }

  function pexelsImageSrcSet(id, widths) {
    return widths.map(function (width) {
      return `${pexelsImageUrl(id, width)} ${width}w`;
    }).join(", ");
  }

  const categoryImages = {
    "spice-powders": { id: 6808976, alt: "A colourful display of red, orange, and yellow spice powders in round bowls." },
    "traditional-masalas": { id: 4871347, alt: "A stone mortar and pestle with whole spices on a wooden surface." },
    premixes: { id: 5504609, alt: "Pyramids of coloured spice powders displayed at a spice market." },
    "cooking-masalas": { id: 20408461, alt: "An Indian curry dish served with bowls of spices and herbs." },
    "podi-chutney-powders": { id: 32144893, alt: "A bowl of ground spice blend surrounded by nuts and dried red chillies." },
  };

  function categoryMarkup(category, count) {
    const image = categoryImages[category.slug] || categoryImages["spice-powders"];
    const countLabel = count === 1 ? "1 product" : `${count} products`;
    return `<a class="category-card" href="shop.html?category=${encodeURIComponent(category.slug)}" data-reveal>
      <img src="${Kayam.escapeHTML(pexelsImageUrl(image.id, 960))}" srcset="${Kayam.escapeHTML(pexelsImageSrcSet(image.id, [320, 480, 640, 960, 1200]))}" sizes="(max-width: 899px) 78vw, (max-width: 1199px) 32vw, 20vw" alt="${Kayam.escapeHTML(image.alt)}" width="900" height="600" loading="lazy" decoding="async">
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
