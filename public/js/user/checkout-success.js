async function loadLayout(placeholderId, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
    }

    const html = await response.text();
    document.getElementById(placeholderId).outerHTML = html;

    if (placeholderId === "navbar-placeholder") {
      document.dispatchEvent(new CustomEvent("rosette:navbar-loaded"));
      window.initNavbar?.();
      window.initNavbarAuth?.();
      window.initNavbarCategories?.();
    }
  } catch (error) {
    console.error(`Không thể nạp layout từ ${url}:`, error);
  }
}

function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function getPaymentMethodLabel(method = "") {
  const map = {
    bank_transfer: "Chuyển khoản ngân hàng",
    cash_on_delivery: "Thanh toán khi nhận hàng"
  };
  return map[method] || "Đang cập nhật";
}

function showToast(message, type = "error") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    min-width: 260px;
    max-width: 360px;
    border-left: 4px solid ${type === "error" ? "#ba1a1a" : "#735c00"};
    border-radius: 8px;
    background: rgba(31, 27, 19, 0.95);
    color: #ffffff;
    padding: 14px 18px;
    font-family: 'Be Vietnam Pro', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    transform: translateY(-16px);
    opacity: 0;
    transition: all 0.25s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.transform = "translateY(-16px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

async function loadSuccessDetails() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  if (!orderId) {
    window.location.href = "/views/user/homepage.html";
    return;
  }

  try {
    const response = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`);
    const result = await response.json();

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Không thể lấy thông tin đơn đặt hàng.");
    }

    const order = result.data;
    const payment = order.payment;
    const code = String(order._id).slice(-6).toUpperCase();

    // Populate data fields
    document.getElementById("order-code").textContent = `#${code}`;
    document.getElementById("order-dates").textContent = `${formatDate(order.startDate)} - ${formatDate(order.returnDate)}`;
    document.getElementById("order-total").textContent = formatCurrency(order.totalAmount);

    const method = payment?.method || "bank_transfer";
    document.getElementById("order-payment-method").textContent = getPaymentMethodLabel(method);

  } catch (error) {
    console.error("Error loading success details:", error);
    showToast("Không thể tải thông tin chi tiết đơn hàng: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  await loadSuccessDetails();
});
