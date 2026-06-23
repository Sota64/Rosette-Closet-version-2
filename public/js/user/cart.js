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

async function isUserAuthenticated() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include"
    });
    const result = await response.json();
    return response.ok && result.success && Boolean(result.data?.user);
  } catch (error) {
    return false;
  }
}

function redirectToLogin(returnUrl = window.location.href) {
  window.location.href = `/views/login.html?redirect=${encodeURIComponent(returnUrl)}`;
}

function getProductDetailUrl(productId) {
  return `/views/user/productDetails.html?id=${encodeURIComponent(productId)}`;
}

let cartItemsState = [];

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("rosette_cart") || "[]");
  } catch (error) {
    console.error("Lỗi đọc giỏ hàng từ localStorage:", error);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("rosette_cart", JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent("rosette:cart-updated"));
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

function updateCartTotals() {
  const rentalTotal = cartItemsState.reduce((sum, item) => sum + Number(item.rentalPrice || 0), 0);
  const depositTotal = cartItemsState.reduce((sum, item) => sum + Number(item.deposit || 0), 0);
  const grandTotal = rentalTotal + depositTotal;

  const rentalPriceEl = document.getElementById("summary-rental-price");
  const depositPriceEl = document.getElementById("summary-deposit-price");
  const totalPriceEl = document.getElementById("summary-total-price");

  if (rentalPriceEl) rentalPriceEl.textContent = formatCurrency(rentalTotal);
  if (depositPriceEl) depositPriceEl.textContent = formatCurrency(depositTotal);
  if (totalPriceEl) totalPriceEl.textContent = formatCurrency(grandTotal);
}

function deleteCartItem(productId, size, element) {
  if (element) {
    element.classList.add("removing");
  }

  setTimeout(() => {
    cartItemsState = cartItemsState.filter(item => !(item._id === productId && item.size === size));
    saveCart(cartItemsState);
    renderCart();
  }, 300);
}

function renderCart() {
  cartItemsState = getCart();

  const cartContainer = document.getElementById("cart-container");
  const emptyView = document.getElementById("cart-empty-view");
  const itemsList = document.getElementById("cart-items-list");

  if (!cartItemsState || cartItemsState.length === 0) {
    if (cartContainer) cartContainer.style.display = "none";
    if (emptyView) emptyView.hidden = false;
    return;
  }

  if (cartContainer) cartContainer.style.display = "grid";
  if (emptyView) emptyView.hidden = true;

  if (!itemsList) return;

  itemsList.innerHTML = cartItemsState.map((item) => {
    const uniqueId = `item-${item._id}-${item.size}`;
    const itemTotalRental = Number(item.rentalPrice || 0);
    const itemTotalDeposit = Number(item.deposit || 0);

    return `
      <div class="cart-item" id="${uniqueId}">
        <div class="cart-item-image">
          <a href="${getProductDetailUrl(item._id)}">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
          </a>
        </div>

        <div class="cart-item-details">
          <h3>
            <a href="${getProductDetailUrl(item._id)}">${escapeHtml(item.name)}</a>
          </h3>
          <div class="cart-item-meta">
            <span>Danh mục: <strong>${escapeHtml(item.category || "Bộ sưu tập")}</strong></span>
            <span>Size: <strong>${escapeHtml(item.size)}</strong></span>
            <span>Màu: <strong>${escapeHtml(item.color)}</strong></span>
          </div>
        </div>

        <div class="cart-item-pricing">
          <div class="rental-fee">
            <span class="label">Phí thuê</span>
            <span class="val">${formatCurrency(itemTotalRental)}</span>
          </div>
          <div class="deposit-fee">
            Đặt cọc: <strong>${formatCurrency(itemTotalDeposit)}</strong>
          </div>
          <button type="button" class="delete-item-btn">
            <span class="material-symbols-outlined">delete</span>
            <span>Xóa</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach event listeners to delete button for each item
  cartItemsState.forEach((item) => {
    const uniqueId = `item-${item._id}-${item.size}`;
    const rowEl = document.getElementById(uniqueId);
    if (!rowEl) return;

    const deleteBtn = rowEl.querySelector(".delete-item-btn");

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteCartItem(item._id, item.size, rowEl));
    }
  });

  updateCartTotals();
}

async function handleCheckout() {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    showToast("Giỏ hàng của bạn đang trống!");
    return;
  }

  const rentNowUrl = "/views/user/rentNow.html?from=cart";
  if (!(await isUserAuthenticated())) {
    redirectToLogin(rentNowUrl);
    return;
  }

  // Redirect to the checkout page with cart mode indicator
  window.location.href = rentNowUrl;
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  renderCart();

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", handleCheckout);
  }
});
