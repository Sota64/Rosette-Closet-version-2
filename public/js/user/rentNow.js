const rentNowState = {
  products: [],
  rentalDays: 3
};

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

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getRentalDays() {
  const startDate = document.getElementById("rental-start-date")?.value;
  const returnDate = document.getElementById("rental-return-date")?.value;

  if (!startDate || !returnDate) return 1;

  const diffMs = new Date(returnDate).getTime() - new Date(startDate).getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  return Math.max(diffDays, 1);
}

function getProductImage(product) {
  return product?.images?.[0] || "/public/images/img1.png";
}

function getCategoryName(product) {
  return product?.category?.name || "Bộ sưu tập";
}

async function parseApiResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result.data;
}

async function resolveProductId() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (productId) return productId;

  const response = await fetch("/api/products?limit=1&status=available", {
    credentials: "include"
  });
  const data = await parseApiResponse(response, "Không thể tìm sản phẩm để thuê");
  const firstProduct = data.products?.[0];

  if (!firstProduct?._id) {
    throw new Error("Chưa có sản phẩm khả dụng để thuê.");
  }

  return firstProduct._id;
}

async function fetchProduct(productId) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
    credentials: "include"
  });

  return parseApiResponse(response, "Không thể tải sản phẩm");
}

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "include"
  });
  const data = await parseApiResponse(response, "Vui lòng đăng nhập để đặt thuê sản phẩm");

  return data.user;
}

