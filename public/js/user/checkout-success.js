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

function showCopyToast() {
  let toast = document.getElementById("toast-copy-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-copy-notification";
    toast.className = "toast-copy";
    toast.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>Đã sao chép vào bộ nhớ tạm!</span>
    `;
    document.body.appendChild(toast);
  }

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function copyText(elementId) {
  const text = document.getElementById(elementId)?.innerText;
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => {
      showCopyToast();
    })
    .catch((err) => {
      console.error("Lỗi sao chép:", err);
    });
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

    if (method === "bank_transfer") {
      const bankTransferBox = document.getElementById("bank-transfer-box");
      const bankMemo = document.getElementById("bank-memo");
      
      if (bankMemo) {
        bankMemo.textContent = `RC ${code}`;
      }
      if (bankTransferBox) {
        bankTransferBox.hidden = false;
      }
    }
  } catch (error) {
    console.error("Error loading success details:", error);
    alert("Không thể tải thông tin chi tiết đơn hàng: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  await loadSuccessDetails();
});

// Expose copyText to HTML window context
window.copyText = copyText;
