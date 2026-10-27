(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const errorHost = document.getElementById("settings-error");
  const accountForm = document.getElementById("account-form");
  const accountStatus = document.getElementById("account-status");
  const accountSave = document.getElementById("account-save");
  const accountDetails = document.getElementById("account-details");
  const passwordForm = document.getElementById("password-form");
  const passwordStatus = document.getElementById("password-status");
  const passwordSave = document.getElementById("password-save");
  const sessionDetails = document.getElementById("session-details");
  const connectionDetails = document.getElementById("connection-details");
  const signOutButton = document.getElementById("session-signout");
  const signOutAllButton = document.getElementById("session-signout-all");
  let profile = null;
  let user = null;
  let busy = false;

  function detailRow(label, value) {
    return `<div><dt>${Admin.escapeHTML(label)}</dt><dd>${Admin.escapeHTML(value || "—")}</dd></div>`;
  }

  function projectHost() {
    const raw = window.KAYAM_CONFIG && window.KAYAM_CONFIG.SUPABASE_URL;
    if (!raw || /^YOUR_/.test(raw)) return "Not configured";
    try {
      return new URL(raw).host;
    } catch (error) {
      return "Invalid URL";
    }
  }

  function fillAccount() {
    if (!profile || !user) {
      if (errorHost) {
        errorHost.innerHTML = Admin.alertMarkup(
          "The administrator profile could not be found for this session.",
          "error",
          "Account unavailable",
        );
      }
      return;
    }
    const emailInput = document.getElementById("settings-email");
    if (emailInput) emailInput.value = user.email || profile.email || "";
    if (accountForm) accountForm.elements.display_name.value = profile.display_name || "";
    if (accountDetails) {
      accountDetails.innerHTML =
        detailRow("Display name", profile.display_name || "Administrator") +
        detailRow("Access level", "Administrator") +
        detailRow("Profile status", profile.is_active ? "Active" : "Inactive") +
        detailRow("Account created", Admin.formatDate(user.created_at, true)) +
        detailRow("Last sign-in", Admin.formatDate(user.last_sign_in_at, true));
    }
  }

  async function fillSession() {
    try {
      const { data, error } = await Admin.getClient().auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (sessionDetails) {
        sessionDetails.innerHTML =
          detailRow("Signed in as", user.email || "—") +
          detailRow(
            "Session expires",
            session && session.expires_at
              ? Admin.formatDate(new Date(session.expires_at * 1000).toISOString(), true)
              : "—",
          ) +
          detailRow("Authentication", "Supabase email and password");
      }
    } catch (error) {
      console.error(error);
      if (sessionDetails) sessionDetails.innerHTML = detailRow("Session", "Could not read session details");
    }
  }

  function fillConnection() {
    if (!connectionDetails) return;
    const config = window.KAYAM_CONFIG || {};
    connectionDetails.innerHTML =
      detailRow("Supabase project", projectHost()) +
      detailRow("Storage bucket", config.STORAGE_BUCKET || "product-images") +
      detailRow("WhatsApp number", config.WHATSAPP_NUMBER || "—") +
      detailRow("Contact email", config.CONTACT_EMAIL || "—") +
      detailRow("Currency", config.CURRENCY || "INR");
  }

  function updateShellName(name) {
    document.querySelectorAll(".admin-user__name").forEach(function (element) {
      element.textContent = name || "Administrator";
    });
    document.querySelectorAll(".admin-user__avatar").forEach(function (element) {
      element.textContent = String(name || "A").trim().charAt(0).toUpperCase() || "A";
    });
  }

  async function saveAccount(event) {
    event.preventDefault();
    if (!accountForm || busy || !profile) return;
    if (accountStatus) accountStatus.innerHTML = "";
    const name = accountForm.elements.display_name.value.trim();
    if (!name) {
      if (accountStatus) accountStatus.innerHTML = Admin.alertMarkup("Enter a display name.", "error");
      accountForm.elements.display_name.focus();
      return;
    }
    if (name.length > 80) {
      if (accountStatus) accountStatus.innerHTML = Admin.alertMarkup("Display names must be 80 characters or fewer.", "error");
      accountForm.elements.display_name.focus();
      return;
    }
    busy = true;
    if (accountSave) {
      accountSave.disabled = true;
      accountSave.textContent = "Saving…";
    }
    try {
      const { data, error } = await Admin.getClient()
        .from("admin_profiles")
        .update({ display_name: name })
        .eq("user_id", user.id)
        .select("display_name")
        .single();
      if (error) throw error;
      profile.display_name = data.display_name;
      if (accountForm) accountForm.elements.display_name.value = data.display_name || "";
      updateShellName(data.display_name);
      fillAccount();
      if (accountStatus) {
        accountStatus.innerHTML = Admin.alertMarkup("Display name saved.", "success");
      }
      Admin.showToast("Display name updated.", "success");
    } catch (error) {
      console.error(error);
      if (accountStatus) {
        accountStatus.innerHTML = Admin.alertMarkup(
          Admin.errorMessage(error, "The display name could not be saved."),
          "error",
        );
      }
    } finally {
      busy = false;
      if (accountSave) {
        accountSave.disabled = false;
        accountSave.textContent = "Save display name";
      }
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (!passwordForm || busy || !user) return;
    if (passwordStatus) passwordStatus.innerHTML = "";
    const currentPassword = passwordForm.elements.current_password.value;
    const newPassword = passwordForm.elements.new_password.value;
    const confirmPassword = passwordForm.elements.confirm_password.value;
    if (!currentPassword) {
      if (passwordStatus) passwordStatus.innerHTML = Admin.alertMarkup("Enter your current password.", "error");
      passwordForm.elements.current_password.focus();
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      if (passwordStatus) {
        passwordStatus.innerHTML = Admin.alertMarkup("New passwords must be between 8 and 72 characters.", "error");
      }
      passwordForm.elements.new_password.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      if (passwordStatus) {
        passwordStatus.innerHTML = Admin.alertMarkup("The new passwords do not match.", "error");
      }
      passwordForm.elements.confirm_password.focus();
      return;
    }
    if (newPassword === currentPassword) {
      if (passwordStatus) {
        passwordStatus.innerHTML = Admin.alertMarkup("Choose a new password that differs from the current one.", "error");
      }
      passwordForm.elements.new_password.focus();
      return;
    }
    busy = true;
    if (passwordSave) {
      passwordSave.disabled = true;
      passwordSave.textContent = "Updating…";
    }
    try {
      const client = Admin.getClient();
      const email = user.email || profile.email;
      if (!email) throw new Error("No sign-in email is attached to this administrator account.");
      const { error: authError } = await client.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (authError) {
        const error = new Error(/invalid login credentials/i.test(authError.message || "") ? "The current password is incorrect." : authError.message);
        throw error;
      }
      const { error: updateError } = await client.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      passwordForm.reset();
      if (passwordStatus) {
        passwordStatus.innerHTML = Admin.alertMarkup(
          "Password updated. Use the new password the next time you sign in.",
          "success",
        );
      }
      Admin.showToast("Password updated.", "success");
    } catch (error) {
      console.error(error);
      if (passwordStatus) {
        passwordStatus.innerHTML = Admin.alertMarkup(
          Admin.errorMessage(error, "The password could not be updated."),
          "error",
        );
      }
    } finally {
      busy = false;
      if (passwordSave) {
        passwordSave.disabled = false;
        passwordSave.textContent = "Update password";
      }
    }
  }

  async function signOut() {
    if (busy) return;
    busy = true;
    try {
      const { error } = await Admin.getClient().auth.signOut();
      if (error) throw error;
      window.location.replace("login.html");
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "Sign out failed. Try again."), "error");
      busy = false;
    }
  }

  async function signOutEverywhere() {
    if (busy) return;
    if (
      !window.confirm(
        "Sign out of every device using this administrator account? You will need to sign in again here.",
      )
    ) {
      return;
    }
    busy = true;
    try {
      const { error } = await Admin.getClient().auth.signOut({ scope: "global" });
      if (error) throw error;
      window.location.replace("login.html");
    } catch (error) {
      console.error(error);
      Admin.showToast(Admin.errorMessage(error, "The account could not be signed out everywhere."), "error");
      busy = false;
    }
  }

  function bindEvents() {
    if (accountForm) accountForm.addEventListener("submit", saveAccount);
    if (passwordForm) passwordForm.addEventListener("submit", changePassword);
    if (signOutButton) signOutButton.addEventListener("click", signOut);
    if (signOutAllButton) signOutAllButton.addEventListener("click", signOutEverywhere);
  }

  Admin.ready().then(function (loadedProfile) {
    if (!loadedProfile) return;
    profile = loadedProfile;
    user = Admin.getUser();
    fillAccount();
    fillConnection();
    fillSession();
    bindEvents();
  });
})();
