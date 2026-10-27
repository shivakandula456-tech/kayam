(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const placeholder = "../assets/images/product-placeholder.svg";
  const form = document.getElementById("product-form");
  const loadingHost = document.getElementById("product-form-loading");
  const errorHost = document.getElementById("product-form-error");
  const titleHost = document.getElementById("product-form-title");
  const subtitleHost = document.getElementById("product-form-subtitle");
  const saveButton = document.getElementById("product-save");
  const saveNote = document.getElementById("save-note");
  const slugGenerate = document.getElementById("product-slug-generate");
  const variantList = document.getElementById("variant-list");
  const variantAdd = document.getElementById("variant-add");
  const imageInput = document.getElementById("image-input");
  const imageProgress = document.getElementById("image-progress");
  const imageGrid = document.getElementById("image-grid");
  const imagesHelp = document.getElementById("images-help");
  const summaryState = document.getElementById("summary-state");
  const summaryImage = document.getElementById("summary-image");
  const summaryList = document.getElementById("summary-list");
  const viewLink = document.getElementById("product-view-link");
  const deleteZone = document.getElementById("product-delete-zone");
  const deleteButton = document.getElementById("product-delete");
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id") || "";
  const state = {
    productId: requestedId,
    categories: [],
    variants: [],
    images: [],
    originalVariantIds: new Set(),
    savedProduct: null,
    loading: false,
    busy: false,
    imageBusy: false,
    dirty: false,
    slugTouched: false,
  };

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (character) {
      const random = (Math.random() * 16) | 0;
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function blankVariant() {
    return {
      id: uuid(),
      weight_value: "",
      weight_unit: "g",
      price: "",
      sale_price: "",
      track_stock: true,
      stock_quantity: 0,
      is_active: true,
    };
  }

  function numberValue(value) {
    if (value === null || value === undefined || value === "") return "";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(numeric) : "";
  }

  function showError(message, title) {
    if (!errorHost) return;
    errorHost.innerHTML = Admin.alertMarkup(message, "error", title || "Check the form");
    errorHost.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError() {
    if (errorHost) errorHost.innerHTML = "";
  }

  function showNotFound(message) {
    if (loadingHost) loadingHost.hidden = true;
    if (form) form.hidden = true;
    if (errorHost) {
      errorHost.innerHTML = `${Admin.alertMarkup(message, "error", "Product unavailable")}
        <p><a class="admin-link" href="products.html">Return to products</a></p>`;
    }
    if (titleHost) titleHost.textContent = "Product not found.";
    if (subtitleHost) subtitleHost.textContent = "The product may have been deleted or the link may be incorrect.";
  }

  function updateDirty(isDirty) {
    state.dirty = isDirty;
    if (!saveNote) return;
    if (state.dirty) saveNote.textContent = "Unsaved changes.";
    else if (state.productId) saveNote.textContent = "All changes saved.";
    else saveNote.textContent = "New product — not saved yet.";
  }

  function updateHeading() {
    if (!form) return;
    const name = form.elements.name.value.trim();
    if (state.productId) {
      if (titleHost) titleHost.textContent = name ? `Edit ${name}.` : "Edit product.";
      if (subtitleHost) {
        subtitleHost.textContent = "Update product information, weight options, pricing, stock, and images.";
      }
      if (document.title) document.title = `${name || "Product"} | KAYAM SPICES Admin`;
    } else {
      if (titleHost) titleHost.textContent = "Add product.";
      if (subtitleHost) {
        subtitleHost.textContent = "Create the product, then add weight options, pricing, stock, and images.";
      }
      document.title = "Add product | KAYAM SPICES Admin";
    }
  }

  function populateCategories(selectedId) {
    const input = form.elements.category_id;
    input.innerHTML = `<option value="">No category</option>${state.categories
      .map(
        (category) =>
          `<option value="${Admin.escapeHTML(category.id)}">${Admin.escapeHTML(category.name)}${
            category.is_active ? "" : " (inactive)"
          }</option>`,
      )
      .join("")}`;
    input.value = state.categories.some((category) => category.id === selectedId) ? selectedId : "";
  }

  function renderVariants() {
    if (!variantList) return;
    if (!state.variants.length) {
      variantList.innerHTML = `<div class="admin-alert admin-alert--warning">${Admin.icons.info}<div>No weight options yet. Add at least one confirmed weight and price before activating this product.</div></div>`;
      return;
    }
    variantList.innerHTML = state.variants
      .map(function (variant, index) {
        const key = `variant-${index}`;
        const saved = state.originalVariantIds.has(variant.id);
        return `<div class="admin-variant-row" data-variant-id="${Admin.escapeHTML(variant.id)}" data-saved="${
          saved ? "true" : "false"
        }">
          <div class="admin-field">
            <label for="${key}-weight">Weight</label>
            <input class="admin-input" id="${key}-weight" data-variant-field="weight_value" type="number" min="0.001" max="9999999.999" step="0.001" value="${Admin.escapeHTML(
              numberValue(variant.weight_value),
            )}" inputmode="decimal" aria-label="Weight value">
          </div>
          <div class="admin-field">
            <label for="${key}-unit">Unit</label>
            <select class="admin-select" id="${key}-unit" data-variant-field="weight_unit" aria-label="Weight unit">
              ${["g", "kg", "ml", "l"]
                .map(
                  (unit) =>
                    `<option value="${unit}"${variant.weight_unit === unit ? " selected" : ""}>${
                      unit === "l" ? "L" : unit
                    }</option>`,
                )
                .join("")}
            </select>
          </div>
          <div class="admin-field">
            <label for="${key}-price">Price</label>
            <input class="admin-input" id="${key}-price" data-variant-field="price" type="number" min="0.01" max="99999999.99" step="0.01" value="${Admin.escapeHTML(
              numberValue(variant.price),
            )}" inputmode="decimal" aria-label="Regular price in rupees">
          </div>
          <div class="admin-field">
            <label for="${key}-sale">Sale price</label>
            <input class="admin-input" id="${key}-sale" data-variant-field="sale_price" type="number" min="0" max="99999999.99" step="0.01" value="${Admin.escapeHTML(
              numberValue(variant.sale_price),
            )}" inputmode="decimal" aria-label="Sale price in rupees">
          </div>
          <div class="admin-field">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:.4rem;">
              <label for="${key}-stock">Stock</label>
              <label class="admin-check" style="font-size:.56rem;"><input type="checkbox" data-variant-field="track_stock"${
                variant.track_stock ? " checked" : ""
              }> Track</label>
            </div>
            <div class="admin-variant-stock${variant.track_stock ? " is-visible" : ""}">
              <input class="admin-input" id="${key}-stock" data-variant-field="stock_quantity" type="number" min="0" max="1000000" step="1" value="${Admin.escapeHTML(
                numberValue(variant.stock_quantity),
              )}" inputmode="numeric" aria-label="Stock quantity"${variant.track_stock ? "" : " disabled"}>
            </div>
          </div>
          <div class="admin-field">
            <label>Status</label>
            <label class="admin-check"><input type="checkbox" data-variant-field="is_active"${
              variant.is_active ? " checked" : ""
            }> Active</label>
          </div>
          <button class="admin-variant-row__remove" type="button" data-remove-variant="${Admin.escapeHTML(
            variant.id,
          )}" aria-label="Remove this weight option" title="Remove weight option">${Admin.icons.close}</button>
        </div>`;
      })
      .join("");
  }

  function effectivePrice(variant) {
    const price = Number(variant.price);
    const sale = variant.sale_price === null || variant.sale_price === "" ? null : Number(variant.sale_price);
    return sale !== null && Number.isFinite(sale) && sale >= 0 && sale <= price ? sale : price;
  }

  function updateSummary() {
    if (!form) return;
    const activeVariants = state.variants.filter(function (variant) {
      return variant.is_active && Number(variant.weight_value) > 0 && Number(variant.price) > 0;
    });
    const prices = activeVariants
      .map(effectivePrice)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const trackedVariants = activeVariants.filter((variant) => variant.track_stock);
    const totalStock = trackedVariants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0);
    const priceLabel = prices.length
      ? prices[0] === prices[prices.length - 1]
        ? Admin.formatMoney(prices[0], true)
        : `${Admin.formatMoney(prices[0], true)} – ${Admin.formatMoney(prices[prices.length - 1], true)}`
      : "Pricing pending";
    let image = placeholder;
    if (state.images[0] && window.KayamDB) image = window.KayamDB.getPublicImageUrl(state.images[0].storage_path);
    if (summaryImage) summaryImage.src = image;
    if (summaryState) {
      if (!state.productId) summaryState.textContent = "Not saved yet";
      else if (state.savedProduct && state.savedProduct.is_active) summaryState.textContent = "Published product";
      else summaryState.textContent = "Saved as inactive";
    }
    if (summaryList) {
      summaryList.innerHTML = `<div><dt>Status</dt><dd>${
        state.productId ? (form.elements.is_active.checked ? "Active" : "Inactive") : "Draft"
      }</dd></div>
        <div><dt>Featured</dt><dd>${form.elements.is_featured.checked ? "Yes" : "No"}</dd></div>
        <div><dt>Weights</dt><dd>${activeVariants.length}</dd></div>
        <div><dt>Price</dt><dd>${priceLabel}</dd></div>
        <div><dt>Tracked stock</dt><dd>${trackedVariants.length ? `${totalStock} units` : "Not tracked"}</dd></div>
        <div><dt>Images</dt><dd>${state.images.length}</dd></div>`;
    }
    if (viewLink) {
      const canView = state.savedProduct && state.savedProduct.is_active && state.savedProduct.slug;
      viewLink.hidden = !canView;
      if (canView) {
        viewLink.href = `../product.html?slug=${encodeURIComponent(state.savedProduct.slug)}`;
      }
    }
    if (deleteZone) deleteZone.hidden = !state.productId;
  }

  function setImageAvailability() {
    const enabled = Boolean(state.productId) && !state.imageBusy;
    if (imageInput) imageInput.disabled = !enabled;
    if (imagesHelp) {
      imagesHelp.textContent = state.productId
        ? "Upload JPG, PNG, or WebP images up to 5 MB each. The first image becomes the card preview."
        : "Save the product first, then upload JPG, PNG, or WebP images up to 5 MB each.";
    }
  }

  function renderImages() {
    if (!imageGrid) return;
    if (!state.productId) {
      imageGrid.innerHTML = "";
      return;
    }
    if (!state.images.length) {
      imageGrid.innerHTML = `<p class="admin-muted admin-small" style="grid-column:1/-1;margin:0;">No images uploaded yet. Add at least one clear product image before publishing.</p>`;
      return;
    }
    imageGrid.innerHTML = state.images
      .map(function (image, index) {
        const source = window.KayamDB ? window.KayamDB.getPublicImageUrl(image.storage_path) : placeholder;
        return `<figure class="admin-image-card" data-image-id="${Admin.escapeHTML(image.id)}">
          <img class="admin-image-card__preview" src="${Admin.escapeHTML(source)}" alt="" width="300" height="375" loading="lazy" data-image-fallback>
          <div class="admin-image-card__body">
            <label class="admin-label" for="image-alt-${index}">Alt text</label>
            <input class="admin-input" id="image-alt-${index}" type="text" maxlength="240" value="${Admin.escapeHTML(
              image.alt_text || "",
            )}" placeholder="Describe this image" data-image-alt="${Admin.escapeHTML(image.id)}">
            <div class="admin-image-card__actions">
              <div class="admin-actions" style="gap:.3rem;">
                <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-image-move="up" data-image-id="${Admin.escapeHTML(
                  image.id,
                )}" aria-label="Move image earlier"${index === 0 || state.imageBusy ? " disabled" : ""}>↑</button>
                <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-image-move="down" data-image-id="${Admin.escapeHTML(
                  image.id,
                )}" aria-label="Move image later"${index === state.images.length - 1 || state.imageBusy ? " disabled" : ""}>↓</button>
              </div>
              <button class="admin-btn admin-btn--danger admin-btn--small" type="button" data-image-delete="${Admin.escapeHTML(
                image.id,
              )}"${state.imageBusy ? " disabled" : ""}>Remove</button>
            </div>
          </div>
        </figure>`;
      })
      .join("");
  }

  function validateVariants() {
    const rows = Array.from(variantList ? variantList.querySelectorAll("[data-variant-id]") : []);
    const result = [];
    const combinations = new Map();
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const id = row.dataset.variantId;
      const weightRaw = row.querySelector('[data-variant-field="weight_value"]').value.trim();
      const priceRaw = row.querySelector('[data-variant-field="price"]').value.trim();
      const saleRaw = row.querySelector('[data-variant-field="sale_price"]').value.trim();
      const stockRaw = row.querySelector('[data-variant-field="stock_quantity"]').value.trim();
      const isSaved = row.dataset.saved === "true";
      const touched = Boolean(weightRaw || priceRaw || saleRaw);
      if (!touched) {
        if (isSaved) {
          return { error: `Weight option ${index + 1} has no weight or price. Fill it in or remove the row.` };
        }
        continue;
      }
      const weight = Number(weightRaw);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 9999999.999) {
        return { error: `Weight option ${index + 1} needs a valid weight greater than zero.` };
      }
      const unit = row.querySelector('[data-variant-field="weight_unit"]').value;
      if (!["g", "kg", "ml", "l"].includes(unit)) {
        return { error: `Weight option ${index + 1} needs a valid unit.` };
      }
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) {
        return { error: `Weight option ${index + 1} needs a regular price greater than zero.` };
      }
      let sale = null;
      if (saleRaw) {
        sale = Number(saleRaw);
        if (!Number.isFinite(sale) || sale < 0 || sale > price) {
          return { error: `The sale price for weight option ${index + 1} must be zero or less than the regular price.` };
        }
      }
      const trackStock = row.querySelector('[data-variant-field="track_stock"]').checked;
      const stock = trackStock ? Number(stockRaw || 0) : Number(stockRaw || 0);
      if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
        return { error: `Stock for weight option ${index + 1} must be a whole number between 0 and 1,000,000.` };
      }
      const combination = `${weight.toFixed(3)}|${unit}`;
      if (combinations.has(combination)) {
        return {
          error: `Weight option ${index + 1} duplicates ${Admin.formatWeight(
            combinations.get(combination).weight,
            unit,
          )}. Each weight can appear only once.`,
        };
      }
      combinations.set(combination, { weight });
      result.push({
        id,
        product_id: state.productId,
        weight_value: weight,
        weight_unit: unit,
        price,
        sale_price: sale,
        track_stock: trackStock,
        stock_quantity: stock,
        is_active: row.querySelector('[data-variant-field="is_active"]').checked,
        display_order: result.length,
      });
    }
    return { variants: result };
  }

  async function saveVariants() {
    const validation = validateVariants();
    if (validation.error) {
      showError(validation.error);
      throw new Error(validation.error);
    }
    const variants = validation.variants;
    const currentIds = new Set(variants.map((variant) => variant.id));
    const removedIds = Array.from(state.originalVariantIds).filter((id) => !currentIds.has(id));
    const client = Admin.getClient();
    if (removedIds.length) {
      const { error } = await client.from("product_variants").delete().in("id", removedIds);
      if (error) throw error;
    }
    if (variants.length) {
      const { error } = await client.from("product_variants").upsert(variants, { onConflict: "id" });
      if (error) throw error;
    }
    state.originalVariantIds = currentIds;
    state.variants = variants;
  }

  function readProductPayload() {
    const name = form.elements.name.value.trim();
    const slug = Admin.slugify(form.elements.slug.value || name);
    if (!name) return { error: "Enter a product name." };
    if (name.length > 160) return { error: "Product names must be 160 characters or fewer." };
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { error: "Use a valid URL slug: lowercase letters and numbers separated by hyphens." };
    }
    const displayOrder = Number(form.elements.display_order.value || 0);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) {
      return { error: "Display order must be a whole number between 0 and 9,999." };
    }
    const shortDescription = form.elements.short_description.value.trim();
    if (shortDescription.length > 300) {
      return { error: "Short descriptions must be 300 characters or fewer." };
    }
    return {
      payload: {
        name,
        slug,
        category_id: form.elements.category_id.value || null,
        short_description: shortDescription || null,
        description: form.elements.description.value.trim() || null,
        ingredients: form.elements.ingredients.value.trim() || null,
        is_active: form.elements.is_active.checked,
        is_featured: form.elements.is_featured.checked,
        display_order: displayOrder,
      },
    };
  }

  function markProductSaved(data, payload, wasNew) {
    state.productId = data.id;
    state.savedProduct = {
      id: data.id,
      name: payload.name,
      slug: data.slug || payload.slug,
      is_active: data.is_active,
    };
    if (wasNew) {
      const url = new URL(window.location.href);
      url.searchParams.set("id", data.id);
      window.history.replaceState({}, "", url);
    }
    setImageAvailability();
    renderImages();
    updateHeading();
    updateSummary();
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!form || state.busy) return;
    clearError();
    const productValidation = readProductPayload();
    if (productValidation.error) {
      showError(productValidation.error);
      return;
    }
    const payload = productValidation.payload;
    const wasNew = !state.productId;
    state.busy = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }
    try {
      const client = Admin.getClient();
      let result;
      if (state.productId) {
        result = await client
          .from("products")
          .update(payload)
          .eq("id", state.productId)
          .select("id,slug,is_active")
          .single();
      } else {
        result = await client.from("products").insert(payload).select("id,slug,is_active").single();
      }
      if (result.error) throw result.error;
      markProductSaved(result.data, payload, wasNew);
      try {
        await saveVariants();
      } catch (variantError) {
        console.error(variantError);
        updateDirty(true);
        if (saveNote) saveNote.textContent = "Product details saved; weights need attention.";
        showError(
          `${Admin.errorMessage(
            variantError,
            "The product details were saved, but weight options could not be saved.",
          )} Retry saving once the weight details are corrected.`,
          "Weights not saved",
        );
        return;
      }
      renderVariants();
      updateDirty(false);
      updateSummary();
      const hasSellableWeight = state.variants.some(function (variant) {
        return variant.is_active && Number(variant.weight_value) > 0 && Number(variant.price) > 0;
      });
      if (payload.is_active && !hasSellableWeight) {
        Admin.showToast(
          "Product saved. Add an active weight and price before customers can order it.",
          "info",
          6500,
        );
      } else {
        Admin.showToast(
          wasNew ? "Product created. Add images when ready." : "Product changes saved.",
          "success",
        );
      }
    } catch (error) {
      console.error(error);
      const raw = String((error && error.message) || "");
      let message;
      if (/product_variants_weight_unique|product_variants.*unique|weight_unique/i.test(raw)) {
        message = "A weight option with those measurements already exists. Each weight can appear only once.";
      } else if (/products_slug_key|products.*slug.*unique/i.test(raw)) {
        message = "That URL slug is already used by another product. Choose a different slug.";
      } else if (/duplicate key/i.test(raw)) {
        message = "A record with those details already exists. Check the URL slug and weight options.";
      } else {
        message = Admin.errorMessage(error, "The product could not be saved.");
      }
      showError(message, "Product not saved");
      updateDirty(true);
    } finally {
      state.busy = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save product";
      }
    }
  }

  async function handleImageUpload(files) {
    if (!files || !files.length || !state.productId || state.imageBusy) return;
    const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const validFiles = [];
    const rejected = [];
    Array.from(files).forEach(function (file) {
      if (!allowed[file.type]) {
        rejected.push(`${file.name}: use JPG, PNG, or WebP.`);
      } else if (file.size > 5 * 1024 * 1024) {
        rejected.push(`${file.name}: files must be 5 MB or smaller.`);
      } else {
        validFiles.push(file);
      }
    });
    if (imageInput) imageInput.value = "";
    if (!validFiles.length) {
      if (imageProgress) {
        imageProgress.innerHTML = Admin.alertMarkup(
          rejected.join(" ") || "Choose at least one valid image.",
          "error",
          "Images not uploaded",
        );
      }
      return;
    }
    state.imageBusy = true;
    setImageAvailability();
    renderImages();
    const client = Admin.getClient();
    const bucket = (window.KAYAM_CONFIG && window.KAYAM_CONFIG.STORAGE_BUCKET) || "product-images";
    let uploaded = 0;
    let lastError = null;
    for (let index = 0; index < validFiles.length; index += 1) {
      const file = validFiles[index];
      if (imageProgress) {
        imageProgress.innerHTML = `<div class="admin-alert">${Admin.icons.info}<div>Uploading ${index + 1} of ${
          validFiles.length
        }…</div></div>`;
      }
      const path = `${state.productId}/${uuid()}.${allowed[file.type]}`;
      try {
        const uploadResult = await client.storage.from(bucket).upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (uploadResult.error) throw uploadResult.error;
        const displayOrder = state.images.reduce(
          (max, image) => Math.max(max, Number(image.display_order) || 0),
          -1,
        ) + 1;
        const insertResult = await client
          .from("product_images")
          .insert({
            product_id: state.productId,
            storage_path: path,
            alt_text: null,
            display_order: displayOrder,
          })
          .select("id,storage_path,alt_text,display_order")
          .single();
        if (insertResult.error) {
          await client.storage.from(bucket).remove([path]);
          throw insertResult.error;
        }
        state.images.push(insertResult.data);
        uploaded += 1;
      } catch (error) {
        console.error(error);
        lastError = error;
        rejected.push(`${file.name}: ${Admin.errorMessage(error, "upload failed.")}`);
      }
    }
    state.imageBusy = false;
    state.images.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
    setImageAvailability();
    renderImages();
    updateSummary();
    if (imageProgress) {
      if (lastError || rejected.length) {
        imageProgress.innerHTML = Admin.alertMarkup(
          `${uploaded ? `${uploaded} of ${validFiles.length} images uploaded. ` : ""}${rejected.join(" ")}`,
          lastError ? "error" : "warning",
          lastError ? "Some images were not uploaded" : "Some files were skipped",
        );
      } else {
        imageProgress.innerHTML = Admin.alertMarkup(
          `${uploaded} ${uploaded === 1 ? "image" : "images"} uploaded.`,
          "success",
        );
        window.setTimeout(function () {
          if (imageProgress) imageProgress.innerHTML = "";
        }, 4200);
      }
    }
    if (uploaded) Admin.showToast(`${uploaded} ${uploaded === 1 ? "image" : "images"} uploaded.`, "success");
  }

  async function saveAltText(input) {
    if (state.imageBusy) return;
    const id = input.dataset.imageAlt;
    const image = state.images.find((item) => item.id === id);
    if (!image) return;
    const value = input.value.trim().slice(0, 240) || null;
    if ((image.alt_text || null) === value) return;
    const previous = image.alt_text;
    image.alt_text = value;
    try {
      const { error } = await Admin.getClient()
        .from("product_images")
        .update({ alt_text: value })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    } catch (error) {
      image.alt_text = previous;
      input.value = previous || "";
      Admin.showToast(Admin.errorMessage(error, "The image description could not be saved."), "error");
    }
  }

  async function moveImage(id, direction) {
    if (state.imageBusy) return;
    const index = state.images.findIndex((image) => image.id === id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= state.images.length) return;
    const ordered = state.images.slice();
    const moved = ordered.splice(index, 1)[0];
    ordered.splice(target, 0, moved);
    state.imageBusy = true;
    renderImages();
    try {
      const client = Admin.getClient();
      const updates = ordered.map(function (image, position) {
        image.display_order = position;
        return client.from("product_images").update({ display_order: position }).eq("id", image.id);
      });
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;
      state.images = ordered;
      Admin.showToast("Image order updated.", "success");
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The image order could not be saved."), "error");
    } finally {
      state.imageBusy = false;
      renderImages();
      updateSummary();
    }
  }

  async function deleteImage(id) {
    if (state.imageBusy) return;
    const image = state.images.find((item) => item.id === id);
    if (!image) return;
    if (!window.confirm("Remove this image from the product? The uploaded file will also be deleted.")) return;
    state.imageBusy = true;
    renderImages();
    try {
      const client = Admin.getClient();
      const { error } = await client.from("product_images").delete().eq("id", id);
      if (error) throw error;
      const bucket = (window.KAYAM_CONFIG && window.KAYAM_CONFIG.STORAGE_BUCKET) || "product-images";
      const storageResult = await client.storage.from(bucket).remove([image.storage_path]);
      if (storageResult.error) console.error(storageResult.error);
      state.images = state.images.filter((item) => item.id !== id);
      Admin.showToast("Image removed.", "success");
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The image could not be removed."), "error");
    } finally {
      state.imageBusy = false;
      setImageAvailability();
      renderImages();
      updateSummary();
    }
  }

  async function deleteProduct() {
    if (!state.productId || state.busy || state.imageBusy) return;
    const name = form.elements.name.value.trim() || "this product";
    if (
      !window.confirm(
        `Delete "${name}"?\n\nThis removes its weights, images, and uploaded files. Existing order snapshots remain intact. This cannot be undone.`,
      )
    ) {
      return;
    }
    state.busy = true;
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.textContent = "Deleting…";
    }
    try {
      const client = Admin.getClient();
      const { error } = await client.from("products").delete().eq("id", state.productId);
      if (error) throw error;
      const paths = state.images.map((image) => image.storage_path).filter(Boolean);
      if (paths.length) {
        const bucket = (window.KAYAM_CONFIG && window.KAYAM_CONFIG.STORAGE_BUCKET) || "product-images";
        const storageResult = await client.storage.from(bucket).remove(paths);
        if (storageResult.error) console.error(storageResult.error);
      }
      state.dirty = false;
      window.location.replace("products.html?deleted=1");
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The product could not be deleted."), "error");
      if (deleteButton) {
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete product";
      }
      state.busy = false;
    }
  }

  function bindEvents() {
    if (!form) return;
    form.addEventListener("submit", saveProduct);
    form.addEventListener("input", function (event) {
      if (event.target.closest("#image-grid") || event.target === imageInput) return;
      updateDirty(true);
      if (event.target === form.elements.name) {
        if (!state.slugTouched) form.elements.slug.value = Admin.slugify(form.elements.name.value);
        updateHeading();
      }
      if (event.target === form.elements.is_active || event.target === form.elements.is_featured) updateSummary();
    });
    form.addEventListener("change", function (event) {
      if (event.target.closest("#image-grid") || event.target === imageInput) return;
      updateDirty(true);
    });
    form.elements.slug.addEventListener("input", function () {
      state.slugTouched = form.elements.slug.value.length > 0;
    });
    if (slugGenerate) {
      slugGenerate.addEventListener("click", function () {
        form.elements.slug.value = Admin.slugify(form.elements.name.value);
        state.slugTouched = false;
        form.elements.slug.focus();
        updateDirty(true);
      });
    }
    if (variantAdd) {
      variantAdd.addEventListener("click", function () {
        state.variants.push(blankVariant());
        renderVariants();
        updateDirty(true);
        const rows = variantList.querySelectorAll("[data-variant-id]");
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
          const field = lastRow.querySelector('[data-variant-field="weight_value"]');
          if (field) field.focus();
        }
      });
    }
    if (variantList) {
      variantList.addEventListener("click", function (event) {
        const remove = event.target.closest("[data-remove-variant]");
        if (!remove) return;
        state.variants = state.variants.filter((variant) => variant.id !== remove.dataset.removeVariant);
        renderVariants();
        updateDirty(true);
        updateSummary();
      });
      variantList.addEventListener("change", function (event) {
        const track = event.target.closest('[data-variant-field="track_stock"]');
        if (!track) return;
        const row = track.closest("[data-variant-id]");
        const wrapper = row.querySelector(".admin-variant-stock");
        const stock = row.querySelector('[data-variant-field="stock_quantity"]');
        wrapper.classList.toggle("is-visible", track.checked);
        if (stock) stock.disabled = !track.checked;
      });
    }
    if (imageInput) imageInput.addEventListener("change", function () {
      handleImageUpload(imageInput.files);
    });
    if (imageGrid) {
      imageGrid.addEventListener("change", function (event) {
        const input = event.target.closest("[data-image-alt]");
        if (input) saveAltText(input);
      });
      imageGrid.addEventListener(
        "error",
        function (event) {
          const image = event.target;
          if (!(image instanceof HTMLImageElement)) return;
          if (!image.hasAttribute("data-image-fallback")) return;
          image.removeAttribute("data-image-fallback");
          image.src = placeholder;
        },
        true,
      );
      imageGrid.addEventListener("click", function (event) {
        const move = event.target.closest("[data-image-move]");
        if (move) {
          moveImage(move.dataset.imageId, move.dataset.imageMove);
          return;
        }
        const remove = event.target.closest("[data-image-delete]");
        if (remove) deleteImage(remove.dataset.imageDelete);
      });
    }
    if (summaryImage) summaryImage.addEventListener("error", function () {
      summaryImage.src = placeholder;
    });
    if (deleteButton) deleteButton.addEventListener("click", deleteProduct);
    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function loadForm() {
    if (!form) return;
    state.loading = true;
    if (requestedId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)) {
      showNotFound("That product link is not valid.");
      state.loading = false;
      return;
    }
    try {
      const client = Admin.getClient();
      const categoryRequest = client
        .from("categories")
        .select("id,name,is_active,display_order")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      const productRequest = state.productId
        ? client
            .from("products")
            .select(
              "id,name,slug,category_id,short_description,description,ingredients,is_active,is_featured,display_order,product_variants(id,weight_value,weight_unit,price,sale_price,track_stock,stock_quantity,is_active,display_order),product_images(id,storage_path,alt_text,display_order)",
            )
            .eq("id", state.productId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const [categoriesResult, productResult] = await Promise.all([categoryRequest, productRequest]);
      if (categoriesResult.error) throw categoriesResult.error;
      if (productResult.error) throw productResult.error;
      state.categories = categoriesResult.data || [];
      if (state.productId && !productResult.data) {
        showNotFound("This product could not be found. It may have been deleted.");
        state.loading = false;
        return;
      }
      const product = productResult.data;
      if (product) {
        form.elements.name.value = product.name || "";
        form.elements.slug.value = product.slug || "";
        form.elements.short_description.value = product.short_description || "";
        form.elements.description.value = product.description || "";
        form.elements.ingredients.value = product.ingredients || "";
        form.elements.display_order.value = String(product.display_order || 0);
        form.elements.is_active.checked = Boolean(product.is_active);
        form.elements.is_featured.checked = Boolean(product.is_featured);
        populateCategories(product.category_id || "");
        state.variants = (product.product_variants || []).slice().sort(function (a, b) {
          return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
        });
        state.images = (product.product_images || []).slice().sort(function (a, b) {
          return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
        });
        state.originalVariantIds = new Set(state.variants.map((variant) => variant.id));
        state.savedProduct = {
          id: product.id,
          name: product.name,
          slug: product.slug,
          is_active: product.is_active,
        };
        state.slugTouched = true;
        if (!state.variants.length) state.variants.push(blankVariant());
      } else {
        populateCategories("");
        state.variants = [blankVariant()];
        state.slugTouched = false;
      }
      renderVariants();
      renderImages();
      setImageAvailability();
      updateHeading();
      updateSummary();
      updateDirty(false);
      form.hidden = false;
      if (loadingHost) loadingHost.hidden = true;
    } catch (error) {
      console.error(error);
      showNotFound(Admin.errorMessage(error, "The product editor could not be loaded."));
    } finally {
      state.loading = false;
    }
  }

  Admin.ready().then(function (profile) {
    if (!profile || !form) return;
    bindEvents();
    loadForm();
  });
})();
