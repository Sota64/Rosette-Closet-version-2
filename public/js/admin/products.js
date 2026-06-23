const pageState = {
    products: [],
    categories: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    search: "",
    category: "all",
    status: "all",
    priceRange: "all"
};

async function loadLayout(placeholderId, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(placeholderId).outerHTML = html;
        return true;
    } catch (error) {
        console.error(`Không thể nạp layout từ ${url}:`, error);
        return false;
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
    return product.images?.[0] || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150";
}

function getCategoryName(product) {
    return product.category?.name || product.category || "Chưa phân loại";
}

function getStatusMeta(status) {
    const map = {
        available: { className: "badge-available", label: "Sẵn sàng" },
        rented: { className: "badge-rented", label: "Đang thuê" },
        maintenance: { className: "badge-cleaning", label: "Đang vệ sinh" },
        outofstock: { className: "badge-outofstock", label: "Hết hàng" }
    };

    return map[status] || map.available;
}

function getSizeAvailability(product) {
    if (Array.isArray(product.sizeAvailability) && product.sizeAvailability.length) {
        return product.sizeAvailability;
    }

    const rentedSizes = product.rentedSizes || [];
    return (product.sizes || []).map((size) => ({
        size,
        status: rentedSizes.includes(size) ? "rented" : "available"
    }));
}

function buildProductFormData(form) {
    const formData = new FormData(form);
    const productFormData = new FormData();
    const imageFile = form.querySelector('input[name="image"]')?.files[0];

    productFormData.append("name", formData.get("name")?.trim() || "");
    productFormData.append("description", formData.get("description")?.trim() || "");
    productFormData.append("category", formData.get("category") || "");
    productFormData.append("color", formData.get("color")?.trim() || "");
    productFormData.append("rentalPrice", formData.get("rentalPrice") || 0);
    productFormData.append("deposit", formData.get("deposit") || 0);
    if (formData.has("status")) {
        productFormData.append("status", formData.get("status") || "available");
    }

    form.querySelectorAll('input[name="sizes"]:checked').forEach((checkbox) => {
        productFormData.append("sizes", checkbox.value);
    });

    if (imageFile) {
        productFormData.append("image", imageFile);
    }

    return productFormData;
}

async function parseApiResponse(response) {
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Yêu cầu API thất bại");
    }

    return result.data;
}

function buildProductListUrl() {
    const params = new URLSearchParams({
        page: pageState.page,
        limit: pageState.limit
    });

    if (pageState.search) {
        params.set("search", pageState.search);
    }

    if (pageState.category !== "all") {
        params.set("category", pageState.category);
    }

    if (pageState.status !== "all") {
        params.set("status", pageState.status);
    }

    if (pageState.priceRange === "under-2m") {
        params.set("maxPrice", 1999999);
    } else if (pageState.priceRange === "2m-5m") {
        params.set("minPrice", 2000000);
        params.set("maxPrice", 5000000);
    } else if (pageState.priceRange === "over-5m") {
        params.set("minPrice", 5000001);
    }

    return `/api/products?${params.toString()}`;
}

async function loadCategories() {
    try {
        const response = await apiFetch("/api/categories");
        const categories = await parseApiResponse(response);
        pageState.categories = Array.isArray(categories) ? categories : [];
    } catch (error) {
        console.error("Không thể tải danh mục:", error);
        pageState.categories = [];
    }

    renderCategoryOptions();
}

function renderCategoryOptions() {
    const categorySelects = [
        document.querySelector('select[name="category"]'),
        document.getElementById("edit-product-category")
    ].filter(Boolean);
    const filterSelect = document.querySelectorAll(".filter-select")[0];

    categorySelects.forEach((select) => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Chọn danh mục</option>';
        pageState.categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category._id || category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });

        // Thêm tuỳ chọn "Thêm danh mục mới"
        const newCatOption = document.createElement("option");
        newCatOption.value = "__new__";
        newCatOption.textContent = "+ Thêm danh mục mới";
        newCatOption.style.fontWeight = "bold";
        newCatOption.style.color = "#1a73e8";
        select.appendChild(newCatOption);

        select.value = currentValue;
    });

    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">Tất cả danh mục</option>';
        pageState.categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category._id || category.name;
            option.textContent = category.name;
            filterSelect.appendChild(option);
        });
        filterSelect.value = pageState.categories.some((category) => (category._id || category.name) === currentValue)
            ? currentValue
            : "all";
    }
}

