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

const ACCOUNT_ADDRESS_API_URL = "https://provinces.open-api.vn/api/?depth=3";
const ACCOUNT_ADDRESS_CACHE_KEY = "rosette_vietnam_address_data";
const ACCOUNT_ADDRESS_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCOUNT_FALLBACK_ADDRESS_DATA = [
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

let accountAddressData = [];

function showToast(message, type = "success") {
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
  const accent = type === "error" ? "#ba1a1a" : "#1b806a";
  toast.style.cssText = `
    min-width: 260px;
    max-width: 360px;
    border-left: 4px solid ${accent};
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

function setAccountMessage(message, isError = false) {
  const element = document.getElementById("account-message");
  if (element) {
    element.textContent = "";
    element.hidden = true;
  }

  if (message) {
    showToast(message, isError ? "error" : "success");
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
    const cached = JSON.parse(localStorage.getItem(ACCOUNT_ADDRESS_CACHE_KEY) || "null");
    if (!cached?.data || !cached?.savedAt) return null;
    if (Date.now() - cached.savedAt > ACCOUNT_ADDRESS_CACHE_MAX_AGE) return null;
    return cached.data;
  } catch (error) {
    return null;
  }
}

function saveCachedAddressData(data) {
  try {
    localStorage.setItem(ACCOUNT_ADDRESS_CACHE_KEY, JSON.stringify({
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
    accountAddressData = cached;
    return cached;
  }

  try {
    const response = await fetch(ACCOUNT_ADDRESS_API_URL);
    if (!response.ok) throw new Error("Không thể tải danh sách tỉnh thành");

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Dữ liệu tỉnh thành không hợp lệ");
    }

    accountAddressData = data;
    saveCachedAddressData(data);
    return data;
  } catch (error) {
    console.warn("Đang dùng dữ liệu địa chỉ dự phòng:", error);
    accountAddressData = ACCOUNT_FALLBACK_ADDRESS_DATA;
    return ACCOUNT_FALLBACK_ADDRESS_DATA;
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
  return accountAddressData.find((province) => normalizeAddressName(province.name) === normalized);
}

function findDistrict(province, name) {
  const normalized = normalizeAddressName(name);
  return province?.districts?.find((district) => normalizeAddressName(district.name) === normalized);
}

function populateProvinceSelect(selectedProvince = "") {
  setSelectOptions(
    document.getElementById("account-province"),
    accountAddressData,
    "Chọn tỉnh / thành phố",
    selectedProvince
  );
}

function populateDistrictSelect(provinceName, selectedDistrict = "") {
  const districtSelect = document.getElementById("account-district");
  const province = findProvince(provinceName);
  const districts = province?.districts || [];

  setSelectOptions(districtSelect, districts, "Chọn quận / huyện", selectedDistrict);
  if (districtSelect) {
    districtSelect.disabled = districts.length === 0;
  }
}

function populateWardSelect(provinceName, districtName, selectedWard = "") {
  const wardSelect = document.getElementById("account-ward");
  const province = findProvince(provinceName);
  const district = findDistrict(province, districtName);
  const wards = district?.wards || [];

  setSelectOptions(wardSelect, wards, "Chọn phường / xã", selectedWard);
  if (wardSelect) {
    wardSelect.disabled = wards.length === 0;
  }
}

function parseAddress(addressString = "") {
  if (!addressString) {
    return { street: "", ward: "", district: "", city: "" };
  }

  const parts = addressString.split(",").map((part) => part.trim()).filter(Boolean);
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

function setSelectedAddress(address) {
  populateProvinceSelect(address.city);
  populateDistrictSelect(document.getElementById("account-province")?.value, address.district);
  populateWardSelect(
    document.getElementById("account-province")?.value,
    document.getElementById("account-district")?.value,
    address.ward
  );

  const streetInput = document.getElementById("account-street");
  if (streetInput) streetInput.value = address.street || "";
}

async function initAddressSelectors() {
  await loadVietnamAddressData();
  populateProvinceSelect();

  const provinceSelect = document.getElementById("account-province");
  const districtSelect = document.getElementById("account-district");
  const wardSelect = document.getElementById("account-ward");

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

async function loadAccount() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  const result = await response.json();

  if (!response.ok || !result.success || !result.data?.user) {
    window.location.href = "/views/login.html";
    return;
  }

  const user = result.data.user;
  document.getElementById("account-full-name").value = user.fullName || "";
  document.getElementById("account-email").value = user.email || "";
  document.getElementById("account-phone").value = user.phone || "";
  setSelectedAddress(parseAddress(user.address));
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  setAccountMessage("Đang lưu...");

  const formData = new FormData(event.currentTarget);
  const street = document.getElementById("account-street")?.value.trim() || "";
  const ward = document.getElementById("account-ward")?.value.trim() || "";
  const district = document.getElementById("account-district")?.value.trim() || "";
  const province = document.getElementById("account-province")?.value.trim() || "";

  if (!street || !ward || !district || !province) {
    setAccountMessage("Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện, phường/xã và nhập địa chỉ chi tiết.", true);
    return;
  }

  const payload = {
    fullName: formData.get("fullName")?.trim() || "",
    phone: formData.get("phone")?.trim() || "",
    address: [street, ward, district, province].filter(Boolean).join(", ")
  };

  try {
    const response = await fetch("/api/users/profile/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể cập nhật thông tin.");
    }

    setAccountMessage("Đã lưu thông tin tài khoản.");
    window.initNavbarAuth?.();
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  document.getElementById("account-form")?.addEventListener("submit", handleAccountSubmit);
  await initAddressSelectors();
  loadAccount();
});
