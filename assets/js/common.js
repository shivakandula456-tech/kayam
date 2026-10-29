(function () {
  "use strict";

  const Kayam = (window.Kayam = window.Kayam || {});
  const config = window.KAYAM_CONFIG || {};

  const icons = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 11H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20.3 11.7a8.25 8.25 0 0 1-12.2 7.3L4 20l1.1-4a8.25 8.25 0 1 1 15.2-4.3Z"/><path d="M8.7 8.6c.3 2.7 2.5 5 5.1 5.5l1.2-1.1 2.1.7-.4 1.6c-2.9.6-6.9-2.2-8.2-5.7l1.4-.6-.7-1.8-1.1.2c.1-.2.3-.4.6-.4Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M14 6l6 6-6 6"/></svg>',
    arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 21 20H3L12 3.6Z"/><path d="M12 9v5M12 17.2v.1"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.8V17M12 7.2v.1"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6h17M6.5 12h11M10 18h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    spice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4.4 0-7.3-2.9-7.3-6.6C4.7 9.9 8.5 7 12 3c1.1 3.1 3.1 3.9 4.3 6.2 1.3 2.2.9 4.5-.3 6.1"/><path d="M12 17c-2.1 0-3.5-1.4-3.5-3.2 0-2.1 1.8-3.5 3.5-5.5.8 1.6 2.1 2.2 2.6 3.6.4 1.2.2 2.5-.3 3.4"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C12 4 5 8.3 5 15.5c0 1.6.4 3 1.1 4.2C8.6 14.5 13 10.4 18 8.3c-5.7 3.3-9.3 8.1-10.4 13.4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8h13l-.8 12H6.3L5.5 8Z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5L8 5.5Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c.6 4.8 3.3 7.5 8.1 8.1-4.8.6-7.5 3.3-8.1 8.1-.6-4.8-3.3-7.5-8.1-8.1 4.8-.6 7.5-3.3 8.1-8.1Z"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8.5" cy="8.5" r="1"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.2 13.5a7.6 7.6 0 0 0 .1-3l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2.6-1.5L14.1 2h-4.2L9.6 5.1A7.4 7.4 0 0 0 7 6.6L4.7 5.6l-2 3.4 2 1.5a7.6 7.6 0 0 0 .1 3l-2.1 1.4 2 3.4 2.3-1a7.4 7.4 0 0 0 2.6 1.5l.3 3.1h4.2l.3-3.1a7.4 7.4 0 0 0 2.6-1.5l2.3 1 2-3.4-2.1-1.4Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5.5 4 4M5 19l1-5L16.5 3.5l4 4L10 18l-5 1Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 8.3A7.5 7.5 0 0 1 20 12M18 15.7A7.5 7.5 0 0 1 4 12"/></svg>',
  };

  const statusLabels = {
    pending_confirmation: "Pending confirmation",
    confirmed: "Confirmed",
    processing: "Processing",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (error) {
        return false;
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    },
  };

  const session = {
    get(key, fallback) {
      try {
        const value = window.sessionStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
        return true;
      } catch (error) {
        return false;
      }
    },
    remove(key) {
      try {
        window.sessionStorage.removeItem(key);
        return true;
      } catch (error) {
        return false;
      }
    },
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function moneyToPaise(value) {
    if (value === null || value === undefined || value === "") return 0;
    const raw = String(value).trim().replace(/,/g, "");
    const match = raw.match(/^(\d+)(?:\.(\d{0,2}))?$/);
    if (!match) {
      const numeric = Number(raw);
      return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
    }
    return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  }

  function paiseToDecimal(value) {
    const paise = Number(value) || 0;
    return (paise / 100).toFixed(2);
  }

  function formatMoney(paise, options) {
    const opts = options || {};
    const amount = (Number(paise) || 0) / 100;
    return new Intl.NumberFormat(config.LOCALE || "en-IN", {
      style: "currency",
      currency: config.CURRENCY || "INR",
      minimumFractionDigits: opts.decimals ? 2 : 0,
      maximumFractionDigits: opts.decimals ? 2 : 2,
    }).format(amount);
  }

  function formatWeight(value, unit) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value || "");
    const weight = Number.isInteger(numeric) ? String(numeric) : String(numeric).replace(/0+$/, "").replace(/\.$/, "");
    const labels = { g: "g", kg: "kg", ml: "ml", l: "L" };
    return `${weight} ${labels[unit] || unit || ""}`.trim();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function formatDate(value, withTime) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(config.LOCALE || "en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
  }

  function normalisePhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
  }

  function icon(name, className) {
    const markup = icons[name] || "";
    if (!className || !markup) return markup;
    return markup.replace("<svg ", `<svg class="${escapeHTML(className)}" `);
  }

  function getCartCount() {
    if (window.KayamCart && typeof window.KayamCart.count === "function") {
      return window.KayamCart.count();
    }
    try {
      const raw = window.localStorage.getItem("kayam.cart.v1");
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(function (total, item) {
        return total + (Number(item.quantity) || 0);
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll("[data-cart-count]").forEach(function (node) {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
    document.querySelectorAll("[data-cart-link]").forEach(function (link) {
      link.setAttribute("aria-label", count ? `Shopping cart, ${count} items` : "Shopping cart");
    });
  }

  function showToast(message, type, duration) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${type || "info"}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.innerHTML = `<span aria-hidden="true">${icon(type === "error" ? "alert" : type === "success" ? "check" : "info")}</span><span></span>`;
    toast.lastElementChild.textContent = String(message || "");
    stack.appendChild(toast);
    const timeout = window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () {
        toast.remove();
      }, 260);
    }, duration || 4600);
    toast.addEventListener("click", function () {
      clearTimeout(timeout);
      toast.remove();
    });
  }

  function renderHeader() {
    const active = document.body.dataset.page || "";
    const announcementDismissed = session.get("kayam.announcement.dismissed", "0") === "1";
    const navItems = [
      ["home", "Home", "index.html"],
      ["shop", "Shop", "shop.html"],
      ["story", "Our Story", "story.html"],
      ["contact", "Contact", "contact.html"],
    ];
    const categoryItems = [
      ["spice-powders", "Spice Powders"],
      ["traditional-masalas", "Traditional Masalas"],
      ["premixes", "Premixes"],
      ["cooking-masalas", "Cooking Masalas"],
      ["podi-chutney-powders", "Podi & Chutney Powders"],
    ];
    const categoryMenuMarkup = categoryItems
      .map(function (item) {
        return `<li><a href="shop.html?category=${encodeURIComponent(item[0])}">${escapeHTML(item[1])}<span aria-hidden="true">${icon("arrowUpRight")}</span></a></li>`;
      })
      .join("");
    const navMarkup = navItems
      .map(function (item) {
        const isActive = active === item[0];
        const hasCategories = item[0] === "shop";
        return `<li class="primary-nav__item${hasCategories ? " primary-nav__item--shop" : ""}">
          <a class="primary-nav__link" href="${item[2]}"${isActive ? ' aria-current="page"' : ""}${hasCategories ? ' aria-haspopup="true"' : ""}>
            ${item[1]}${hasCategories ? '<span class="primary-nav__caret" aria-hidden="true"></span>' : ""}
          </a>
          ${hasCategories ? `<ul class="category-menu" aria-label="Shop by category">
            <li class="category-menu__eyebrow">Explore the pantry</li>
            ${categoryMenuMarkup}
          </ul>` : ""}
        </li>`;
      })
      .join("");
    const drawerMarkup = navItems
      .map(function (item) {
        const isActive = active === item[0];
        const categoryLinks = item[0] === "shop"
          ? `<ul class="nav-drawer__subnav" aria-label="Shop by category">${categoryItems.map(function (category) {
              return `<li><a href="shop.html?category=${encodeURIComponent(category[0])}">${escapeHTML(category[1])}</a></li>`;
            }).join("")}</ul>`
          : "";
        return `<li><a href="${item[2]}"${isActive ? ' aria-current="page"' : ""}>${item[1]}</a>${categoryLinks}</li>`;
      })
      .join("");
    const announcement = announcementDismissed
      ? ""
      : `<div class="announcement-bar" data-announcement>
          <div class="container announcement-bar__inner">
            <span>Delivery details and payment are confirmed personally on WhatsApp</span>
            <button class="announcement-bar__close" type="button" data-dismiss-announcement aria-label="Dismiss announcement">${icon("close")}</button>
          </div>
        </div>`;
    const whatsappHref = `https://wa.me/${escapeHTML(config.WHATSAPP_NUMBER || "917888060231")}`;
    const searchIsActive = active === "shop" && new URLSearchParams(window.location.search).get("focus") === "search";
    const quickNav = active.startsWith("admin")
      ? ""
      : `<nav class="mobile-bottom-nav" aria-label="Quick navigation">
          <a class="mobile-bottom-nav__item${active === "home" ? " is-active" : ""}" href="index.html"${active === "home" ? ' aria-current="page"' : ""}>
            ${icon("home")}<span>Home</span>
          </a>
          <a class="mobile-bottom-nav__item${active === "shop" && !searchIsActive ? " is-active" : ""}" href="shop.html"${active === "shop" && !searchIsActive ? ' aria-current="page"' : ""}>
            ${icon("spice")}<span>Shop</span>
          </a>
          <a class="mobile-bottom-nav__item${searchIsActive ? " is-active" : ""}" href="shop.html?focus=search"${searchIsActive ? ' aria-current="page"' : ""} aria-label="Search spices">
            ${icon("search")}<span>Search</span>
          </a>
          <a class="mobile-bottom-nav__item${active === "cart" ? " is-active" : ""}" href="cart.html"${active === "cart" ? ' aria-current="page"' : ""} aria-label="Shopping bag">
            ${icon("bag")}<span>Bag</span><span class="mobile-bottom-nav__count" data-cart-count hidden>0</span>
          </a>
        </nav>`;

    return `${announcement}
      <header class="site-header">
        <div class="container--wide header-inner">
          <a class="brand" href="index.html" aria-label="KAYAM SPICES home">
            <img class="brand__logo" src="assets/images/kayam-wordmark.svg" alt="KAYAM SPICES" width="460" height="118" decoding="async">
          </a>
          <nav class="primary-nav" aria-label="Primary navigation">
            <ul class="primary-nav__list">${navMarkup}</ul>
          </nav>
          <div class="header-actions">
            <a class="header-action" href="shop.html?focus=search" aria-label="Search spices">${icon("search")}</a>
            <a class="header-action header-action--contact" href="https://wa.me/${escapeHTML(config.WHATSAPP_NUMBER || "917888060231")}" target="_blank" rel="noopener" aria-label="Contact KAYAM SPICES on WhatsApp">${icon("whatsapp")}</a>
            <a class="header-action" href="cart.html" data-cart-link aria-label="Shopping cart">${icon("cart")}<span class="cart-count" data-cart-count hidden>0</span></a>
            <button class="header-action menu-toggle" type="button" data-menu-toggle aria-controls="nav-drawer" aria-expanded="false" aria-label="Open navigation menu">${icon("menu")}</button>
          </div>
        </div>
      </header>
      <div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <button class="nav-drawer__scrim" type="button" data-menu-close aria-label="Close navigation menu" tabindex="-1"></button>
        <div class="nav-drawer__panel">
          <div class="nav-drawer__top">
            <a class="brand brand--drawer" href="index.html" aria-label="KAYAM SPICES home">
              <img class="brand__logo" src="assets/images/kayam-wordmark.svg" alt="KAYAM SPICES" width="460" height="118" decoding="async">
            </a>
            <button class="nav-drawer__close" type="button" data-menu-close aria-label="Close navigation menu">${icon("close")}</button>
          </div>
          <nav aria-label="Mobile navigation">
            <ul class="nav-drawer__links">${drawerMarkup}</ul>
          </nav>
          <div class="nav-drawer__footer">
            <a class="btn btn--dark btn--block" href="https://wa.me/${escapeHTML(config.WHATSAPP_NUMBER || "917888060231")}" target="_blank" rel="noopener">${icon("whatsapp")} Chat on WhatsApp</a>
            <a href="mailto:${escapeHTML(config.CONTACT_EMAIL || "anikhindi.suchi@gmail.com")}">${escapeHTML(config.CONTACT_EMAIL || "anikhindi.suchi@gmail.com")}</a>
            <span>Pure Spices, Real Flavours</span>
          </div>
        </div>
      </div>${quickNav}`;
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    const whatsappUrl = `https://wa.me/${String(config.WHATSAPP_NUMBER || "917888060231").replace(/\D/g, "")}`;
    const email = config.CONTACT_EMAIL || "anikhindi.suchi@gmail.com";
    return `<footer class="site-footer">
      <div class="container footer-main">
        <div class="footer-brand">
          <div class="footer-brand__lockup">
            <img class="footer-brand__logo" src="assets/images/kayam-wordmark-light.svg" alt="KAYAM SPICES" width="460" height="118" loading="lazy" decoding="async">
          </div>
          <p>Pure spices and traditional Indian blends for the everyday table. Explore the pantry, choose your weight, and confirm your order personally on WhatsApp.</p>
        </div>
        <div class="footer-col">
          <h2>Explore</h2>
          <ul>
            <li><a href="shop.html">All spices</a></li>
            <li><a href="shop.html?category=spice-powders">Spice powders</a></li>
            <li><a href="shop.html?category=traditional-masalas">Traditional masalas</a></li>
            <li><a href="shop.html?category=premixes">Premixes</a></li>
            <li><a href="shop.html?category=cooking-masalas">Cooking masalas</a></li>
            <li><a href="shop.html?category=podi-chutney-powders">Podi &amp; chutney</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h2>KAYAM</h2>
          <ul>
            <li><a href="story.html">Our story</a></li>
            <li><a href="contact.html">Contact &amp; enquiries</a></li>
            <li><a href="privacy.html">Privacy</a></li>
            <li><a href="terms.html">Terms of use</a></li>
            <li><a href="admin/login.html">Administrator</a></li>
          </ul>
        </div>
        <div class="footer-col footer-col--contact">
          <h2>Talk to us</h2>
          <div class="footer-contact">
            <a href="${escapeHTML(whatsappUrl)}" target="_blank" rel="noopener">${icon("whatsapp")} +91 788 806 0231</a>
            <a href="mailto:${escapeHTML(email)}">${icon("mail")} ${escapeHTML(email)}</a>
            <p>Delivery availability, delivery charges, and payment are confirmed directly by KAYAM SPICES on WhatsApp.</p>
          </div>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>&copy; ${year} KAYAM SPICES. All rights reserved.</span>
        <div class="footer-bottom__links">
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
          <a href="admin/login.html">Administrator</a>
        </div>
      </div>
    </footer>`;
  }

  function initHeader() {
    // Prefer the new vector monogram in browsers that support SVG favicons.
    if (!document.querySelector('link[rel="icon"][type="image/svg+xml"]')) {
      const favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      favicon.href = "assets/images/kayam-monogram.svg";
      document.head.appendChild(favicon);
    }
    const headerMount = document.getElementById("site-header");
    if (headerMount) {
      headerMount.innerHTML = renderHeader();
      headerMount.classList.toggle("has-announcement", Boolean(headerMount.querySelector("[data-announcement]")));
      document.body.classList.toggle("has-mobile-bottom-nav", Boolean(headerMount.querySelector(".mobile-bottom-nav")));
      const stickyHeader = headerMount.querySelector(".site-header");
      if (stickyHeader) {
        const updateHeaderState = function () {
          stickyHeader.classList.toggle("is-scrolled", window.scrollY > 24);
        };
        updateHeaderState();
        window.addEventListener("scroll", updateHeaderState, { passive: true });
      }
    }
    const footerMount = document.getElementById("site-footer");
    if (footerMount) footerMount.innerHTML = renderFooter();

    const dismissButton = document.querySelector("[data-dismiss-announcement]");
    if (dismissButton) {
      dismissButton.addEventListener("click", function () {
        session.set("kayam.announcement.dismissed", "1");
        const bar = dismissButton.closest("[data-announcement]");
        if (bar) bar.remove();
        const headerMount = document.getElementById("site-header");
        if (headerMount) headerMount.classList.remove("has-announcement");
      });
    }

    const drawer = document.getElementById("nav-drawer");
    const toggle = document.querySelector("[data-menu-toggle]");
    if (!drawer || !toggle) return;
    let lastFocus = null;

    function openDrawer() {
      lastFocus = document.activeElement;
      drawer.classList.add("is-open");
      document.body.classList.add("is-locked");
      toggle.setAttribute("aria-expanded", "true");
      const close = drawer.querySelector("[data-menu-close]:not([tabindex='-1'])");
      window.setTimeout(function () {
        if (close) close.focus();
      }, 30);
    }

    function closeDrawer() {
      drawer.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      toggle.setAttribute("aria-expanded", "false");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    toggle.addEventListener("click", openDrawer);
    drawer.querySelectorAll("[data-menu-close]").forEach(function (button) {
      button.addEventListener("click", closeDrawer);
    });
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        drawer.classList.remove("is-open");
        document.body.classList.remove("is-locked");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    drawer.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawer.querySelectorAll("a[href], button:not([disabled]):not([tabindex='-1'])"),
      ).filter(function (element) {
        return element.offsetParent !== null;
      });
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    items.forEach(function (item) {
      if (item.dataset.revealDelay) {
        item.style.transitionDelay = `${Number(item.dataset.revealDelay) || 0}ms`;
      }
      observer.observe(item);
    });
  }

  function initHeroVideo() {
    const video = document.querySelector("[data-hero-video]");
    if (!video) return;
    const hero = video.closest(".hero");
    const control = hero ? hero.querySelector("[data-hero-media-control]") : null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "")));
    const isMobile = window.matchMedia("(max-width: 899px)").matches;
    const source = isMobile && video.dataset.mobileSrc ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    if (!source) return;
    video.addEventListener("error", function () {
      if (hero) hero.classList.add("hero--video-failed");
    });
    video.src = source;
    video.setAttribute("aria-label", "Traditional Indian spice preparation film");

    function updateControl() {
      if (!control) return;
      const isPlaying = !video.paused && !video.ended;
      control.innerHTML = isPlaying
        ? `${icon("pause")}<span>Pause film</span>`
        : `${icon("play")}<span>Play film</span>`;
      control.setAttribute("aria-label", isPlaying ? "Pause background film" : "Play background film");
    }

    video.addEventListener("playing", function () {
      video.classList.add("is-ready");
      updateControl();
    });
    video.addEventListener("play", updateControl);
    video.addEventListener("pause", updateControl);
    video.addEventListener("ended", updateControl);
    updateControl();

    if (!reducedMotion && !saveData) {
      video.autoplay = true;
      video.play().catch(function () {
        video.classList.remove("is-ready");
        updateControl();
      });
    }
    if (control) {
      control.addEventListener("click", function () {
        if (video.paused) {
          video.play().then(function () {
            video.classList.add("is-ready");
          }).catch(function () {
            showToast("The film could not play in this browser. The still image remains available.", "error");
          });
        } else {
          video.pause();
        }
      });
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && !video.paused) {
        video.pause();
      }
    });
  }

  function initImageFallbacks() {
    document.addEventListener(
      "error",
      function (event) {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        if (!target.dataset.fallback || target.dataset.fallbackApplied === "true") return;
        target.dataset.fallbackApplied = "true";
        target.src = target.dataset.fallback;
      },
      true,
    );
  }

  function initAccordions() {
    document.querySelectorAll("[data-accordion-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        const expanded = trigger.getAttribute("aria-expanded") === "true";
        const panelId = trigger.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        trigger.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  function init() {
    initImageFallbacks();
    initHeader();
    initReveal();
    initHeroVideo();
    initAccordions();
    updateCartBadge();
    const yearNodes = document.querySelectorAll("[data-current-year]");
    yearNodes.forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
    document.dispatchEvent(new CustomEvent("kayam:layout-ready"));
  }

  Kayam.config = config;
  Kayam.icons = icons;
  Kayam.statusLabels = statusLabels;
  Kayam.storage = storage;
  Kayam.session = session;
  Kayam.escapeHTML = escapeHTML;
  Kayam.moneyToPaise = moneyToPaise;
  Kayam.paiseToDecimal = paiseToDecimal;
  Kayam.formatMoney = formatMoney;
  Kayam.formatWeight = formatWeight;
  Kayam.slugify = slugify;
  Kayam.debounce = debounce;
  Kayam.formatDate = formatDate;
  Kayam.normalisePhone = normalisePhone;
  Kayam.icon = icon;
  Kayam.showToast = showToast;
  Kayam.updateCartBadge = updateCartBadge;
  Kayam.init = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
