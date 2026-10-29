(function () {
  "use strict";

  // Administrator pages use the same new vector brand monogram as the storefront.
  if (document.head && !document.querySelector('link[rel="icon"][type="image/svg+xml"]')) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    favicon.href = "../assets/images/kayam-monogram.svg";
    document.head.appendChild(favicon);
  }

  const page = document.body.dataset.adminPage || "";
  const isLoginPage = page === "login";
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
    categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8.5" cy="8.5" r="1"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.2 13.5a7.6 7.6 0 0 0 .1-3l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2.6-1.5L14.1 2h-4.2L9.6 5.1A7.4 7.4 0 0 0 7 6.6L4.7 5.6l-2 3.4 2 1.5a7.6 7.6 0 0 0 .1 3l-2.1 1.4 2 3.4 2.3-1a7.4 7.4 0 0 0 2.6 1.5l.3 3.1h4.2l.3-3.1a7.4 7.4 0 0 0 2.6-1.5l2.3 1 2-3.4-2.1-1.4Z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16v11H4zM3 9l2-5h14l2 5"/><path d="M9 20v-6h6v6"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 21 20H3L12 3.6Z"/><path d="M12 9v5M12 17.2v.1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.8V17M12 7.2v.1"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M14 6l6 6-6 6"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 11H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
  };

  const statusLabels = {
    pending_confirmation: "Pending confirmation",
    confirmed: "Confirmed",
    processing: "Processing",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const pageTitles = {
    dashboard: "Dashboard",
    orders: "Orders",
    products: "Products",
    "product-form": "Product editor",
    categories: "Categories",
    settings: "Settings",
  };

  const navItems = [
    ["dashboard", "Dashboard", "index.html", "dashboard"],
    ["orders", "Orders", "orders.html", "orders"],
    ["products", "Products", "products.html", "products"],
    ["categories", "Categories", "categories.html", "categories"],
    ["settings", "Settings", "settings.html", "settings"],
  ];

  let db = null;
  let adminUser = null;
  let adminProfile = null;
  let resolveReady;
  const readyPromise = new Promise(function (resolve) {
    resolveReady = resolve;
  });

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(value, showDecimals) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(number);
  }

  function formatDate(value, withTime) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
  }

  function formatWeight(value, unit) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value || "");
    const weight = Number.isInteger(numeric)
      ? String(numeric)
      : String(numeric).replace(/0+$/, "").replace(/\.$/, "");
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

  function statusLabel(status) {
    return statusLabels[status] || String(status || "Unknown");
  }

  function statusMarkup(status) {
    return `<span class="admin-status admin-status--${escapeHTML(status)}">${escapeHTML(statusLabel(status))}</span>`;
  }

  function showToast(message, type, duration) {
    let stack = document.querySelector(".admin-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "admin-toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = `admin-toast admin-toast--${type || "info"}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = String(message || "");
    stack.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, duration || 4800);
  }

  function alertMarkup(message, type, title) {
    return `<div class="admin-alert admin-alert--${type || "error"}">
      ${type === "success" ? icons.check : type === "warning" ? icons.info : icons.alert}
      <div>${title ? `<strong class="admin-alert__title">${escapeHTML(title)}</strong>` : ""}${escapeHTML(message || "")}</div>
    </div>`;
  }

  function errorMessage(error, fallback) {
    const raw = error && (error.message || error.error_description || error.details || error.hint);
    if (!raw) return fallback || "Something went wrong. Please try again.";
    const message = String(raw);
    if (/invalid login credentials/i.test(message)) return "The email address or password is incorrect.";
    if (/email not confirmed/i.test(message)) return "This account's email has not been confirmed. Contact the site owner.";
    if (/failed to fetch|network/i.test(message)) return "The database could not be reached. Check your connection and try again.";
    if (/not authorised|not authorized|row-level security|permission denied/i.test(message)) {
      return "This account does not have permission to perform that action.";
    }
    return message;
  }

  function safeNext() {
    const requested = new URLSearchParams(window.location.search).get("next") || "index.html";
    return /^[a-z0-9-]+\.html$/.test(requested) ? requested : "index.html";
  }

  function currentPageFile() {
    const file = window.location.pathname.split("/").pop() || "index.html";
    return /^[a-z0-9-]+\.html$/.test(file) ? file : "index.html";
  }

  function loginUrl(error) {
    const params = new URLSearchParams();
    const next = currentPageFile();
    if (next !== "login.html") params.set("next", next);
    if (error) params.set("error", error);
    const query = params.toString();
    return `login.html${query ? `?${query}` : ""}`;
  }

  function getClient() {
    if (db) return db;
    if (!window.KayamDB || typeof window.KayamDB.isConfigured !== "function" || !window.KayamDB.isConfigured()) {
      const error = new Error(
        "Supabase is not configured. Add the project URL and public anon key to assets/js/config.js.",
      );
      error.code = "NOT_CONFIGURED";
      throw error;
    }
    db = window.KayamDB.getClient();
    return db;
  }

  async function getAdminSession() {
    const client = getClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return { session: null };

    const user = sessionData.session.user;
    const { data: profile, error: profileError } = await client
      .from("admin_profiles")
      .select("user_id,email,display_name,is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || !profile.is_active) {
      await client.auth.signOut();
      return { session: null, unauthorized: true };
    }
    return { session: sessionData.session, user, profile };
  }

  function initialsFrom(value) {
    const source = String(value || "A").trim();
    return source ? source.charAt(0).toUpperCase() : "A";
  }

  function shellMarkup() {
    const links = navItems
      .map(function (item) {
        return `<a href="${item[2]}"${page === item[0] || (page === "product-form" && item[0] === "products") ? ' aria-current="page"' : ""}>${icons[item[3]]}<span>${item[1]}</span></a>`;
      })
      .join("");
    return {
      sidebar: `<div class="admin-sidebar__brand">
          <img src="../assets/images/kayam-monogram.svg" alt="" width="44" height="48">
          <div><strong>KAYAM</strong><span>Spices admin</span></div>
        </div>
        <nav class="admin-nav" aria-label="Administrator navigation">
          ${links}
          <p class="admin-nav__label">Storefront</p>
          <a href="../index.html" target="_blank" rel="noopener">${icons.store}<span>View website</span></a>
        </nav>
        <div class="admin-sidebar__foot">
          <button type="button" data-admin-signout>${icons.logout}<span>Sign out</span></button>
        </div>`,
      topbar: `<div class="admin-topbar__left">
          <button class="admin-menu-button" type="button" data-admin-menu aria-controls="admin-sidebar" aria-expanded="false" aria-label="Open admin navigation">${icons.menu}</button>
          <p class="admin-topbar__eyebrow">Admin <span aria-hidden="true">/</span> <strong>${escapeHTML(pageTitles[page] || "Workspace")}</strong></p>
        </div>
        <div class="admin-user">
          <div class="admin-user__details">
            <p class="admin-user__name">${escapeHTML(adminProfile.display_name || "Administrator")}</p>
            <p class="admin-user__email">${escapeHTML(adminUser.email || adminProfile.email || "")}</p>
          </div>
          <span class="admin-user__avatar" aria-hidden="true">${escapeHTML(
            initialsFrom(adminProfile.display_name || adminUser.email),
          )}</span>
          <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-admin-signout>Sign out</button>
        </div>`,
    };
  }

  function closeMenu() {
    const sidebar = document.querySelector(".admin-sidebar");
    const scrim = document.querySelector(".admin-scrim");
    const toggle = document.querySelector("[data-admin-menu]");
    if (!sidebar || !toggle) return;
    sidebar.classList.remove("is-open");
    if (scrim) scrim.classList.remove("is-visible");
    document.body.classList.remove("is-locked");
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    let scrim = document.querySelector(".admin-scrim");
    const sidebar = document.querySelector(".admin-sidebar");
    const toggle = document.querySelector("[data-admin-menu]");
    if (!sidebar || !toggle) return;
    if (!scrim) {
      scrim = document.createElement("button");
      scrim.type = "button";
      scrim.className = "admin-scrim";
      scrim.setAttribute("aria-label", "Close admin navigation");
      scrim.addEventListener("click", closeMenu);
      document.body.appendChild(scrim);
    }
    sidebar.classList.add("is-open");
    scrim.classList.add("is-visible");
    document.body.classList.add("is-locked");
    toggle.setAttribute("aria-expanded", "true");
  }

  function initShell() {
    const sidebar = document.getElementById("admin-sidebar");
    const topbar = document.getElementById("admin-topbar");
    const layout = document.getElementById("admin-layout");
    const boot = document.getElementById("admin-boot");
    if (!sidebar || !topbar || !layout) return;

    const shell = shellMarkup();
    sidebar.className = "admin-sidebar";
    sidebar.id = "admin-sidebar";
    sidebar.innerHTML = shell.sidebar;
    topbar.className = "admin-topbar";
    topbar.innerHTML = shell.topbar;

    document.querySelectorAll("[data-admin-signout]").forEach(function (button) {
      button.addEventListener("click", signOut);
    });

    let scrim = document.querySelector(".admin-scrim");
    if (!scrim) {
      scrim = document.createElement("button");
      scrim.type = "button";
      scrim.className = "admin-scrim";
      scrim.setAttribute("aria-label", "Close admin navigation");
      document.body.appendChild(scrim);
    }
    scrim.addEventListener("click", closeMenu);

    const toggle = document.querySelector("[data-admin-menu]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        if (sidebar.classList.contains("is-open")) closeMenu();
        else openMenu();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    if (boot) boot.hidden = true;
    layout.hidden = false;
    document.body.classList.remove("admin-booting");
  }

  async function signOut() {
    try {
      if (db) await db.auth.signOut();
    } catch (error) {
      console.error(error);
    }
    window.location.replace("login.html");
  }

  function bootProtectedPage() {
    if (isLoginPage) {
      resolveReady(null);
      return;
    }

    (async function () {
      try {
        const result = await getAdminSession();
        if (!result.session) {
          window.location.replace(loginUrl(result.unauthorized ? "unauthorized" : ""));
          return;
        }
        adminUser = result.user;
        adminProfile = result.profile;
        initShell();
        resolveReady(adminProfile);
      } catch (error) {
        console.error(error);
        const code = error && error.code === "NOT_CONFIGURED" ? "config" : "session";
        window.location.replace(loginUrl(code));
      }
    })();
  }

  window.KayamAdmin = {
    icons,
    page,
    escapeHTML,
    formatMoney,
    formatDate,
    formatWeight,
    slugify,
    statusLabel,
    statusMarkup,
    showToast,
    alertMarkup,
    errorMessage,
    safeNext,
    loginUrl,
    getClient,
    getAdminSession,
    getUser: function () {
      return adminUser;
    },
    getProfile: function () {
      return adminProfile;
    },
    ready: function () {
      return readyPromise;
    },
    closeMenu,
  };

  bootProtectedPage();
})();
