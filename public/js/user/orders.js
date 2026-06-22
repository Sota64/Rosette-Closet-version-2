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

function getProductImage(item) {
  return item?.product?.images?.[0] || "/public/images/img1.png";
}

function renderOrderThumbnails(items = []) {
  const visibleItems = items.slice(0, 2);
  const remainingCount = Math.max(items.length - visibleItems.length, 0);

  if (!visibleItems.length) {
    return `
      <div class="order-thumb-stack order-thumb-stack-empty" aria-label="Đơn hàng chưa có ảnh sản phẩm">
        <span class="material-symbols-outlined">inventory_2</span>
      </div>
    `;
  }

  return `
    <div class="order-thumb-stack" aria-label="${items.length} sản phẩm trong đơn hàng">
      ${visibleItems.map((item) => {
        const productName = item.product?.name || "Sản phẩm";
        return `
          <div class="order-thumb">
            <img src="${escapeHtml(getProductImage(item))}" alt="${escapeHtml(productName)}" />
          </div>
        `;
      }).join("")}
      ${remainingCount > 0 ? `<span class="order-thumb-more">+${remainingCount}</span>` : ""}
    </div>
  `;
}

function renderOrders(orders = []) {
  const container = document.getElementById("orders-list");
  if (!container) return;

  if (!orders.length) {
    container.innerHTML = '<div class="account-card account-empty">Bạn chưa có đơn hàng nào.</div>';
    return;
  }

  container.innerHTML = orders.map((order) => {
    const items = order.items || [];
    const products = (order.items || [])
      .map((item) => {
        const productName = item.product?.name || "Sản phẩm";
        const quantity = Number(item.quantity) || 1;
        return `${escapeHtml(productName)} x${quantity}`;
      })
      .join(", ");

    return `
      <article class="account-card order-card" onclick="openOrderDetailModal('${order._id}')">
        ${renderOrderThumbnails(items)}
        <div class="order-card-content">
          <div class="order-card-header">
            <div>
              <h2>Đơn #${escapeHtml(String(order._id || "").slice(-6).toUpperCase())}</h2>
              <p class="order-meta">${formatDate(order.startDate)} - ${formatDate(order.returnDate)}</p>
            </div>
            <span class="order-status">${escapeHtml(getStatusLabel(order.status))}</span>
          </div>
          <p class="order-products">${products || "Chưa có sản phẩm"}</p>
          <p class="order-total">${formatCurrency(order.totalAmount)}</p>
        </div>
      </article>
    `;
  }).join("");
}

async function openOrderDetailModal(orderId) {
  const modal = document.getElementById("modal-order-detail");
  const modalBody = document.getElementById("detail-modal-body");
  
  if (!modal || !modalBody) return;

  modalBody.innerHTML = '<div class="account-card account-empty" style="border: 0; box-shadow: none; text-align: center;">Đang tải chi tiết đơn hàng...</div>';
  modal.style.display = "flex";

  try {
    const response = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
    const result = await response.json();

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Không thể tải thông tin đơn hàng.");
    }

    const order = result.data;
    const payment = order.payment;
    const code = String(order._id).slice(-6).toUpperCase();

    // Calculate rental days
    const diffMs = new Date(order.returnDate).getTime() - new Date(order.startDate).getTime();
    const rentalDays = Math.max(Math.ceil(diffMs / (24 * 60 * 60 * 1000)), 1);

    // Sum product items cost
    let totalRent = 0;
    let totalDeposit = 0;

    const productsHtml = (order.items || []).map((item) => {
      const product = item.product;
      const name = product?.name || "Sản phẩm đã xóa";
      const image = product?.images?.[0] || "/public/images/img1.png";
      const size = item.size || "S";
      const color = product?.color || "Đang cập nhật";
      const rentalPrice = item.rentalPrice || 0;
      const deposit = item.deposit || 0;
      const quantity = item.quantity || 1;

      totalRent += rentalPrice * quantity;
      totalDeposit += deposit * quantity;

      return `
        <div class="modal-product-item">
          <img class="modal-product-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" />
          <div class="modal-product-info">
            <h4 class="modal-product-name">${escapeHtml(name)}</h4>
            <p class="modal-product-meta">Size: ${escapeHtml(size)} | Màu: ${escapeHtml(color)} | Số lượng: ${quantity}</p>
          </div>
          <div class="modal-product-price">
            <strong>${formatCurrency(rentalPrice)}</strong>
            <span>Cọc: ${formatCurrency(deposit)}</span>
          </div>
        </div>
      `;
    }).join("");

    const paymentMethodLabel = getPaymentMethodLabel(payment?.method);
    const orderStatusLabel = getStatusLabel(order.status);
    const customer = order.user || {};
    const address = customer.address || "Chưa cập nhật";



    modalBody.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Thông tin chung</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span>Mã đơn hàng</span>
            <strong style="color: var(--primary);">#${code}</strong>
          </div>
          <div class="detail-item">
            <span>Trạng thái</span>
            <strong style="color: var(--primary);">${escapeHtml(orderStatusLabel)}</strong>
          </div>
          <div class="detail-item">
            <span>Ngày nhận</span>
            <strong>${formatDate(order.startDate)}</strong>
          </div>
          <div class="detail-item">
            <span>Ngày trả (dự kiến)</span>
            <strong>${formatDate(order.returnDate)} (${rentalDays} ngày)</strong>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Thông tin giao hàng</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span>Người nhận</span>
            <strong>${escapeHtml(customer.fullName || "Khách hàng")}</strong>
          </div>
          <div class="detail-item">
            <span>Số điện thoại</span>
            <strong>${escapeHtml(customer.phone || "Chưa cập nhật")}</strong>
          </div>
          <div class="detail-item full">
            <span>Địa chỉ giao hàng</span>
            <strong>${escapeHtml(address)}</strong>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Danh sách sản phẩm</div>
        <div class="modal-product-list">
          ${productsHtml}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Thanh toán</div>
        <div class="modal-cost-summary">
          <div class="modal-cost-row">
            <span>Tổng phí thuê</span>
            <span>${formatCurrency(totalRent)}</span>
          </div>
          <div class="modal-cost-row">
            <span>Tổng tiền đặt cọc</span>
            <span>${formatCurrency(totalDeposit)}</span>
          </div>
          <div class="modal-cost-row">
            <span>Phí vận chuyển</span>
            <span style="color: var(--primary); font-weight: 500;">Miễn phí</span>
          </div>
          <div class="modal-cost-row">
            <span>Phương thức</span>
            <span>${escapeHtml(paymentMethodLabel)}</span>
          </div>
          <div class="modal-cost-row total">
            <span>Tổng cộng</span>
            <span>${formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("detail-modal-title").textContent = `Chi tiết đơn hàng #${code}`;
  } catch (error) {
    modalBody.innerHTML = `<div class="account-card account-empty" style="border: 0; box-shadow: none; color: #ba1a1a; text-align: center;">Lỗi: ${escapeHtml(error.message)}</div>`;
  }
}

function getPaymentMethodLabel(method = "") {
  const map = {
    bank_transfer: "Chuyển khoản ngân hàng",
    cash_on_delivery: "Thanh toán khi nhận hàng"
  };
  return map[method] || "Đang cập nhật";
}

function closeOrderDetailModal() {
  const modal = document.getElementById("modal-order-detail");
  if (modal) {
    modal.style.display = "none";
  }
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

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("modal-order-detail");
    if (event.target === modal) {
      closeOrderDetailModal();
    }
  });
});
