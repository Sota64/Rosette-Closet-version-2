const rentNowState = {
  products: [],
  rentalDays: 3,
  addressData: []
};

const ADDRESS_API_URL = "https://provinces.open-api.vn/api/?depth=3";
const ADDRESS_CACHE_KEY = "rosette_vietnam_address_data";
const ADDRESS_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_ADDRESS_DATA = [
  {
    name: "Thành phố Hà Nội",
    districts: [
      { name: "Quận Ba Đình", wards: [{ name: "Phường Phúc Xá" }, { name: "Phường Trúc Bạch" }, { name: "Phường Vĩnh Phúc" }, { name: "Phường Cống Vị" }, { name: "Phường Liễu Giai" }, { name: "Phường Nguyễn Trung Trực" }, { name: "Phường Quán Thánh" }, { name: "Phường Ngọc Hà" }, { name: "Phường Điện Biên" }, { name: "Phường Đội Cấn" }, { name: "Phường Ngọc Khánh" }, { name: "Phường Kim Mã" }, { name: "Phường Giảng Võ" }, { name: "Phường Thành Công" }] },
      { name: "Quận Hoàn Kiếm", wards: [{ name: "Phường Phúc Tân" }, { name: "Phường Đồng Xuân" }, { name: "Phường Hàng Mã" }, { name: "Phường Hàng Buồm" }, { name: "Phường Hàng Đào" }, { name: "Phường Hàng Bạc" }, { name: "Phường Tràng Tiền" }, { name: "Phường Hàng Bài" }] },
      { name: "Quận Cầu Giấy", wards: [{ name: "Phường Nghĩa Đô" }, { name: "Phường Nghĩa Tân" }, { name: "Phường Mai Dịch" }, { name: "Phường Dịch Vọng" }, { name: "Phường Dịch Vọng Hậu" }, { name: "Phường Quan Hoa" }, { name: "Phường Yên Hoà" }, { name: "Phường Trung Hoà" }] },
      { name: "Quận Đống Đa", wards: [{ name: "Phường Cát Linh" }, { name: "Phường Văn Miếu" }, { name: "Phường Quốc Tử Giám" }, { name: "Phường Láng Thượng" }, { name: "Phường Ô Chợ Dừa" }, { name: "Phường Trung Liệt" }, { name: "Phường Khâm Thiên" }] },
      { name: "Quận Hai Bà Trưng", wards: [{ name: "Phường Nguyễn Du" }, { name: "Phường Bạch Đằng" }, { name: "Phường Phạm Đình Hổ" }, { name: "Phường Lê Đại Hành" }, { name: "Phường Bách Khoa" }, { name: "Phường Minh Khai" }] },
      { name: "Quận Thanh Xuân", wards: [{ name: "Phường Nhân Chính" }, { name: "Phường Thượng Đình" }, { name: "Phường Khương Trung" }, { name: "Phường Khương Mai" }, { name: "Phường Thanh Xuân Trung" }, { name: "Phường Thanh Xuân Bắc" }] },
      { name: "Quận Tây Hồ", wards: [{ name: "Phường Phú Thượng" }, { name: "Phường Nhật Tân" }, { name: "Phường Tứ Liên" }, { name: "Phường Quảng An" }, { name: "Phường Xuân La" }, { name: "Phường Bưởi" }] },
      { name: "Quận Hà Đông", wards: [{ name: "Phường Nguyễn Trãi" }, { name: "Phường Mộ Lao" }, { name: "Phường Văn Quán" }, { name: "Phường Phúc La" }, { name: "Phường Yết Kiêu" }, { name: "Phường La Khê" }] },
      { name: "Quận Long Biên", wards: [{ name: "Phường Ngọc Lâm" }, { name: "Phường Bồ Đề" }, { name: "Phường Gia Thuỵ" }, { name: "Phường Đức Giang" }, { name: "Phường Việt Hưng" }, { name: "Phường Long Biên" }] },
      { name: "Quận Nam Từ Liêm", wards: [{ name: "Phường Cầu Diễn" }, { name: "Phường Mỹ Đình 1" }, { name: "Phường Mỹ Đình 2" }, { name: "Phường Mễ Trì" }, { name: "Phường Phú Đô" }, { name: "Phường Tây Mỗ" }] },
      { name: "Quận Bắc Từ Liêm", wards: [{ name: "Phường Thượng Cát" }, { name: "Phường Liên Mạc" }, { name: "Phường Đông Ngạc" }, { name: "Phường Đức Thắng" }, { name: "Phường Xuân Đỉnh" }, { name: "Phường Cổ Nhuế 1" }] },
      { name: "Quận Hoàng Mai", wards: [{ name: "Phường Thanh Trì" }, { name: "Phường Vĩnh Hưng" }, { name: "Phường Định Công" }, { name: "Phường Đại Kim" }, { name: "Phường Hoàng Liệt" }, { name: "Phường Tân Mai" }] }
    ]
  },
  {
    name: "Thành phố Hồ Chí Minh",
    districts: [
      { name: "Quận 1", wards: [{ name: "Phường Bến Nghé" }, { name: "Phường Bến Thành" }, { name: "Phường Cầu Kho" }, { name: "Phường Cầu Ông Lãnh" }, { name: "Phường Đa Kao" }] },
      { name: "Quận 3", wards: [{ name: "Phường 1" }, { name: "Phường 2" }, { name: "Phường 3" }, { name: "Phường 4" }, { name: "Phường 5" }] },
      { name: "Quận 7", wards: [{ name: "Phường Tân Thuận Đông" }, { name: "Phường Tân Thuận Tây" }, { name: "Phường Tân Kiểng" }, { name: "Phường Tân Hưng" }, { name: "Phường Phú Mỹ" }] },
      { name: "Quận Bình Thạnh", wards: [{ name: "Phường 1" }, { name: "Phường 2" }, { name: "Phường 3" }, { name: "Phường 5" }, { name: "Phường 7" }] },
      { name: "Thành phố Thủ Đức", wards: [{ name: "Phường Linh Trung" }, { name: "Phường Linh Tây" }, { name: "Phường Hiệp Bình Chánh" }, { name: "Phường Thảo Điền" }, { name: "Phường An Phú" }] }
    ]
  },
  {
    name: "Thành phố Đà Nẵng",
    districts: [
      { name: "Quận Hải Châu", wards: [{ name: "Phường Hải Châu I" }, { name: "Phường Hải Châu II" }, { name: "Phường Thạch Thang" }, { name: "Phường Thanh Bình" }] },
      { name: "Quận Sơn Trà", wards: [{ name: "Phường An Hải Bắc" }, { name: "Phường An Hải Tây" }, { name: "Phường Phước Mỹ" }, { name: "Phường Thọ Quang" }] },
      { name: "Quận Ngũ Hành Sơn", wards: [{ name: "Phường Mỹ An" }, { name: "Phường Khuê Mỹ" }, { name: "Phường Hoà Hải" }, { name: "Phường Hoà Quý" }] }
    ]
  }
];

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

