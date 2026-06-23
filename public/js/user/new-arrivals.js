const newArrivalsState = {
  page: 1,
  limit: 8,
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
    page: newArrivalsState.page,
    limit: newArrivalsState.limit,
    sort: newArrivalsState.sort
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
          <a href="${getRentNowUrl(product)}">
            <button type="button">Thuê ngay</button>
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderPagination() {
  const pages = document.getElementById("new-arrivals-pages");
  const prev = document.getElementById("new-arrivals-prev");
  const next = document.getElementById("new-arrivals-next");
  if (!pages || !prev || !next) return;

  const totalPages = Math.max(newArrivalsState.totalPages, 1);
  const from = Math.max(1, newArrivalsState.page - 1);
  const to = Math.min(totalPages, newArrivalsState.page + 1);
  const pageButtons = [];

  for (let page = from; page <= to; page += 1) {
    pageButtons.push(`
      <button class="${page === newArrivalsState.page ? "current" : ""}" type="button" data-page="${page}">${page}</button>
    `);
  }

  pages.innerHTML = pageButtons.join("");
  prev.disabled = newArrivalsState.page <= 1;
  next.disabled = newArrivalsState.page >= totalPages;
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

    newArrivalsState.totalPages = data.pagination?.totalPages || 1;
    newArrivalsState.page = data.pagination?.page || newArrivalsState.page;

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
    newArrivalsState.sort = event.target.value;
    newArrivalsState.page = 1;
    loadProducts();
  });

  document.getElementById("new-arrivals-pages")?.addEventListener("click", (event) => {
    const page = Number(event.target.dataset.page);
    if (!page) return;

    newArrivalsState.page = page;
    loadProducts();
  });

  document.getElementById("new-arrivals-prev")?.addEventListener("click", () => {
    if (newArrivalsState.page <= 1) return;
    newArrivalsState.page -= 1;
    loadProducts();
  });

  document.getElementById("new-arrivals-next")?.addEventListener("click", () => {
    if (newArrivalsState.page >= newArrivalsState.totalPages) return;
    newArrivalsState.page += 1;
    loadProducts();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);
  bindNewArrivalsControls();
  loadProducts();
});
