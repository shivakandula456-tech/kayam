(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const listHost = document.getElementById("categories-list");
  const errorHost = document.getElementById("categories-error");
  const refreshButton = document.getElementById("categories-refresh");
  const addButton = document.getElementById("category-add");
  const dialog = document.getElementById("category-dialog");
  const dialogTitle = document.getElementById("category-dialog-title");
  const dialogSubtitle = document.getElementById("category-dialog-subtitle");
  const form = document.getElementById("category-form");
  const formStatus = document.getElementById("category-form-status");
  const saveButton = document.getElementById("category-save");
  const slugGenerate = document.getElementById("category-slug-generate");
  const closeButtons = document.querySelectorAll("[data-close-category]");
  const closeIcon = dialog ? dialog.querySelector(".admin-dialog__close") : null;
  if (closeIcon) closeIcon.innerHTML = Admin.icons.close;
  const state = {
    categories: [],
    counts: {},
    editing: null,
    loading: false,
    busy: false,
    slugTouched: false,
  };

  function emptyMarkup(title, text, action) {
    return `<div class="admin-empty">
      <span class="admin-empty__icon" aria-hidden="true">${Admin.icons.categories}</span>
      <h3>${Admin.escapeHTML(title)}</h3>
      <p>${Admin.escapeHTML(text)}</p>
      ${action || ""}
    </div>`;
  }

  function render() {
    if (!listHost) return;
    if (!state.categories.length) {
      listHost.innerHTML = emptyMarkup(
        "No categories yet",
        "Create a collection to organise products on the storefront.",
        '<button class="admin-btn admin-btn--small" type="button" data-open-category>Add category</button>',
      );
      return;
    }
    listHost.innerHTML = `<div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Category</th><th>Order</th><th>Products</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          ${state.categories
            .map(function (category) {
              const count = state.counts[category.id] || 0;
              return `<tr>
                <td>
                  <span class="admin-table__primary">${Admin.escapeHTML(category.name)}</span>
                  <span class="admin-table__secondary">${Admin.escapeHTML(category.slug)}${
                    category.description
                      ? ` · ${Admin.escapeHTML(
                          category.description.length > 90
                            ? `${category.description.slice(0, 90).trimEnd()}…`
                            : category.description,
                        )}`
                      : ""
                  }</span>
                </td>
                <td>${Number(category.display_order) || 0}</td>
                <td><a class="admin-link" href="products.html?category=${encodeURIComponent(category.id)}">${count} ${
                  count === 1 ? "product" : "products"
                }</a></td>
                <td><span class="admin-status admin-status--${category.is_active ? "active" : "inactive"}">${
                  category.is_active ? "Active" : "Inactive"
                }</span></td>
                <td>
                  <div class="admin-table__actions">
                    <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-edit-category="${Admin.escapeHTML(
                      category.id,
                    )}">Edit</button>
                    <button class="admin-btn admin-btn--outline admin-btn--small" type="button" data-toggle-category="${Admin.escapeHTML(
                      category.id,
                    )}" data-next-active="${category.is_active ? "false" : "true"}">${
                      category.is_active ? "Deactivate" : "Activate"
                    }</button>
                    <button class="admin-btn admin-btn--danger admin-btn--small" type="button" data-delete-category="${Admin.escapeHTML(
                      category.id,
                    )}">Delete</button>
                  </div>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function resetForm() {
    if (!form) return;
    form.reset();
    form.elements.display_order.value = String(
      state.categories.reduce((max, category) => Math.max(max, Number(category.display_order) || 0), 0) + 1,
    );
    form.elements.is_active.checked = true;
    if (formStatus) formStatus.innerHTML = "";
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save category";
    }
    state.slugTouched = false;
  }

  function openForm(category) {
    if (!dialog || !form) return;
    state.editing = category || null;
    resetForm();
    if (category) {
      form.elements.name.value = category.name || "";
      form.elements.slug.value = category.slug || "";
      form.elements.description.value = category.description || "";
      form.elements.display_order.value = String(category.display_order || 0);
      form.elements.is_active.checked = category.is_active;
      state.slugTouched = true;
      if (dialogTitle) dialogTitle.textContent = "Edit category";
      if (dialogSubtitle) dialogSubtitle.textContent = `Update ${category.name}.`;
    } else {
      if (dialogTitle) dialogTitle.textContent = "Add category";
      if (dialogSubtitle) dialogSubtitle.textContent = "Create a collection for the storefront.";
    }
    if (!dialog.open) dialog.showModal();
    form.elements.name.focus();
  }

  function closeForm() {
    if (!dialog || !dialog.open) return;
    dialog.close();
    state.editing = null;
    state.slugTouched = false;
  }

  function showFormError(message) {
    if (formStatus) formStatus.innerHTML = Admin.alertMarkup(message, "error");
  }

  async function loadCategories() {
    if (state.loading) return;
    state.loading = true;
    if (errorHost) errorHost.innerHTML = "";
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing…";
    }
    if (listHost) listHost.innerHTML = '<div class="admin-loading">Loading categories…</div>';
    try {
      const client = Admin.getClient();
      const [categoriesResult, productsResult] = await Promise.all([
        client
          .from("categories")
          .select("id,name,slug,description,is_active,display_order,created_at")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        client.from("products").select("category_id"),
      ]);
      const error = categoriesResult.error || productsResult.error;
      if (error) throw error;
      state.categories = categoriesResult.data || [];
      state.counts = {};
      (productsResult.data || []).forEach(function (product) {
        if (product.category_id) {
          state.counts[product.category_id] = (state.counts[product.category_id] || 0) + 1;
        }
      });
      render();
    } catch (error) {
      console.error(error);
      if (errorHost) {
        errorHost.innerHTML = Admin.alertMarkup(
          Admin.errorMessage(error, "Categories could not be loaded."),
          "error",
          "Categories unavailable",
        );
      }
      if (listHost) listHost.innerHTML = emptyMarkup("Categories unavailable", "Refresh the page to try again.");
    } finally {
      state.loading = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "Refresh";
      }
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!form || state.busy) return;
    const name = form.elements.name.value.trim();
    if (!name) {
      showFormError("Enter a category name.");
      form.elements.name.focus();
      return;
    }
    if (name.length > 120) {
      showFormError("Category names must be 120 characters or fewer.");
      form.elements.name.focus();
      return;
    }
    const slug = Admin.slugify(form.elements.slug.value || name);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      showFormError("Use a valid URL slug: lowercase letters and numbers separated by hyphens.");
      form.elements.slug.focus();
      return;
    }
    const displayOrder = Number(form.elements.display_order.value || 0);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      showFormError("Display order must be a whole number of zero or more.");
      form.elements.display_order.focus();
      return;
    }
    const payload = {
      name,
      slug,
      description: form.elements.description.value.trim() || null,
      display_order: displayOrder,
      is_active: form.elements.is_active.checked,
    };
    const wasEditing = Boolean(state.editing);
    state.busy = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }
    if (formStatus) formStatus.innerHTML = "";
    try {
      const client = Admin.getClient();
      let result;
      if (state.editing) {
        result = await client.from("categories").update(payload).eq("id", state.editing.id).select("id").single();
      } else {
        result = await client.from("categories").insert(payload).select("id").single();
      }
      if (result.error) throw result.error;
      closeForm();
      Admin.showToast(wasEditing ? "Category updated." : "Category created.", "success");
      await loadCategories();
    } catch (error) {
      console.error(error);
      const message = /duplicate key/i.test(String(error && error.message))
        ? "That URL slug is already used by another category. Choose a different slug."
        : Admin.errorMessage(error, "The category could not be saved.");
      showFormError(message);
      if (saveButton) saveButton.disabled = false;
      saveButton.textContent = "Save category";
    } finally {
      state.busy = false;
    }
  }

  async function toggleCategory(button) {
    if (state.busy) return;
    const id = button.dataset.toggleCategory;
    const nextActive = button.dataset.nextActive === "true";
    state.busy = true;
    button.disabled = true;
    try {
      const { data, error } = await Admin.getClient()
        .from("categories")
        .update({ is_active: nextActive })
        .eq("id", id)
        .select("id,is_active")
        .single();
      if (error) throw error;
      const category = state.categories.find((item) => item.id === id);
      if (category) category.is_active = data.is_active;
      Admin.showToast(nextActive ? "Category activated." : "Category deactivated.", "success");
      render();
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The category status could not be changed."), "error");
      button.disabled = false;
    } finally {
      state.busy = false;
    }
  }

  async function deleteCategory(button) {
    if (state.busy) return;
    const id = button.dataset.deleteCategory;
    const category = state.categories.find((item) => item.id === id);
    if (!category) return;
    const count = state.counts[id] || 0;
    const warning = count
      ? `"${category.name}" has ${count} ${count === 1 ? "product" : "products"}. They will become uncategorised.`
      : `"${category.name}" will be permanently removed.`;
    if (!window.confirm(`${warning}\n\nDelete this category? This cannot be undone.`)) return;
    state.busy = true;
    button.disabled = true;
    try {
      const { error } = await Admin.getClient().from("categories").delete().eq("id", id);
      if (error) throw error;
      state.categories = state.categories.filter((item) => item.id !== id);
      Admin.showToast("Category deleted.", "success");
      render();
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The category could not be deleted."), "error");
      button.disabled = false;
    } finally {
      state.busy = false;
    }
  }

  function bindEvents() {
    if (refreshButton) refreshButton.addEventListener("click", loadCategories);
    if (addButton) addButton.addEventListener("click", () => openForm(null));
    if (form) form.addEventListener("submit", saveCategory);
    closeButtons.forEach(function (button) {
      button.addEventListener("click", closeForm);
    });
    if (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeForm();
      });
      dialog.addEventListener("close", function () {
        state.editing = null;
      });
    }
    if (form) {
      form.elements.name.addEventListener("input", function () {
        if (state.slugTouched) return;
        form.elements.slug.value = Admin.slugify(form.elements.name.value);
      });
      form.elements.slug.addEventListener("input", function () {
        state.slugTouched = form.elements.slug.value.length > 0;
      });
    }
    if (slugGenerate && form) {
      slugGenerate.addEventListener("click", function () {
        form.elements.slug.value = Admin.slugify(form.elements.name.value);
        state.slugTouched = false;
        form.elements.slug.focus();
      });
    }
    if (listHost) {
      listHost.addEventListener("click", function (event) {
        const open = event.target.closest("[data-open-category]");
        if (open) {
          openForm(null);
          return;
        }
        const edit = event.target.closest("[data-edit-category]");
        if (edit) {
          openForm(state.categories.find((item) => item.id === edit.dataset.editCategory) || null);
          return;
        }
        const toggle = event.target.closest("[data-toggle-category]");
        if (toggle) {
          toggleCategory(toggle);
          return;
        }
        const remove = event.target.closest("[data-delete-category]");
        if (remove) deleteCategory(remove);
      });
    }
  }

  Admin.ready().then(function (profile) {
    if (!profile) return;
    bindEvents();
    loadCategories();
  });
})();