async function loadProducts() {
    const tbody = document.querySelector(".products-table tbody");
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 28px;">Đang tải sản phẩm...</td></tr>';
    }

    try {
        const response = await apiFetch(buildProductListUrl());
        const data = await parseApiResponse(response);

        pageState.products = data.products || [];
        pageState.total = data.pagination?.total || 0;
        pageState.totalPages = data.pagination?.totalPages || 1;
        pageState.page = data.pagination?.page || 1;

        renderProductsTable();
        renderPagination();
        renderStats(data.stats);
    } catch (error) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 28px;">${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

function renderStats(stats = {}) {
    const values = document.querySelectorAll(".kpi-value");
    const growthTrend = document.querySelector('[data-stat="product-growth"]');
    const rentedPercent = document.querySelector('[data-stat="rented-percent"]');
    if (values.length < 4) return;

    values[0].textContent = stats.total ?? 0;
    values[1].textContent = stats.rented ?? 0;
    values[2].textContent = stats.maintenance ?? 0;
    values[3].textContent = stats.available ?? 0;

    if (growthTrend) {
        const growth = Number(stats.growthPercent || 0);
        const icon = growth > 0 ? "trending_up" : growth < 0 ? "trending_down" : "remove";
        const sign = growth > 0 ? "+" : "";

        growthTrend.classList.remove("trend-up", "trend-down", "trend-neutral");
        growthTrend.classList.add(growth > 0 ? "trend-up" : growth < 0 ? "trend-down" : "trend-neutral");
        growthTrend.innerHTML = `
            <span class="material-symbols-outlined">${icon}</span>
            ${sign}${growth.toFixed(1)}%
        `;
    }

    if (rentedPercent) {
        rentedPercent.textContent = `${Number(stats.rentedPercent || 0).toFixed(1)}%`;
    }
}

