(function () {
  "use strict";

  const Kayam = window.Kayam;
  const slug = new URLSearchParams(window.location.search).get("slug");
  let product = null;
  let selectedVariant = null;

  function formatText(value) {
    if (!value) return "";
    return Kayam.escapeHTML(value)
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return `<p>${paragraph.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
  }

  function setMeta(selector, attribute, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute(attribute, value);
  }

  function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function responsivePexelsAttrs(url, sizes, widths) {
    const match = String(url || "").match(/images[.]pexels[.]com[/]photos[/]([0-9]+)[/]pexels-photo-[0-9]+[.]jpeg/i);
    if (!match) return "";
    const candidates = (widths || [320, 480, 800, 1200]).map(function (width) {
      return `https://images.pexels.com/photos/${match[1]}/pexels-photo-${match[1]}.jpeg?auto=compress&cs=tinysrgb&w=${width} ${width}w`;
    }).join(", ");
    return `srcset="${Kayam.escapeHTML(candidates)}" sizes="${Kayam.escapeHTML(sizes || "100vw")}"`;
  }

  function setStructuredData(data) {
    let script = document.getElementById("product-structured-data");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "product-structured-data";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  function updateHead() {
    if (!product) return;
    const description = product.short_description || product.description || "Explore this product from the KAYAM SPICES pantry.";
    document.title = `${product.name} | KAYAM SPICES`;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", `${product.name} | KAYAM SPICES`);
    setMeta('meta[property="og:description"]', "content", description);
    if (product.imageUrl) {
      const absoluteImage = new URL(product.imageUrl, window.location.href).href;
      setMeta('meta[property="og:image"]', "content", absoluteImage);
    }
    const canonical = new URL(`product.html?slug=${encodeURIComponent(product.slug)}`, window.location.href);
    canonical.search = `?slug=${encodeURIComponent(product.slug)}`;
    canonical.hash = "";
    setCanonical(canonical.href);
    const offers = product.variants.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: (product.lowestPricePaise / 100).toFixed(2),
          offerCount: product.variants.length,
          availability: product.hasAvailableVariant ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : undefined;
    setStructuredData({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: description,
      category: product.categoryName,
      brand: { "@type": "Brand", name: "KAYAM SPICES" },
      image: [new URL(product.imageUrl, window.location.href).href],
      ...(offers ? { offers } : {}),
    });
  }

  function updateBreadcrumb() {
    const nav = document.getElementById("product-breadcrumbs");
    if (!nav || !product) return;
    nav.innerHTML = `<li><a href="index.html">Home</a></li>
      <li><a href="shop.html">Shop</a></li>
      ${product.categorySlug ? `<li><a href="shop.html?category=${encodeURIComponent(product.categorySlug)}">${Kayam.escapeHTML(product.categoryName)}</a></li>` : ""}
      <li aria-current="page">${Kayam.escapeHTML(product.name)}</li>`;
  }

  function galleryMarkup() {
    const images = product.images.length ? product.images : [{
      id: "placeholder",
      url: Kayam.Catalogue.placeholder,
      altText: `${product.name} image placeholder`,
    }];
    const main = images[0];
    const thumbs = images.length > 1
      ? `<div class="product-gallery__thumbs" aria-label="Product images">
          ${images
            .map(function (image, index) {
              return `<button class="product-gallery__thumb" type="button" data-gallery-index="${index}" aria-pressed="${index === 0 ? "true" : "false"}" aria-label="View image ${index + 1}">
                <img src="${Kayam.escapeHTML(image.url)}" ${responsivePexelsAttrs(image.url, "110px", [160, 240, 320, 480])} alt="" width="180" height="220" loading="lazy" data-fallback="${Kayam.Catalogue.placeholder}">
              </button>`;
            })
            .join("")}
        </div>`
      : "";
    return `<div class="product-gallery">
      <div class="product-gallery__main">
        <img id="product-main-image" src="${Kayam.escapeHTML(main.url)}" ${responsivePexelsAttrs(main.url, "(max-width: 899px) 100vw, (max-width: 1299px) 50vw, 720px", [480, 640, 800, 1200, 1600])} alt="${Kayam.escapeHTML(
          main.altText || product.name,
        )}" width="900" height="1125" fetchpriority="high" data-fallback="${Kayam.Catalogue.placeholder}">
        <span class="product-card__badges" id="product-main-badges">
          ${product.onSale ? '<span class="badge badge--sale">Sale</span>' : ""}
          ${product.isOutOfStock ? '<span class="badge badge--muted">Out of stock</span>' : ""}
        </span>
      </div>
      ${thumbs}
    </div>`;
  }

  function variantMarkup() {
    if (!product.variants.length) return "";
    return `<fieldset class="variant-fieldset">
      <legend class="sr-only">Choose a weight</legend>
      <div class="variant-label"><span>Choose weight</span><a href="contact.html">Need help?</a></div>
      <div class="variant-options">
        ${product.variants
          .map(function (variant) {
            const checked = selectedVariant && selectedVariant.id === variant.id;
            return `<label class="variant-option">
              <input type="radio" name="product-variant" value="${Kayam.escapeHTML(variant.id)}"${checked ? " checked" : ""}${
                variant.inStock ? "" : " disabled"
              }>
              <span>${Kayam.escapeHTML(variant.label)}${variant.inStock ? "" : " <small>Sold out</small>"}</span>
            </label>`;
          })
          .join("")}
      </div>
    </fieldset>`;
  }

  function purchaseMarkup() {
    if (!product.variants.length) {
      return `<div class="alert alert--warning" role="status">
        <span aria-hidden="true">${Kayam.icon("info")}</span>
        <div><strong class="alert__title">Pricing is being finalised</strong>This product is in the KAYAM SPICES pantry, but its weight options and prices have not been published yet. Please contact us for details.</div>
      </div>
      <div class="purchase-row" style="margin-top: 1rem;">
        <a class="btn btn--whatsapp btn--block" id="product-whatsapp" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Enquire on WhatsApp</a>
      </div>`;
    }
    const allOut = !product.hasAvailableVariant;
    const maxQuantity = selectedVariant && selectedVariant.trackStock ? Math.min(selectedVariant.stockQuantity, 99) : 99;
    return `${variantMarkup()}
      <div class="product-info__price" id="selected-price" aria-live="polite"></div>
      <p class="product-info__stock" id="selected-stock"></p>
      <div class="purchase-row">
        <div class="quantity" aria-label="Quantity">
          <button type="button" data-quantity-step="-1" aria-label="Decrease quantity"${allOut ? " disabled" : ""}>${Kayam.icon("minus")}</button>
          <label class="sr-only" for="product-quantity">Quantity</label>
          <input id="product-quantity" type="number" inputmode="numeric" min="1" max="${maxQuantity}" value="1"${allOut ? " disabled" : ""}>
          <button type="button" data-quantity-step="1" aria-label="Increase quantity"${allOut ? " disabled" : ""}>${Kayam.icon("plus")}</button>
        </div>
        <button class="btn btn--dark" id="add-to-cart" type="button"${allOut ? " disabled" : ""}>${Kayam.icon("bag")} Add to cart</button>
        <a class="btn btn--whatsapp" id="product-whatsapp" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} Enquire</a>
      </div>`;
  }

  function detailsMarkup() {
    const description = product.description || product.short_description;
    const descriptionAccordion = description
      ? ""
      : `<div class="accordion-item">
          <button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="true" aria-controls="details-description">Product details<span aria-hidden="true">${Kayam.icon("plus")}</span></button>
          <div class="accordion-panel" id="details-description"><p>Full product description is being prepared. Please contact KAYAM SPICES for details.</p></div>
        </div>`;
    const ingredients = product.ingredients
      ? `<div class="accordion-item">
          <button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="details-ingredients">Ingredients<span aria-hidden="true">${Kayam.icon("plus")}</span></button>
          <div class="accordion-panel" id="details-ingredients" hidden>${formatText(product.ingredients)}</div>
        </div>`
      : "";
    const descriptionBlock = description
      ? `<div class="accordion-item">
          <button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="details-description">Product details<span aria-hidden="true">${Kayam.icon("plus")}</span></button>
          <div class="accordion-panel" id="details-description" hidden>${formatText(description)}</div>
        </div>`
      : descriptionAccordion;
    return `<div class="product-accordion">
      ${descriptionBlock}
      ${ingredients}
      <div class="accordion-item">
        <button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="details-ordering">Ordering &amp; delivery<span aria-hidden="true">${Kayam.icon("plus")}</span></button>
        <div class="accordion-panel" id="details-ordering" hidden>
          <p>Orders are saved here and then opened in WhatsApp with your order reference. Delivery availability, delivery charges, and the final payable amount are confirmed by KAYAM SPICES on WhatsApp. Payment is arranged separately with the business. No payment is collected on this website.</p>
        </div>
      </div>
    </div>`;
  }

  function renderProduct() {
    const container = document.getElementById("product-detail");
    if (!container) return;
    const shortDescription =
      product.short_description ||
      product.description ||
      "A product from the KAYAM SPICES pantry. Full details are being prepared.";
    const stockMessage = !product.hasVariants
      ? "Weights and prices to be confirmed"
      : product.hasAvailableVariant
        ? "Available to order"
        : "Currently out of stock";
    container.classList.remove("fade-in");
    container.innerHTML = `${galleryMarkup()}
      <div class="product-info">
        <header class="product-info__header">
          ${product.categorySlug ? `<p class="product-info__category"><a href="shop.html?category=${encodeURIComponent(product.categorySlug)}">${Kayam.escapeHTML(product.categoryName)}</a></p>` : ""}
          <h1>${Kayam.escapeHTML(product.name)}</h1>
          <p class="product-info__desc">${Kayam.escapeHTML(shortDescription)}</p>
          ${product.hasVariants ? "" : `<p class="product-info__stock">${stockMessage}</p>`}
        </header>
        ${purchaseMarkup()}
        <div class="product-notes">
          <div class="product-note">${Kayam.icon("shield")}<span>Your order is saved securely before WhatsApp opens.</span></div>
          <div class="product-note">${Kayam.icon("whatsapp")}<span>Delivery details and payment are confirmed personally by KAYAM SPICES.</span></div>
        </div>
        ${detailsMarkup()}
      </div>`;
    container.classList.add("fade-in");
    bindGallery();
    bindPurchase();
    bindAccordions();
  }

  function bindGallery() {
    const buttons = document.querySelectorAll("[data-gallery-index]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        const index = Number(button.dataset.galleryIndex);
        const image = product.images[index];
        const main = document.getElementById("product-main-image");
        if (!image || !main) return;
        main.src = image.url;
        main.alt = image.altText || product.name;
        buttons.forEach(function (entry) {
          entry.setAttribute("aria-pressed", entry === button ? "true" : "false");
        });
      });
    });
  }

  function updateSelectedVariant() {
    if (!selectedVariant) return;
    const priceNode = document.getElementById("selected-price");
    const stockNode = document.getElementById("selected-stock");
    const addButton = document.getElementById("add-to-cart");
    const quantityInput = document.getElementById("product-quantity");
    const whatsappLink = document.getElementById("product-whatsapp");
    if (priceNode) {
      const oldPrice =
        selectedVariant.onSale && selectedVariant.salePricePaise !== null
          ? `<span class="price-old">${Kayam.formatMoney(selectedVariant.pricePaise)}</span>`
          : "";
      priceNode.innerHTML = `<span class="price${selectedVariant.onSale ? " price--sale" : ""}">${Kayam.formatMoney(
        selectedVariant.effectivePricePaise,
      )}</span>${oldPrice}<span class="price--from">${Kayam.escapeHTML(selectedVariant.label)}</span>`;
    }
    if (stockNode) {
      stockNode.textContent = selectedVariant.inStock
        ? selectedVariant.trackStock
          ? `In stock · ${selectedVariant.stockQuantity} available`
          : "In stock"
        : "This weight is currently out of stock.";
      stockNode.classList.toggle("product-info__stock--out", !selectedVariant.inStock);
    }
    if (addButton) addButton.disabled = !selectedVariant.inStock;
    if (quantityInput) {
      const max = selectedVariant.trackStock ? Math.min(selectedVariant.stockQuantity, 99) : 99;
      quantityInput.max = String(Math.max(1, max));
      if (Number(quantityInput.value) > max || Number(quantityInput.value) < 1) {
        quantityInput.value = String(Math.max(1, Math.min(Number(quantityInput.value) || 1, max)));
      }
      quantityInput.disabled = !selectedVariant.inStock;
    }
    document.querySelectorAll("[data-quantity-step]").forEach(function (button) {
      button.disabled = !selectedVariant.inStock;
    });
    if (whatsappLink && window.Kayam.whatsapp) {
      whatsappLink.href = window.Kayam.whatsapp.buildWhatsAppUrl(
        window.Kayam.whatsapp.buildProductEnquiry(product, selectedVariant),
      );
    }
  }

  function bindPurchase() {
    if (!product.variants.length) {
      const whatsapp = document.getElementById("product-whatsapp");
      if (whatsapp && window.Kayam.whatsapp) {
        whatsapp.href = window.Kayam.whatsapp.buildWhatsAppUrl(window.Kayam.whatsapp.buildProductEnquiry(product, null));
      }
      return;
    }
    const radios = Array.from(document.querySelectorAll('input[name="product-variant"]'));
    radios.forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (!radio.checked) return;
        selectedVariant = product.variants.find((variant) => variant.id === radio.value) || null;
        updateSelectedVariant();
      });
    });
    const input = document.getElementById("product-quantity");
    const addButton = document.getElementById("add-to-cart");
    if (input) {
      input.addEventListener("change", function () {
        const max = Number(input.max) || 99;
        let value = Math.floor(Number(input.value));
        if (!Number.isFinite(value) || value < 1) value = 1;
        if (value > max) value = max;
        input.value = String(value);
      });
    }
    document.querySelectorAll("[data-quantity-step]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!input) return;
        const max = Number(input.max) || 99;
        const step = Number(button.dataset.quantityStep);
        let value = (Math.floor(Number(input.value)) || 1) + step;
        value = Math.max(1, Math.min(value, max));
        input.value = String(value);
      });
    });
    if (addButton) {
      addButton.addEventListener("click", function () {
        if (!selectedVariant) {
          Kayam.showToast("Choose a weight before adding to the cart.", "error");
          return;
        }
        const quantity = Math.max(1, Math.floor(Number(input && input.value)) || 1);
        addButton.setAttribute("aria-busy", "true");
        Kayam.Cart.addProduct(product, selectedVariant, quantity)
          .then(function () {
            Kayam.showToast(`${product.name} added to your cart.`, "success");
          })
          .catch(function (error) {
            Kayam.showToast(error.message || "This item could not be added to the cart.", "error");
          })
          .finally(function () {
            addButton.removeAttribute("aria-busy");
          });
      });
    }
    updateSelectedVariant();
  }

  function bindAccordions() {
    document.querySelectorAll("[data-accordion-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        trigger.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  function renderNotFound(message) {
    const container = document.getElementById("product-detail");
    const breadcrumbs = document.getElementById("product-breadcrumbs");
    if (breadcrumbs) {
      breadcrumbs.innerHTML = `<li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li><li aria-current="page">Product unavailable</li>`;
    }
    if (!container) return;
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
      <span class="empty-state__icon">${Kayam.icon("spice")}</span>
      <h1>${message.title}</h1>
      <p>${Kayam.escapeHTML(message.description)}</p>
      <div class="empty-state__actions">
        <a class="btn" href="shop.html">Browse the shop</a>
        <a class="btn btn--outline" href="https://wa.me/917888060231" target="_blank" rel="noopener">${Kayam.icon("whatsapp")} WhatsApp</a>
      </div>
    </div>`;
    document.title = `${message.title} | KAYAM SPICES`;
  }

  async function init() {
    if (!slug) {
      renderNotFound({
        title: "Product not found",
        description: "No product was selected. Browse the spice pantry to find what you are looking for.",
      });
      return;
    }
    try {
      product = await Kayam.Catalogue.findProduct(slug);
      if (!product) {
        renderNotFound({
          title: "This spice is not available",
          description: "The product may have been unpublished or the link may be incorrect. Explore the current pantry instead.",
        });
        return;
      }
      selectedVariant = product.availableVariants[0] || product.variants[0] || null;
      updateHead();
      updateBreadcrumb();
      renderProduct();
    } catch (error) {
      console.error(error);
      const isConfig = error && error.code === "NOT_CONFIGURED";
      renderNotFound({
        title: "The catalogue is unavailable",
        description: isConfig
          ? "The online catalogue is being connected. Please contact KAYAM SPICES on WhatsApp for product details."
          : "We could not load this product. Check your connection and try again.",
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
