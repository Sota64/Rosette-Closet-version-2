async function loadLayout(placeholderId, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    document.getElementById(placeholderId).outerHTML = html;

    if (placeholderId === "navbar-placeholder") {
      window.initNavbarAuth?.();
      window.initNavbarCategories?.();
    }
  } catch (error) {
    console.error(`Không thể nạp layout từ ${url}:`, error);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getStatusLabel(status) {
  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    delivering: "Đang giao",
    renting: "Đang thuê",
    returned: "Đã trả",
    completed: "Hoàn thành",
    cancelled: "Đã hủy"
  };
  return labels[status] || status || "Không rõ";
}

function renderOrders(orders = []) {
  const container = document.getElementById("orders-list");
  if (!container) return;

  if (!orders.length) {
    container.innerHTML = '<div class="account-card account-empty">Bạn chưa có đơn hàng nào.</div>';
    return;
  }

  container.innerHTML = orders.map((order) => {
    const products = (order.items || [])
      .map((item) => {
        const productName = item.product?.name || "Sản phẩm";
        const quantity = Number(item.quantity) || 1;
        return `${escapeHtml(productName)} x${quantity}`;
      })
      .join(", ");

    return `
      <article class="account-card order-card">
        <div class="order-card-header">
          <div>
            <h2>Đơn #${escapeHtml(String(order._id || "").slice(-6).toUpperCase())}</h2>
            <p class="order-meta">${formatDate(order.startDate)} - ${formatDate(order.returnDate)}</p>
          </div>
          <span class="order-status">${escapeHtml(getStatusLabel(order.status))}</span>
        </div>
        <p class="order-products">${products || "Chưa có sản phẩm"}</p>
        <p class="order-total">${formatCurrency(order.totalAmount)}</p>
      </article>
    `;
  }).join("");
}

async function loadOrders() {
  try {
    const response = await fetch("/api/orders/my", { credentials: "include" });
    const result = await response.json();

    if (response.status === 401) {
      window.location.href = "/views/login.html";
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể tải đơn hàng.");
    }

    renderOrders(result.data?.orders || []);
  } catch (error) {
    const container = document.getElementById("orders-list");
    if (container) {
      container.innerHTML = `<div class="account-card account-empty">${escapeHtml(error.message)}</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  loadOrders();
});