function setValue(id, value) {
  const input = document.getElementById(id);
  if (input) {
    input.value = value || "";
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function parseAddress(addressString = "") {
  if (!addressString) {
    return { street: "", ward: "", district: "", city: "" };
  }
  const parts = addressString.split(",").map((p) => p.trim());
  const address = {
    street: "",
    ward: "",
    district: "",
    city: ""
  };

  if (parts.length >= 4) {
    address.city = parts[parts.length - 1];
    address.district = parts[parts.length - 2];
    address.ward = parts[parts.length - 3];
    address.street = parts.slice(0, parts.length - 3).join(", ");
  } else if (parts.length === 3) {
    address.city = parts[2];
    address.district = parts[1];
    address.street = parts[0];
  } else if (parts.length === 2) {
    address.city = parts[1];
    address.street = parts[0];
  } else {
    address.street = addressString;
  }

  return address;
}

function renderUser(user) {
  setValue("customer-name", user.fullName);
  setValue("customer-phone", user.phone);
  setValue("customer-email", user.email);
  
  const addr = parseAddress(user.address);
  setValue("customer-province", addr.city);
  setValue("customer-district", addr.district);
  setValue("customer-ward", addr.ward);
  setValue("customer-street", addr.street);
}

function renderProductsList() {
  const listEl = document.getElementById("order-products-list");
  if (!listEl) return;

  listEl.innerHTML = rentNowState.products.map(item => {
    const imgUrl = item.image || getProductImage(item);
    return `
      <div class="order-product" style="display: flex; gap: 16px; margin-bottom: 16px; border-bottom: 1px dashed var(--outline-variant); padding-bottom: 16px;">
        <div class="product-thumb" style="width: 72px; height: 96px; flex-shrink: 0; overflow: hidden; border-radius: 6px;">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div>
          <h4 style="font-size: 15px; font-weight: 600; color: var(--primary); margin: 0 0 4px 0;">${escapeHtml(item.name)}</h4>
          <p style="font-size: 13px; color: var(--on-surface-variant); margin: 0 0 2px 0;">Phân loại: ${escapeHtml(item.category || getCategoryName(item))}</p>
          <p style="font-size: 13px; color: var(--on-surface-variant); margin: 0 0 4px 0;">Size: ${escapeHtml(item.size || "Mặc định")} | SL: ${item.quantity || 1}</p>
          <strong style="font-size: 14px; font-weight: 600; color: var(--on-surface);">${formatCurrency(item.rentalPrice)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function updateOrderSummary() {
  const products = rentNowState.products;
  if (!products || products.length === 0) return;

  rentNowState.rentalDays = getRentalDays();

  const rentalTotal = products.reduce((sum, item) => sum + Number(item.rentalPrice || 0) * (Number(item.quantity) || 1), 0);
  const depositTotal = products.reduce((sum, item) => sum + Number(item.deposit || 0) * (Number(item.quantity) || 1), 0);
  const total = rentalTotal + depositTotal;

  setText("rental-days-label", `Phí thuê (${rentNowState.rentalDays} ngày)`);
  setText("rental-price-total", formatCurrency(rentalTotal));
  setText("rental-deposit", formatCurrency(depositTotal));
  setText("rental-total", formatCurrency(total));
}

function setFeedback(message, type = "") {
  const feedback = document.getElementById("checkout-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `checkout-feedback ${type}`.trim();
}

function bindPaymentOptions() {
  document.querySelectorAll(".payment-option").forEach((option) => {
    option.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((item) => {
        item.classList.toggle("selected", item === option);
      });
    });
  });
}

function bindDateInputs() {
  const startInput = document.getElementById("rental-start-date");
  const returnInput = document.getElementById("rental-return-date");
  const today = getTodayInputValue();

  if (!startInput || !returnInput) return;

  startInput.min = today;
  startInput.value = today;
  returnInput.min = addDays(today, 1);
  returnInput.value = addDays(today, 3);

  startInput.addEventListener("change", () => {
    const minReturnDate = addDays(startInput.value, 1);
    returnInput.min = minReturnDate;

    if (!returnInput.value || returnInput.value <= startInput.value) {
      returnInput.value = addDays(startInput.value, 3);
    }

    updateOrderSummary();
  });

  returnInput.addEventListener("change", updateOrderSummary);
}

function buildOrderPayload() {
  const products = rentNowState.products;
  const startDate = document.getElementById("rental-start-date")?.value;
  const returnDate = document.getElementById("rental-return-date")?.value;
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "bank_transfer";

  if (!products || products.length === 0) {
    throw new Error("Không tìm thấy sản phẩm để đặt thuê.");
  }

  if (!startDate || !returnDate) {
    throw new Error("Vui lòng chọn ngày nhận và ngày trả sản phẩm.");
  }

  if (returnDate <= startDate) {
    throw new Error("Ngày trả sản phẩm phải sau ngày nhận.");
  }

  const items = products.map(item => ({
    product: item._id,
    quantity: Number(item.quantity) || 1,
    rentalPrice: Number(item.rentalPrice || 0),
    deposit: Number(item.deposit || 0)
  }));

  const totalAmount = items.reduce((sum, item) => sum + (item.rentalPrice + item.deposit) * item.quantity, 0);

  return {
    startDate,
    returnDate,
    paymentMethod,
    items,
    totalAmount
  };
}

async function submitRentalOrder(event) {
  event.preventDefault();

  const button = document.getElementById("confirm-rental-button");

  try {
    setFeedback("");
    if (button) {
      button.disabled = true;
      button.textContent = "Đang tạo đơn...";
    }

    // Collect name, phone, and split address fields
    const fullName = document.getElementById("customer-name")?.value.trim();
    const phone = document.getElementById("customer-phone")?.value.trim();
    const street = document.getElementById("customer-street")?.value.trim();
    const ward = document.getElementById("customer-ward")?.value.trim();
    const district = document.getElementById("customer-district")?.value.trim();
    const province = document.getElementById("customer-province")?.value.trim();

    const address = [street, ward, district, province].filter(Boolean).join(", ");

    // Update user profile details in the database
    const profileResponse = await fetch("/api/users/profile/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ fullName, phone, address })
    });
    const profileResult = await profileResponse.json();
    if (!profileResponse.ok || !profileResult.success) {
      throw new Error(profileResult.message || "Không thể cập nhật thông tin nhận hàng.");
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(buildOrderPayload())
    });
    const data = await parseApiResponse(response, "Không thể tạo đơn thuê");
    const order = data.order || data;

    // Clear cart if successfully checked out from cart
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "cart") {
      localStorage.removeItem("rosette_cart");
      document.dispatchEvent(new CustomEvent("rosette:cart-updated"));
    }

    setFeedback(`Đặt thuê thành công. Mã đơn: #${String(order._id).slice(-6).toUpperCase()}`, "success");
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Xác nhận đặt lịch";
    }
  }
}

async function loadRentNowPage() {
  const message = document.getElementById("rent-now-message");
  const form = document.getElementById("rent-now-form");

  try {
    bindDateInputs();
    bindPaymentOptions();

    const params = new URLSearchParams(window.location.search);
    const isFromCart = params.get("from") === "cart";

    if (isFromCart) {
      const cart = JSON.parse(localStorage.getItem("rosette_cart") || "[]");
      if (!cart || cart.length === 0) {
        throw new Error("Giỏ hàng của bạn đang trống.");
      }
      rentNowState.products = cart;
      renderProductsList();
      updateOrderSummary();
      if (form) form.hidden = false;
    } else {
      const productId = await resolveProductId();
      const product = await fetchProduct(productId);
      const size = params.get("size") || product.sizes?.[0] || "Đang cập nhật";

      rentNowState.products = [{
        _id: product._id,
        name: product.name,
        rentalPrice: product.rentalPrice,
        deposit: product.deposit,
        image: getProductImage(product),
        size: size,
        color: product.color || "Đang cập nhật",
        category: getCategoryName(product),
        quantity: 1,
        status: product.status
      }];

      renderProductsList();
      updateOrderSummary();
      if (form) form.hidden = false;

      if (product.status !== "available") {
        const button = document.getElementById("confirm-rental-button");
        if (button) button.disabled = true;
        setFeedback("Sản phẩm này hiện chưa sẵn sàng để thuê.", "error");
      }
    }

    try {
      const user = await fetchCurrentUser();
      renderUser(user);
      if (message) message.hidden = true;
    } catch (authError) {
      const button = document.getElementById("confirm-rental-button");
      if (button) button.disabled = true;
      if (message) {
        message.innerHTML = `
          ${escapeHtml(authError.message)}
          <br>
          <a href="/views/login.html">Đăng nhập để tiếp tục</a>
        `;
      }
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  document.getElementById("rent-now-form")?.addEventListener("submit", submitRentalOrder);
  loadRentNowPage();
});
