(function () {
  "use strict";

  const Admin = window.KayamAdmin;
  const form = document.getElementById("admin-login-form");
  const emailInput = document.getElementById("admin-email");
  const passwordInput = document.getElementById("admin-password");
  const button = document.getElementById("admin-login-button");
  const errorBox = document.getElementById("login-error");
  const configNote = document.getElementById("login-config-note");
  let submitting = false;

  function showError(message) {
    if (!errorBox) return;
    errorBox.innerHTML = `${Admin.icons.alert}<div>${Admin.escapeHTML(message)}</div>`;
    errorBox.hidden = false;
  }

  function clearError() {
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.innerHTML = "";
    }
  }

  function setSubmitting(value) {
    submitting = value;
    if (!button) return;
    button.disabled = value;
    button.textContent = value ? "Checking your account…" : "Sign in to the dashboard";
  }

  function queryError() {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "config") {
      if (configNote) configNote.hidden = false;
      if (button) button.disabled = true;
      return;
    }
    if (error === "unauthorized") {
      showError("This account is signed in but does not have active administrator access.");
      return;
    }
    if (error === "session") {
      showError("The administrator session could not be verified. Please sign in again.");
    }
  }

  async function checkExistingSession() {
    if (!window.KayamDB || !window.KayamDB.isConfigured()) {
      if (configNote) configNote.hidden = false;
      if (button) button.disabled = true;
      return;
    }
    try {
      const result = await Admin.getAdminSession();
      if (result.session) {
        window.location.replace(Admin.safeNext());
      }
    } catch (error) {
      showError(Admin.errorMessage(error, "The administrator session could not be checked."));
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitting) return;
    clearError();
    emailInput.value = emailInput.value.trim();
    if (!emailInput.validity.valid || !emailInput.value) {
      showError("Enter a valid email address.");
      emailInput.focus();
      return;
    }
    if (!passwordInput.value) {
      showError("Enter your password.");
      passwordInput.focus();
      return;
    }

    setSubmitting(true);
    try {
      const client = Admin.getClient();
      const { error } = await client.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
      });
      if (error) throw error;

      const result = await Admin.getAdminSession();
      if (!result.session) {
        showError("This account does not have active administrator access.");
        setSubmitting(false);
        return;
      }
      window.location.replace(Admin.safeNext());
    } catch (error) {
      console.error(error);
      showError(Admin.errorMessage(error, "Sign-in failed. Please try again."));
      setSubmitting(false);
    }
  });

  queryError();
  checkExistingSession();
})();
