(function () {
  "use strict";

  const Kayam = (window.Kayam = window.Kayam || {});
  const config = window.KAYAM_CONFIG || {};
  const businessNumber = String(config.WHATSAPP_NUMBER || "917888060231").replace(/\D/g, "");

  function buildWhatsAppUrl(message, phone) {
    const number = String(phone || businessNumber).replace(/\D/g, "") || businessNumber;
    return `https://wa.me/${number}?text=${encodeURIComponent(String(message || "").trim())}`;
  }

  function openWhatsApp(message) {
    const url = buildWhatsAppUrl(message);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
  }

  function buildOrderMessage(order) {
    const lines = [];
    lines.push("KAYAM SPICES");
    lines.push(`Order reference: ${order.orderReference}`);
    lines.push("");
    lines.push(`Customer: ${order.customerName}`);
    lines.push(`Phone: ${order.customerPhone}`);
    lines.push(`Delivery address: ${order.customerAddress}`);
    lines.push("");
    lines.push("Order items:");
    (order.items || []).forEach(function (item, index) {
      lines.push(`${index + 1}. ${item.productName}`);
      lines.push(`   Weight: ${item.variantLabel}`);
      lines.push(`   Quantity: ${item.quantity}`);
      lines.push(`   Unit price: ${Kayam.formatMoney(item.unitPricePaise, { decimals: true })}`);
      lines.push(`   Line total: ${Kayam.formatMoney(item.lineTotalPaise, { decimals: true })}`);
    });
    lines.push("");
    lines.push(`Subtotal: ${Kayam.formatMoney(order.subtotalPaise, { decimals: true })}`);
    lines.push("Delivery availability and delivery charges: To be confirmed by KAYAM SPICES.");
    lines.push("Final payable amount: Pending confirmation.");
    lines.push("Payment: To be arranged separately after confirmation.");
    lines.push("Order status: Pending confirmation. This order has not yet been confirmed by the business.");
    lines.push("");
    lines.push("I understand that this order is pending confirmation and that delivery and payment will be arranged directly with KAYAM SPICES.");
    return lines.join("\n");
  }

  function buildProductEnquiry(product, variant) {
    const lines = [
      "KAYAM SPICES",
      `Product enquiry: ${product.name}`,
    ];
    if (variant) {
      lines.push(`Weight: ${Kayam.formatWeight(variant.weight_value, variant.weight_unit)}`);
    }
    if (product.slug) {
      lines.push(`Product page: ${window.location.origin}${window.location.pathname.replace(/product\.html$/, "")}product.html?slug=${encodeURIComponent(product.slug)}`);
    }
    lines.push("");
    lines.push("Hello KAYAM SPICES, I would like to know more about this product.");
    return lines.join("\n");
  }

  function buildContactMessage() {
    return "KAYAM SPICES\n\nHello KAYAM SPICES, I would like to ask about your spices and ordering.";
  }

  Kayam.whatsapp = {
    number: businessNumber,
    buildWhatsAppUrl,
    openWhatsApp,
    buildOrderMessage,
    buildProductEnquiry,
    buildContactMessage,
  };
})();
