(function () {
  "use strict";

  const config = window.KAYAM_CONFIG || {};
  const url = String(config.SUPABASE_URL || "").trim();
  const anonKey = String(config.SUPABASE_ANON_KEY || "").trim();
  const isPlaceholder =
    !url ||
    !anonKey ||
    url.includes("YOUR_SUPABASE") ||
    anonKey.includes("YOUR_SUPABASE") ||
    !/^https:\/\//i.test(url);

  let client = null;
  let initialisationError = null;

  if (!isPlaceholder) {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        client = window.supabase.createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (error) {
        initialisationError = error;
      }
    } else {
      initialisationError = new Error("The Supabase client library did not load.");
    }
  }

  class ConfigurationError extends Error {
    constructor(message) {
      super(message);
      this.name = "ConfigurationError";
      this.code = "NOT_CONFIGURED";
    }
  }

  function getClient() {
    if (!client) {
      throw new ConfigurationError(
        "The store database has not been connected yet. Add your Supabase project URL and public anon key in assets/js/config.js.",
      );
    }
    return client;
  }

  function isConfigured() {
    return Boolean(client);
  }

  function getPublicImageUrl(storagePath) {
    if (!storagePath) return "";
    try {
      const { data } = getClient().storage.from(config.STORAGE_BUCKET || "product-images").getPublicUrl(storagePath);
      return data && data.publicUrl ? data.publicUrl : "";
    } catch (error) {
      return "";
    }
  }

  window.KayamDB = {
    config,
    get client() {
      return client;
    },
    get initialisationError() {
      return initialisationError;
    },
    isConfigured,
    getClient,
    getPublicImageUrl,
    ConfigurationError,
  };
})();
