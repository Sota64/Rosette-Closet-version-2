const collectionsState = {
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
  return product.category?.name || "Bộ sưu tập";
}

function buildProductsUrl() {
  const params = new URLSearchParams({
    page: collectionsState.page,
    limit: collectionsState.limit,
    sort: collectionsState.sort
  });

  if (collectionsState.status !== "all") {
    params.set("status", collectionsState.status);
  }

  return `/api/products?${params.toString()}`;
}

async function parseApiResponse(response) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể tải bộ sưu tập");
  }

  return result.data;
}

function renderProducts(products = []) {
  const grid = document.getElementById("collections-grid");
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<p class="collections-empty">Chưa có sản phẩm phù hợp.</p>';
    return;
  }

  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image">
        <img src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}" />
        <button type="button" aria-label="Thêm ${escapeHtml(product.name)} vào yêu thích">
          <span class="material-symbols-outlined">favorite</span>
        </button>
      </div>
      <div class="product-info">
        <p>${escapeHtml(getCategoryName(product))}</p>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="product-bottom">
          <span>${formatCurrency(product.rentalPrice)}</span>
          <a href="#">
            <button type="button">Thuê ngay</button>
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderPagination() {
  const pages = document.getElementById("collections-pages");
  const prev = document.getElementById("collections-prev");
  const next = document.getElementById("collections-next");
  if (!pages || !prev || !next) return;

  const totalPages = Math.max(collectionsState.totalPages, 1);
  const from = Math.max(1, collectionsState.page - 1);
  const to = Math.min(totalPages, collectionsState.page + 1);
  const pageButtons = [];

  for (let page = from; page <= to; page += 1) {
    pageButtons.push(`
      <button class="${page === collectionsState.page ? "current" : ""}" type="button" data-page="${page}">${page}</button>
    `);
  }

  pages.innerHTML = pageButtons.join("");
  prev.disabled = collectionsState.page <= 1;
  next.disabled = collectionsState.page >= totalPages;
}

async function loadProducts() {
  const grid = document.getElementById("collections-grid");
  if (grid) {
    grid.innerHTML = '<p class="collections-empty">Đang tải bộ sưu tập...</p>';
  }

  try {
    const response = await fetch(buildProductsUrl(), {
      credentials: "include"
    });
    const data = await parseApiResponse(response);
    const products = data.products || [];

    collectionsState.totalPages = data.pagination?.totalPages || 1;
    collectionsState.page = data.pagination?.page || collectionsState.page;

    renderProducts(products);
    renderPagination();
  } catch (error) {
    if (grid) {
      grid.innerHTML = `<p class="collections-empty">${escapeHtml(error.message)}</p>`;
    }
  }
}

function bindCollectionsControls() {
  document.querySelectorAll("[data-filter-status]").forEach((button) => {
    button.addEventListener("click", () => {
      collectionsState.status = button.dataset.filterStatus;
      collectionsState.page = 1;
      document.querySelectorAll("[data-filter-status]").forEach((item) => {
        item.classList.toggle("current", item === button);
      });
      loadProducts();
    });
  });

  document.getElementById("collections-sort")?.addEventListener("change", (event) => {
    collectionsState.sort = event.target.value;
    collectionsState.page = 1;
    loadProducts();
  });

  document.getElementById("collections-pages")?.addEventListener("click", (event) => {
    const page = Number(event.target.dataset.page);
    if (!page) return;

    collectionsState.page = page;
    loadProducts();
  });

  document.getElementById("collections-prev")?.addEventListener("click", () => {
    if (collectionsState.page <= 1) return;
    collectionsState.page -= 1;
    loadProducts();
  });

  document.getElementById("collections-next")?.addEventListener("click", () => {
    if (collectionsState.page >= collectionsState.totalPages) return;
    collectionsState.page += 1;
    loadProducts();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);
  bindCollectionsControls();
  loadProducts();
});
