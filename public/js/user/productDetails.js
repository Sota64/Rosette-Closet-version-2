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

function getProductImage(product) {
  return product?.images?.[0] || "/public/images/img1.png";
}

function getProductImages(product) {
  const images = product?.images?.length ? product.images : [getProductImage(product)];
  return [...new Set(images.filter(Boolean))];
}

function getCategoryName(product) {
  return product?.category?.name || "Bộ sưu tập";
}

function getProductDetailUrl(productId) {
  return `/views/user/productDetails.html?id=${encodeURIComponent(productId)}`;
}

function getStatusLabel(status) {
  const labels = {
    available: "Sẵn sàng",
    rented: "Đang cho thuê",
    maintenance: "Đang vệ sinh",
    outofstock: "Hết hàng"
  };

  return labels[status] || "Đang cập nhật";
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
  const data = await parseApiResponse(response, "Không thể tìm sản phẩm để hiển thị");
  const firstProduct = data.products?.[0];

  if (!firstProduct?._id) {
    throw new Error("Chưa có sản phẩm để hiển thị.");
  }

  return firstProduct._id;
}

async function fetchProductDetail(productId) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}/detail`, {
    credentials: "include"
  });

  return parseApiResponse(response, "Không thể tải chi tiết sản phẩm");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderGallery(product) {
  const mainImage = document.getElementById("product-main-image");
  const thumbnailGrid = document.getElementById("product-thumbnail-grid");
  const images = getProductImages(product);

  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = product.name || "Ảnh sản phẩm";
  }

  if (!thumbnailGrid) return;

  thumbnailGrid.innerHTML = images.map((image, index) => `
    <button class="thumbnail ${index === 0 ? "active" : ""}" type="button" data-image="${escapeHtml(image)}" aria-label="Xem ảnh ${index + 1}">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} ${index + 1}" />
    </button>
  `).join("");

  thumbnailGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-image]");
    if (!button || !mainImage) return;

    mainImage.src = button.dataset.image;
    thumbnailGrid.querySelectorAll(".thumbnail").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
  });
}

function renderSizes(product) {
  const sizes = product.sizes?.length ? product.sizes : ["Đang cập nhật"];
  const sizeOptions = document.getElementById("product-size-options");

  if (!sizeOptions) return;

  sizeOptions.innerHTML = sizes.map((size, index) => `
    <button class="${index === 0 ? "selected" : ""}" type="button">${escapeHtml(size)}</button>
  `).join("");

  sizeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    sizeOptions.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("selected", item === button);
    });
  });
}

function renderSimilarProducts(products = []) {
  const section = document.getElementById("similar-section");
  const grid = document.getElementById("similar-products-grid");

  if (!section || !grid) return;

  section.hidden = false;

  if (!products.length) {
    grid.innerHTML = '<p class="detail-message">Chưa có sản phẩm tương tự.</p>';
    return;
  }

  grid.innerHTML = products.map((product) => `
    <article class="similar-card">
      <a class="similar-image" href="${getProductDetailUrl(product._id)}">
        <img src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}" />
        <span>Xem nhanh</span>
      </a>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${formatCurrency(product.rentalPrice)}</p>
    </article>
  `).join("");
}

function showToast(message) {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
    background: rgba(31, 27, 19, 0.95);
    color: #ffffff;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: 'Be Vietnam Pro', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
    border-left: 4px solid #d4af37;
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: #d4af37;">check_circle</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    toast.style.transform = "translateY(-20px)";
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

function addToCart(product) {
  const selectedSizeBtn = document.querySelector("#product-size-options button.selected");
  if (!selectedSizeBtn) {
    showToast("Vui lòng chọn kích cỡ trang phục!");
    return;
  }
  const size = selectedSizeBtn.textContent;

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem("rosette_cart") || "[]");
  } catch (error) {
    cart = [];
  }

  const existingIndex = cart.findIndex(item => item._id === product._id && item.size === size);

  if (existingIndex > -1) {
    cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
  } else {
    cart.push({
      _id: product._id,
      name: product.name,
      rentalPrice: product.rentalPrice,
      deposit: product.deposit,
      image: getProductImage(product),
      size: size,
      color: product.color || "Mặc định",
      category: getCategoryName(product),
      quantity: 1
    });
  }

  localStorage.setItem("rosette_cart", JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent("rosette:cart-updated"));
  showToast(`Đã thêm ${product.name} (Size ${size}) vào giỏ hàng!`);
}

function renderProductDetail(data) {
  const product = data.product;
  const reviewSummary = data.reviewSummary || {};
  const categoryName = getCategoryName(product);
  const categoryHref = `/views/user/collections.html?category=${encodeURIComponent(categoryName)}`;
  const statusLabel = getStatusLabel(product.status);

  document.title = `${product.name} | RosetteCloset`;
  setText("product-breadcrumb-name", product.name);
  setText("product-name", product.name);
  setText("product-price", formatCurrency(product.rentalPrice));
  setText("product-description", product.description || "Sản phẩm hiện chưa có mô tả chi tiết.");
  setText("product-code", product.code || product._id);
  setText("product-category", categoryName);
  setText("product-color", product.color || "Đang cập nhật");
  setText("product-deposit", formatCurrency(product.deposit));
  setText("product-status", statusLabel);
  setText("product-status-note", `${statusLabel}. Sản phẩm được cập nhật trạng thái trực tiếp từ kho hàng.`);
  setText("product-size-note", product.sizes?.length ? product.sizes.join(", ") : "Kích cỡ đang được cập nhật.");
  setText("product-style-note", `Thiết kế ${product.name} phù hợp khi phối cùng phụ kiện tối giản để làm nổi bật màu ${product.color || "chủ đạo"} của sản phẩm.`);
  setText("product-review-tab", `Đánh giá khách hàng (${reviewSummary.totalReviews || 0})`);

  const categoryLink = document.getElementById("product-category-link");
  if (categoryLink) {
    categoryLink.href = categoryHref;
    categoryLink.textContent = categoryName;
  }

  const rentNowLink = document.getElementById("rent-now-link");
  if (rentNowLink) {
    rentNowLink.href = `/views/user/rentNow.html?id=${encodeURIComponent(product._id)}`;
  }

  const cartBtn = document.querySelector(".cart-button");
  if (cartBtn) {
    const newCartBtn = cartBtn.cloneNode(true);
    cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
    newCartBtn.addEventListener("click", () => addToCart(product));
  }

  renderGallery(product);
  renderSizes(product);
  renderSimilarProducts(data.similarProducts || []);

  document.getElementById("product-detail-message").hidden = true;
  document.getElementById("product-detail-content").hidden = false;
  document.getElementById("product-extra-content").hidden = false;
}

async function loadProductDetail() {
  const message = document.getElementById("product-detail-message");

  try {
    const productId = await resolveProductId();
    const data = await fetchProductDetail(productId);

    renderProductDetail(data);
  } catch (error) {
    if (message) {
      message.textContent = error.message;
      message.hidden = false;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  loadProductDetail();
});