function renderProductsTable() {
    const tbody = document.querySelector(".products-table tbody");
    if (!tbody) return;

    if (!pageState.products.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 28px;">Chưa có sản phẩm phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = "";

    pageState.products.forEach((product) => {
        const sizeTags = ["XS", "S", "M", "L", "XL", "XXL"].map((size) => {
            const sizeInfo = getSizeAvailability(product).find((item) => item.size === size);
            if (!sizeInfo) {
                return `<span class="size-tag">${size}</span>`;
            }

            const isRented = sizeInfo.status === "rented";
            return `
                <span class="size-tag ${isRented ? "size-rented" : "size-active"}" title="${isRented ? "Đang được thuê" : "Sẵn sàng"}">
                    ${size}
                    <small>${isRented ? "Đang thuê" : "Sẵn sàng"}</small>
                </span>
            `;
        }).join("");
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <div class="product-img-wrapper">
                        <img class="product-img" src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}"/>
                    </div>
                    <div class="product-info">
                        <p class="product-name">${escapeHtml(product.name)}</p>
                        <p class="product-code">#${escapeHtml(product.code || product._id)}</p>
                    </div>
                </div>
            </td>
            <td><span class="category-tag">${escapeHtml(getCategoryName(product))}</span></td>
            <td><span class="color-text" style="color: #4d4635;">${escapeHtml(product.color)}</span></td>
            <td>
                <div class="size-group">
                    ${sizeTags}
                </div>
            </td>
            <td><span class="price-text">${formatCurrency(product.rentalPrice)}</span></td>
            <td><span class="price-text" style="font-weight: normal; color: #5f5e5e;">${formatCurrency(product.deposit)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-icon" title="Xem chi tiết" onclick="openDetailModal('${product._id}')">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="action-btn-icon" title="Chỉnh sửa" onclick="openEditModal('${product._id}')">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="action-btn-icon btn-delete" title="Xóa" onclick="openDeleteModal('${product._id}')">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    const paginationText = document.querySelector(".pagination-text");
    const paginationButtons = document.querySelector(".pagination-buttons");
    const start = pageState.total === 0 ? 0 : (pageState.page - 1) * pageState.limit + 1;
    const end = Math.min(pageState.page * pageState.limit, pageState.total);

    if (paginationText) {
        paginationText.textContent = `Đang hiển thị ${start} đến ${end} trên ${pageState.total} sản phẩm`;
    }

    if (!paginationButtons) return;

    const maxPage = Math.max(pageState.totalPages, 1);
    const pages = getVisiblePaginationPages(pageState.page, maxPage);

    paginationButtons.innerHTML = `
        <button class="pagination-btn-nav" ${pageState.page <= 1 ? "disabled" : ""} onclick="goToProductPage(${pageState.page - 1})" aria-label="Trang trước">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
        ${pages.map((page) => page === "..."
            ? '<span class="pagination-ellipsis">...</span>'
            : `<button class="pagination-btn-num ${page === pageState.page ? "pagination-active" : ""}" onclick="goToProductPage(${page})" ${page === pageState.page ? 'aria-current="page"' : ""}>${page}</button>`
        ).join("")}
        <button class="pagination-btn-nav" ${pageState.page >= maxPage ? "disabled" : ""} onclick="goToProductPage(${pageState.page + 1})" aria-label="Trang sau">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;
}

function getVisiblePaginationPages(currentPage, totalPages) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];
    const from = Math.max(2, currentPage - 1);
    const to = Math.min(totalPages - 1, currentPage + 1);

    if (from > 2) pages.push("...");

    for (let page = from; page <= to; page += 1) {
        pages.push(page);
    }

    if (to < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
}

function goToProductPage(page) {
    if (page < 1 || page > pageState.totalPages) return;
    pageState.page = page;
    loadProducts();
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "block";
    }
}

function setImagePreview(previewId, src) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    const dropzone = preview.closest('.upload-dropzone');
    const placeholder = dropzone ? dropzone.querySelector('.upload-placeholder') : null;
    const container = dropzone ? dropzone.querySelector('.upload-preview-container') : null;

    if (src) {
        preview.src = src;
        preview.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
        if (container) container.style.display = "block";
    } else {
        preview.removeAttribute("src");
        preview.style.display = "none";
        if (placeholder) placeholder.style.display = "flex";
        if (container) container.style.display = "none";
    }
}

function resetNewCategoryControls() {
    const addCategorySelect = document.getElementById("add-product-category");
    const newCategoryWrapper = document.getElementById("new-category-wrapper");
    const newCategoryInput = document.getElementById("new-category-input");

    if (newCategoryWrapper) newCategoryWrapper.style.display = "none";
    if (newCategoryInput) {
        newCategoryInput.required = false;
        newCategoryInput.value = "";
    }
    if (addCategorySelect) {
        addCategorySelect.style.display = "block";
        addCategorySelect.required = true;
        addCategorySelect.value = "";
    }
}

function resetModalFields(modal) {
    modal.querySelectorAll("form").forEach((form) => form.reset());
    modal.querySelectorAll('input[type="hidden"]').forEach((input) => {
        input.value = "";
    });
}

function resetProductModalState(id, modal) {
    resetModalFields(modal);

    if (id === "modal-product-add") {
        resetNewCategoryControls();
        setImagePreview("add-product-image-preview", "");
    }

    if (id === "modal-product-edit") {
        setImagePreview("edit-product-image-preview", "");
    }

    if (id === "modal-product-delete") {
        const deleteName = document.getElementById("delete-product-name");
        if (deleteName) deleteName.textContent = "";
    }
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        `;
    } else {
        icon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
        `;
    }

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-fade-out');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    });

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-fade-out');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }
    }, 4000);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        resetProductModalState(id, modal);
        modal.style.display = "none";
    }
}

async function getProduct(id) {
    const cached = pageState.products.find((product) => product._id === id);
    if (cached) return cached;

    const response = await apiFetch(`/api/products/${id}`);
    return parseApiResponse(response);
}

async function openDetailModal(id) {
    try {
        const product = await getProduct(id);

        document.getElementById("detail-product-img").src = getProductImage(product);
        document.getElementById("detail-product-name").textContent = product.name;
        document.getElementById("detail-product-code").textContent = `#${product.code || product._id}`;
        document.getElementById("detail-product-category").textContent = getCategoryName(product);
        document.getElementById("detail-product-color").textContent = product.color;
        document.getElementById("detail-product-sizes").textContent = product.sizes?.join(", ") || "Trống";
        document.getElementById("detail-product-price").textContent = formatCurrency(product.rentalPrice);
        document.getElementById("detail-product-deposit").textContent = formatCurrency(product.deposit);
        document.getElementById("detail-product-description").textContent = product.description;

        openModal("modal-product-detail");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function openEditModal(id) {
    try {
        const product = await getProduct(id);
        const form = document.getElementById("form-product-edit");

        document.getElementById("edit-product-id").value = product._id;
        document.getElementById("edit-product-name").value = product.name;
        document.getElementById("edit-product-description").value = product.description;
        document.getElementById("edit-product-category").value = product.category?._id || product.category || "";
        document.getElementById("edit-product-color").value = product.color;
        document.getElementById("edit-product-price").value = product.rentalPrice;
        document.getElementById("edit-product-deposit").value = product.deposit;
        document.getElementById("edit-product-image").value = "";
        setImagePreview("edit-product-image-preview", getProductImage(product));

        form.querySelectorAll('input[name="sizes"]').forEach((checkbox) => {
            checkbox.checked = product.sizes?.includes(checkbox.value);
        });

        openModal("modal-product-edit");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function openDeleteModal(id) {
    const product = pageState.products.find((item) => item._id === id);

    document.getElementById("delete-product-id").value = id;
    document.getElementById("delete-product-name").textContent = product?.name || "này";

    openModal("modal-product-delete");
}

async function confirmProductDelete() {
    const id = document.getElementById("delete-product-id").value;

    try {
        const response = await apiFetch(`/api/products/${id}`, {
            method: "DELETE"
        });
        await parseApiResponse(response);

        closeModal("modal-product-delete");
        await loadProducts();
        showToast("Xóa sản phẩm thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleProductAdd(event) {
    event.preventDefault();
    const form = event.target;

    try {
        let categoryId = form.category.value;
        const newCategoryWrapper = document.getElementById("new-category-wrapper");
        const newCategoryInput = document.getElementById("new-category-input");
        const addCategorySelect = document.getElementById("add-product-category");
        
        // Nếu người dùng đang nhập danh mục mới
        if (newCategoryWrapper && newCategoryWrapper.style.display === "flex") {
            const newCatName = newCategoryInput.value.trim();
            if (!newCatName) {
                showToast("Vui lòng nhập tên danh mục", "error");
                return;
            }
            
            // Gọi API tạo danh mục mới
            const catResponse = await apiFetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCatName })
            });
            const createdCat = await parseApiResponse(catResponse);
            categoryId = createdCat._id || createdCat.name;
            
            // Trả lại giao diện select
            newCategoryWrapper.style.display = "none";
            newCategoryInput.required = false;
            newCategoryInput.value = "";
            addCategorySelect.style.display = "block";
            addCategorySelect.required = true;
        }

        const productFormData = buildProductFormData(form);
        if (categoryId && categoryId !== "__new__") {
            productFormData.set("category", categoryId);
        }

        const response = await apiFetch("/api/products", {
            method: "POST",
            body: productFormData
        });
        await parseApiResponse(response);

        closeModal("modal-product-add");
        form.reset();
        setImagePreview("add-product-image-preview", "");
        pageState.page = 1;
        await loadProducts();
        await loadCategories();
        showToast("Thêm sản phẩm mới thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleProductEdit(event) {
    event.preventDefault();
    const form = event.target;
    const id = document.getElementById("edit-product-id").value;

    try {
        const response = await apiFetch(`/api/products/${id}`, {
            method: "PUT",
            body: buildProductFormData(form)
        });
        await parseApiResponse(response);

        closeModal("modal-product-edit");
        await loadProducts();
        await loadCategories();
        showToast("Cập nhật thông tin sản phẩm thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function bindImagePreviews() {
    document.querySelectorAll(".product-image-input").forEach((input) => {
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            const previewId = input.dataset.preview;

            if (!file) {
                setImagePreview(previewId, "");
                return;
            }

            setImagePreview(previewId, URL.createObjectURL(file));
        });
    });
}

function bindCategoryCreation() {
    const addCategorySelect = document.getElementById("add-product-category");
    const newCategoryWrapper = document.getElementById("new-category-wrapper");
    const newCategoryInput = document.getElementById("new-category-input");
    const cancelNewCategoryBtn = document.getElementById("cancel-new-category");

    if (addCategorySelect && newCategoryWrapper) {
        addCategorySelect.addEventListener("change", (e) => {
            if (e.target.value === "__new__") {
                addCategorySelect.style.display = "none";
                addCategorySelect.required = false;
                newCategoryWrapper.style.display = "flex";
                newCategoryInput.required = true;
                newCategoryInput.focus();
            }
        });

        cancelNewCategoryBtn.addEventListener("click", resetNewCategoryControls);
    }
}

function bindFilters() {
    const searchInputs = [
        document.querySelector(".filter-search-input"),
        document.querySelector(".search-input")
    ].filter(Boolean);
    const selects = document.querySelectorAll(".filter-select");
    const refreshButton = document.querySelector(".btn-refresh");
    let searchTimer;

    searchInputs.forEach((input) => {
        input.addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                pageState.search = input.value.trim();
                pageState.page = 1;
                loadProducts();
            }, 300);
        });
    });

    if (selects[0]) {
        selects[0].addEventListener("change", () => {
            pageState.category = selects[0].value || "all";
            pageState.page = 1;
            loadProducts();
        });
    }

    if (selects[1]) {
        selects[1].innerHTML = `
            <option value="all">Trạng thái</option>
            <option value="available">Sẵn sàng</option>
            <option value="rented">Đang thuê</option>
            <option value="maintenance">Đang vệ sinh</option>
            <option value="outofstock">Hết hàng</option>
        `;
        selects[1].addEventListener("change", () => {
            pageState.status = selects[1].value || "all";
            pageState.page = 1;
            loadProducts();
        });
    }

    if (selects[2]) {
        selects[2].innerHTML = `
            <option value="all">Giá thuê</option>
            <option value="under-2m">Dưới 2tr</option>
            <option value="2m-5m">2tr - 5tr</option>
            <option value="over-5m">Trên 5tr</option>
        `;
        selects[2].addEventListener("change", () => {
            pageState.priceRange = selects[2].value || "all";
            pageState.page = 1;
            loadProducts();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadProducts();
        });
    }
}

function initProductsPage() {
    const sidebar = document.getElementById("main-sidebar");
    const content = document.getElementById("main-content");
    const toggleBtn = document.getElementById("sidebar-toggle");
    const navLinks = document.querySelectorAll(".nav-item");

    if (toggleBtn && sidebar && content) {
        toggleBtn.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle("sidebar-open");
            } else {
                sidebar.classList.toggle("sidebar-collapsed");
                content.classList.toggle("content-expanded");
            }

            const icon = toggleBtn.querySelector(".material-symbols-outlined");
            if (icon) {
                if (sidebar.classList.contains("sidebar-collapsed") ||
                    (window.innerWidth <= 768 && !sidebar.classList.contains("sidebar-open"))) {
                    icon.textContent = "chevron_right";
                } else {
                    icon.textContent = "menu";
                }
            }
        });
    }

    if (navLinks.length > 1) {
        navLinks.forEach((link) => link.classList.remove("active"));
        navLinks[1].classList.add("active");
    }

    const addBtn = document.querySelector(".btn-add");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openModal("modal-product-add");
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            closeModal(event.target.id);
        }
    });

    bindFilters();
    bindImagePreviews();
    bindCategoryCreation();
    loadCategories();
    loadProducts();

    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 0.8s ease-in-out";
    requestAnimationFrame(() => {
        document.body.style.opacity = "1";
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const [sidebarLoaded] = await Promise.all([
        loadLayout("sidebar-placeholder", "../layouts/sidebar.html"),
        loadLayout("footer-placeholder", "../layouts/footer.html")
    ]);

    if (sidebarLoaded) {
        window.initNavbarAuth?.();
        initProductsPage();
    } else {
        document.body.style.opacity = "0";
        document.body.style.transition = "opacity 0.8s ease-in-out";
        requestAnimationFrame(() => {
            document.body.style.opacity = "1";
        });
    }
});