function normalizeAddressName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getCachedAddressData() {
  try {
    const cached = JSON.parse(localStorage.getItem(ADDRESS_CACHE_KEY) || "null");
    if (!cached?.data || !cached?.savedAt) return null;
    if (Date.now() - cached.savedAt > ADDRESS_CACHE_MAX_AGE) return null;
    return cached.data;
  } catch (error) {
    return null;
  }
}

function saveCachedAddressData(data) {
  try {
    localStorage.setItem(ADDRESS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data
    }));
  } catch (error) {
    console.warn("Không thể lưu cache địa chỉ:", error);
  }
}

async function loadVietnamAddressData() {
  const cached = getCachedAddressData();
  if (cached) {
    rentNowState.addressData = cached;
    return cached;
  }

  try {
    const response = await fetch(ADDRESS_API_URL);
    if (!response.ok) {
      throw new Error("Không thể tải danh sách tỉnh thành");
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Dữ liệu tỉnh thành không hợp lệ");
    }

    rentNowState.addressData = data;
    saveCachedAddressData(data);
    return data;
  } catch (error) {
    console.warn("Đang dùng dữ liệu địa chỉ dự phòng:", error);
    rentNowState.addressData = FALLBACK_ADDRESS_DATA;
    return FALLBACK_ADDRESS_DATA;
  }
}

