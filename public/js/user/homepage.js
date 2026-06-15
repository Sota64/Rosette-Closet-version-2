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

function getProductDetailUrl(product) {
  return `/views/user/productDetails.html?id=${encodeURIComponent(product._id)}`;
}

function getProductSizes(product) {
  return product?.sizes?.length ? product.sizes.join(", ") : "Đang cập nhật";
}

function isNewProduct(product) {
  if (!product?.createdAt) return false;

  const createdAt = new Date(product.createdAt).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  return Date.now() - createdAt <= fourteenDays;
}

async function fetchHomepageData() {
  const response = await fetch("/api/homepage", {
    credentials: "include"
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể tải dữ liệu homepage");
  }

  return result.data;
}

function renderHero(hero) {
  const heroImage = document.getElementById("homepage-hero-image");
  if (!heroImage || !hero?.image) return;

  heroImage.src = hero.image;
  heroImage.alt = hero.product?.name || "Luxury Dress";
}

function renderCategories(categories = []) {
  const grid = document.getElementById("homepage-category-grid");
  if (!grid) return;

  if (!categories.length) {
    grid.innerHTML = '<p class="homepage-empty">Chưa có danh mục để hiển thị.</p>';
    return;
  }

  grid.innerHTML = categories.map((category) => {
    const categoryParam = encodeURIComponent(category.name);

    return `
      <a href="/views/user/collections.html?category=${categoryParam}" class="category-card">
        <img src="${escapeHtml(category.image)}" alt="${escapeHtml(category.name)}">
        <div class="category-overlay glass-card">
          <h3>${escapeHtml(category.name)}</h3>
          <span>${Number(category.productCount || 0)} sản phẩm</span>
        </div>
      </a>
    `;
  }).join("");
}

function renderProducts(products = []) {
  const grid = document.getElementById("homepage-product-grid");
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<p class="homepage-empty">Chưa có sản phẩm nổi bật.</p>';
    return;
  }

  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image">
        <a href="${getProductDetailUrl(product)}">
          <img src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}">
        </a>
        ${isNewProduct(product) ? '<span class="product-badge">Mới</span>' : ""}
      </div>

      <div class="product-content">
        <div class="product-top">
          <h3><a href="${getProductDetailUrl(product)}">${escapeHtml(product.name)}</a></h3>
          <span class="price">${formatCurrency(product.rentalPrice)}</span>
        </div>

        <p>Size: ${escapeHtml(getProductSizes(product))} | Thuê 3 ngày</p>

        <div class="product-actions">
          <a class="btn btn-gold full-width" href="${getProductDetailUrl(product)}">Thuê ngay</a>
          <a class="preview-btn" href="${getProductDetailUrl(product)}" aria-label="Xem ${escapeHtml(product.name)}">
            <span class="material-symbols-outlined">visibility</span>
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

async function loadHomepageData() {
  try {
    const data = await fetchHomepageData();

    renderHero(data.hero);
    renderCategories(data.featuredCategories);
    renderProducts(data.featuredProducts);
  } catch (error) {
    const categoryGrid = document.getElementById("homepage-category-grid");
    const productGrid = document.getElementById("homepage-product-grid");

    if (categoryGrid) {
      categoryGrid.innerHTML = `<p class="homepage-empty">${escapeHtml(error.message)}</p>`;
    }

    if (productGrid) {
      productGrid.innerHTML = `<p class="homepage-empty">${escapeHtml(error.message)}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);
  loadHomepageData();
});
