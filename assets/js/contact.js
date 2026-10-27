(function () {
  "use strict";

  const Kayam = window.Kayam;
  const form = document.getElementById("contact-form");
  if (!form || !Kayam || !Kayam.whatsapp) return;

  const nameInput = document.getElementById("contact-name");
  const topicInput = document.getElementById("contact-topic");
  const referenceInput = document.getElementById("contact-reference");
  const messageInput = document.getElementById("contact-message");
  const consentInput = document.getElementById("contact-consent");
  const status = document.getElementById("contact-status");

  function fieldWrap(input) {
    return input ? input.closest("[data-field]") : null;
  }

  function setError(input, message) {
    const field = fieldWrap(input);
    const error = document.getElementById(`${input.id}-error`);
    if (!field || !error) return;
    const invalid = Boolean(message);
    field.classList.toggle("is-invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
    error.textContent = message || "";
    error.hidden = !invalid;
  }

  function validate() {
    const errors = [];
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    if (name.length < 2) {
      setError(nameInput, "Please enter your name.");
      errors.push(nameInput);
    } else {
      setError(nameInput, "");
    }
    if (message.length < 10) {
      setError(messageInput, "Please write a message of at least 10 characters.");
      errors.push(messageInput);
    } else {
      setError(messageInput, "");
    }
    if (!consentInput.checked) {
      setError(consentInput, "Please confirm before continuing.");
      errors.push(consentInput);
    } else {
      setError(consentInput, "");
    }
    return errors;
  }

  function buildMessage() {
    const lines = [
      "KAYAM SPICES",
      "",
      "Website enquiry",
      `Name: ${nameInput.value.trim()}`,
    ];
    if (topicInput.value) lines.push(`Topic: ${topicInput.value}`);
    if (referenceInput.value.trim()) lines.push(`Order reference: ${referenceInput.value.trim()}`);
    lines.push("", "Message:", messageInput.value.trim());
    return lines.join("\n");
  }

  function renderPreparedStatus(url) {
    status.innerHTML = `<div class="alert alert--info" style="margin-top: 1rem;">
      <span aria-hidden="true">${Kayam.icon("whatsapp")}</span>
      <div><strong class="alert__title">Your message is ready in WhatsApp</strong>A WhatsApp tab has been requested. Press Send in WhatsApp to deliver this message. Nothing has been sent yet. <a href="${Kayam.escapeHTML(
        url,
      )}" target="_blank" rel="noopener" style="text-decoration: underline; text-decoration-color: var(--gold);">Open WhatsApp again</a> if a new tab did not appear.</div>
    </div>`;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    status.innerHTML = "";
    const errors = validate();
    if (errors.length) {
      errors[0].focus();
      status.innerHTML = `<div class="alert alert--error" style="margin-top: 1rem;">
        <span aria-hidden="true">${Kayam.icon("alert")}</span>
        <div>Please check the highlighted fields.</div>
      </div>`;
      return;
    }
    const url = Kayam.whatsapp.buildWhatsAppUrl(buildMessage());
    renderPreparedStatus(url);
    const popup = window.open(url, "_blank");
    if (popup) popup.opener = null;
  });

  [nameInput, messageInput, consentInput].forEach(function (input) {
    input.addEventListener("input", function () {
      if (fieldWrap(input)?.classList.contains("is-invalid")) validate();
    });
    input.addEventListener("change", function () {
      if (fieldWrap(input)?.classList.contains("is-invalid")) validate();
    });
  });
})();
