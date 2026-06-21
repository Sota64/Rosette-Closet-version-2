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