function setSelectOptions(select, options, placeholder, selectedName = "") {
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = item.name;
    select.appendChild(option);
  });

  if (selectedName) {
    const selected = Array.from(select.options).find((option) => (
      normalizeAddressName(option.value) === normalizeAddressName(selectedName)
    ));

    if (selected) {
      select.value = selected.value;
    } else {
      const customOption = document.createElement("option");
      customOption.value = selectedName;
      customOption.textContent = selectedName;
      select.appendChild(customOption);
      select.value = selectedName;
    }
  }
}

function findProvince(name) {
  const normalized = normalizeAddressName(name);
  return rentNowState.addressData.find((province) => normalizeAddressName(province.name) === normalized);
}

function findDistrict(province, name) {
  const normalized = normalizeAddressName(name);
  return province?.districts?.find((district) => normalizeAddressName(district.name) === normalized);
}

function populateProvinceSelect(selectedProvince = "") {
  const provinceSelect = document.getElementById("customer-province");
  setSelectOptions(provinceSelect, rentNowState.addressData, "Chọn tỉnh / thành phố", selectedProvince);
}

function populateDistrictSelect(provinceName, selectedDistrict = "") {
  const districtSelect = document.getElementById("customer-district");
  const province = findProvince(provinceName);
  const districts = province?.districts || [];

  setSelectOptions(districtSelect, districts, "Chọn quận / huyện", selectedDistrict);
  if (districtSelect) {
    districtSelect.disabled = districts.length === 0;
  }
}

function populateWardSelect(provinceName, districtName, selectedWard = "") {
  const wardSelect = document.getElementById("customer-ward");
  const province = findProvince(provinceName);
  const district = findDistrict(province, districtName);
  const wards = district?.wards || [];

  setSelectOptions(wardSelect, wards, "Chọn phường / xã", selectedWard);
  if (wardSelect) {
    wardSelect.disabled = wards.length === 0;
  }
}

function setSelectedAddress(address) {
  populateProvinceSelect(address.city);
  populateDistrictSelect(document.getElementById("customer-province")?.value, address.district);
  populateWardSelect(
    document.getElementById("customer-province")?.value,
    document.getElementById("customer-district")?.value,
    address.ward
  );
  setValue("customer-street", address.street);
}

async function initAddressSelectors() {
  await loadVietnamAddressData();
  populateProvinceSelect();

  const provinceSelect = document.getElementById("customer-province");
  const districtSelect = document.getElementById("customer-district");
  const wardSelect = document.getElementById("customer-ward");

  provinceSelect?.addEventListener("change", () => {
    populateDistrictSelect(provinceSelect.value);
    populateWardSelect(provinceSelect.value, "");
  });

  districtSelect?.addEventListener("change", () => {
    populateWardSelect(provinceSelect?.value, districtSelect.value);
  });

  if (wardSelect) {
    wardSelect.disabled = true;
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
  setSelectedAddress(addr);
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

    if (!province || !district || !ward || !street) {
      throw new Error("Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện, phường/xã và nhập địa chỉ chi tiết.");
    }

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

    setFeedback("Đặt thuê thành công! Đang chuyển hướng...", "success");
    setTimeout(() => {
      window.location.href = `/views/user/checkout-success.html?orderId=${order._id}`;
    }, 1000);
  } catch (error) {
    setFeedback(error.message, "error");
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
    await initAddressSelectors();

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
