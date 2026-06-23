const newArrivalsState = {
  page: 1,
  limit: 10,
  totalPages: 1,
  status: "all",
  sort: "-createdAt"
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

function getProductImage(product) {
  return product.images?.[0] || "/public/images/img1.png";
}

function getCategoryName(product) {
  return product.category?.name || "Sản phẩm mới";
}

function getProductDetailUrl(product) {
  return `/views/user/productDetails.html?id=${encodeURIComponent(product._id)}`;
}

function getRentNowUrl(product) {
  return `/views/user/rentNow.html?id=${encodeURIComponent(product._id)}`;
}

function buildProductsUrl() {
  const params = new URLSearchParams({
    page: 1,
    limit: newArrivalsState.limit,
    sort: "-createdAt"
  });

  if (newArrivalsState.status !== "all") {
    params.set("status", newArrivalsState.status);
  }

  return `/api/products?${params.toString()}`;
}

async function parseApiResponse(response) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể tải sản phẩm mới");
  }

  return result.data;
}

function renderProducts(products = []) {
  const grid = document.getElementById("new-arrivals-grid");
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<p class="collections-empty">Chưa có sản phẩm mới phù hợp.</p>';
    return;
  }

  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image">
        <a href="${getProductDetailUrl(product)}">
          <img src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}" />
        </a>
        <span class="product-badge">Mới</span>
      </div>
      <div class="product-info">
        <p>${escapeHtml(getCategoryName(product))}</p>
        <h3><a href="${getProductDetailUrl(product)}">${escapeHtml(product.name)}</a></h3>
        <div class="product-bottom">
          <span>${formatCurrency(product.rentalPrice)}</span>
          <a class="rent-now-link" href="${getRentNowUrl(product)}">
            <button type="button">Thuê ngay</button>
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

function bindRentNowAuthGuard() {
  document.addEventListener("click", async (event) => {
    const link = event.target.closest(".rent-now-link");
    if (!link) return;

    event.preventDefault();
    if (!(await isUserAuthenticated())) {
      redirectToLogin(link.href);
      return;
    }

    window.location.href = link.href;
  });
}

function renderPagination() {
  const pagination = document.querySelector(".pagination");
  if (pagination) {
    pagination.hidden = true;
  }
}

async function loadProducts() {
  const grid = document.getElementById("new-arrivals-grid");
  if (grid) {
    grid.innerHTML = '<p class="collections-empty">Đang tải sản phẩm mới...</p>';
  }

  try {
    const response = await fetch(buildProductsUrl(), {
      credentials: "include"
    });
    const data = await parseApiResponse(response);
    const products = data.products || [];

    newArrivalsState.totalPages = 1;
    newArrivalsState.page = 1;

    renderProducts(products);
    renderPagination();
  } catch (error) {
    if (grid) {
      grid.innerHTML = `<p class="collections-empty">${escapeHtml(error.message)}</p>`;
    }
  }
}

function bindNewArrivalsControls() {
  document.querySelectorAll("[data-filter-status]").forEach((button) => {
    button.addEventListener("click", () => {
      newArrivalsState.status = button.dataset.filterStatus;
      newArrivalsState.page = 1;
      document.querySelectorAll("[data-filter-status]").forEach((item) => {
        item.classList.toggle("current", item === button);
      });
      loadProducts();
    });
  });

  document.getElementById("new-arrivals-sort")?.addEventListener("change", (event) => {
    event.target.value = "-createdAt";
    newArrivalsState.sort = "-createdAt";
    newArrivalsState.page = 1;
    loadProducts();
  });

  document.getElementById("new-arrivals-pages")?.addEventListener("click", (event) => {
    const page = Number(event.target.dataset.page);
    if (!page) return;

    newArrivalsState.page = 1;
  });

  document.getElementById("new-arrivals-prev")?.addEventListener("click", () => {
    newArrivalsState.page = 1;
  });

  document.getElementById("new-arrivals-next")?.addEventListener("click", () => {
    newArrivalsState.page = 1;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);
  bindNewArrivalsControls();
  bindRentNowAuthGuard();
  loadProducts();
});
