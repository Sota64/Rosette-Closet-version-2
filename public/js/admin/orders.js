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

function initOrdersPage() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.nav-item');
    const canvas = document.querySelector('.canvas-container');
    const topBar = document.querySelector('.top-bar');

    // Sidebar Collapse / Toggle Logic
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile slide drawer toggle
                sidebar.classList.toggle('sidebar-open');
            } else {
                // Desktop collapse toggle
                sidebar.classList.toggle('sidebar-collapsed');
                if (content) content.classList.toggle('content-expanded');
                if (canvas) canvas.classList.toggle('canvas-expanded');
                if (topBar) topBar.classList.toggle('top-bar-expanded');
            }
            
            // Change icon based on state
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                if (sidebar.classList.contains('sidebar-collapsed') || 
                    (window.innerWidth <= 768 && !sidebar.classList.contains('sidebar-open'))) {
                    icon.textContent = 'chevron_right';
                } else {
                    icon.textContent = 'menu';
                }
            }
        });
    }
    // Set Active Item for Bookings/Orders (index 2)
    if (navLinks.length > 2) {
        navLinks.forEach(link => link.classList.remove('active'));
        navLinks[2].classList.add('active');
    }

    // Simple micro-interactions for button clicks
    document.querySelectorAll('button, .btn, .nav-item, .pagination-btn-num, .pagination-btn-nav').forEach(el => {
        el.addEventListener('mousedown', () => {
            el.style.transform = 'scale(0.98)';
        });
        el.addEventListener('mouseup', () => {
            el.style.transform = 'scale(1)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });
    });

    // Atmospheric fade-in effect on load
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in-out';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });

    // Bind Add modal open
    const addBtn = document.querySelector(".btn-add");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            // Reset items container
            const container = document.getElementById("add-order-items-container");
            if (container) container.innerHTML = "";
            document.getElementById("form-order-add").reset();
            document.getElementById("add-order-total-display").textContent = formatCurrency(0);
            
            // Add initial row
            createOrderItemRow("add-order-items-container");
            
            openModal("modal-order-add");
        });
    }

    // Bind click outside to close modals
    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    });

    // Load related resources
    loadUsersAndProducts();

    // Load orders
    loadOrders();
}

let orders = [];
let ordersPagination = {
    total: 0
};

async function loadOrders() {
    try {
        const response = await apiFetch("/api/orders");
        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }
        const data = await parseApiResponse(response);
        orders = Array.isArray(data) ? data : data.orders || [];
        ordersPagination = Array.isArray(data) ? { total: orders.length } : data.pagination || { total: orders.length };
        renderOrdersTable(orders);
        updatePaginationText(orders.length, ordersPagination.total);
        renderOrderStats(Array.isArray(data) ? null : data.stats);
    } catch (error) {
        console.error("Không thể tải danh sách đơn hàng:", error);
        const tbody = document.querySelector(".orders-table tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #ba1a1a;">Không thể tải dữ liệu: ${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

function renderOrderStats(stats) {
    if (!stats) return;

    const values = document.querySelectorAll(".kpi-value");
    const trends = document.querySelectorAll(".kpi-trend");

    if (values.length >= 4) {
        values[0].textContent = stats.total || 0;
        values[1].textContent = (stats.pending || 0) + (stats.approved || 0) + (stats.delivering || 0);
        values[2].textContent = stats.completed || 0;
        values[3].textContent = formatCompactCurrency(stats.revenue || 0);
    }

    if (trends.length >= 4) {
        const completedPercent = stats.total > 0 ? ((stats.completed || 0) / stats.total) * 100 : 0;
        const todayNew = stats.todayNew || 0;
        trends[1].textContent = `${todayNew} đơn mới hôm nay`;
        trends[2].textContent = `${completedPercent.toFixed(1)}% tỷ lệ hoàn thành`;
        trends[3].textContent = "Doanh thu thực tế";
    }
}

async function parseApiResponse(response) {
    const res = await response.json();
    if (!response.ok) {
        throw new Error(res.message || "Có lỗi xảy ra");
    }
    return res.data;
}

function renderOrdersTable(orderList) {
    const tbody = document.querySelector(".orders-table tbody");
    if (!tbody) return;

    if (!orderList || orderList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #7a7979;">Không có đơn hàng nào</td></tr>`;
        return;
    }

    tbody.innerHTML = orderList.map(order => {
        const start = new Date(order.startDate).toLocaleDateString("vi-VN", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const end = new Date(order.returnDate).toLocaleDateString("vi-VN", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // Compute total deposit
        let totalDeposit = 0;
        if (order.items && order.items.length > 0) {
            totalDeposit = order.items.reduce((sum, item) => sum + (item.deposit || 0) * (item.quantity || 1), 0);
        }

        // Generate product names summary
        const productsHtml = order.items && order.items.length > 0
            ? order.items.map(item => {
                const productName = item.product?.name || "Sản phẩm đã xóa";
                return `
                    <div class="product-detail-cell" style="margin-bottom: 4px;">
                        <span style="font-weight: 500;">${escapeHtml(productName)}</span>
                        <div class="product-spec" style="font-size: 11px; color: #7a7979;">Số lượng: ${item.quantity || 1}</div>
                    </div>
                `;
            }).join("")
            : `<span style="color: #7a7979;">Không có sản phẩm</span>`;

        const initials = order.user?.fullName
            ? order.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : "KH";

        const statusMeta = getStatusMeta(order.status);

        return `
            <tr>
                <td class="font-medium text-primary">#${order._id.slice(-6).toUpperCase()}</td>
                <td>
                    <div class="customer-cell">
                        <div class="customer-initials">${initials}</div>
                        <div class="customer-info">
                            <div class="customer-name">${escapeHtml(order.user?.fullName || "Khách vãng lai")}</div>
                            <div class="customer-tag" style="font-size: 11px; color: #7a7979;">${escapeHtml(order.user?.phone || "Không có SĐT")}</div>
                        </div>
                    </div>
                </td>
                <td>
                    ${productsHtml}
                </td>
                <td>
                    <span style="font-size: 13px; color: #1b1c1c; font-family: 'Inter', sans-serif;">
                        ${start} - ${end}
                    </span>
                </td>
                <td class="text-right font-medium" style="font-family: 'Inter', sans-serif;">
                    ${formatCurrency(totalDeposit)}
                </td>
                <td class="text-right font-medium" style="font-family: 'Inter', sans-serif; color: #735c00; font-weight: 600;">
                    ${formatCurrency(order.totalAmount)}
                </td>
                <td>
                    <span class="status-badge ${statusMeta.class}">${statusMeta.label}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-icon" title="Xem chi tiết" onclick="openOrderDetailModal('${order._id}')">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="action-btn-icon" title="Sửa đơn hàng" onclick="openOrderEditModal('${order._id}')">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="action-btn-icon btn-delete" title="Xóa đơn hàng" onclick="openOrderDeleteModal('${order._id}')">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function getStatusMeta(status) {
    switch(status) {
        case 'pending':
            return { class: 'badge-processing', label: 'Chờ duyệt' };
        case 'approved':
            return { class: 'badge-processing', label: 'Đã duyệt' };
        case 'delivering':
            return { class: 'badge-processing', label: 'Đang giao' };
        case 'renting':
            return { class: 'badge-shipped', label: 'Đang thuê' };
        case 'returned':
            return { class: 'badge-completed', label: 'Đã trả' };
        case 'completed':
            return { class: 'badge-completed', label: 'Hoàn thành' };
        case 'cancelled':
            return { class: 'badge-cancelled', label: 'Đã hủy' };
        default:
            return { class: 'badge-processing', label: status };
    }
}

let allUsers = [];
let allProducts = [];

async function loadUsersAndProducts() {
    try {
        const [usersRes, productsRes] = await Promise.all([
            apiFetch("/api/users?limit=1000"),
            apiFetch("/api/products?limit=1000")
        ]);
        const usersData = await parseApiResponse(usersRes);
        const productsData = await parseApiResponse(productsRes);
        
        allUsers = Array.isArray(usersData) ? usersData : usersData.users || [];
        allProducts = Array.isArray(productsData) ? productsData : productsData.products || [];
        
        populateUserDropdowns();
    } catch(err) {
        console.error("Lỗi tải thông tin liên kết:", err);
    }
}

function populateUserDropdowns() {
    const dropdowns = document.querySelectorAll(".user-select-dropdown");
    dropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = '<option value="">Chọn khách hàng</option>';
        allUsers.forEach(user => {
            const opt = document.createElement("option");
            opt.value = user._id;
            opt.textContent = `${user.fullName} (${user.email})`;
            dropdown.appendChild(opt);
        });
        dropdown.value = currentValue;
    });
}

function createOrderItemRow(containerId, productVal='', qtyVal=1, priceVal='', depositVal='') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const row = document.createElement("div");
    row.className = "form-row order-item-row";
    row.style.gridTemplateColumns = "2.5fr 1fr 1.5fr 1.5fr auto";
    row.style.alignItems = "end";
    row.style.gap = "10px";
    row.style.marginBottom = "10px";

    const productOptions = allProducts.map(p => `
        <option value="${p._id}" data-price="${p.rentalPrice}" data-deposit="${p.deposit}">${escapeHtml(p.name)} (${formatCurrency(p.rentalPrice)})</option>
    `).join("");

    row.innerHTML = `
        <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size:9px;">Sản phẩm</label>
            <select class="form-select item-product" required onchange="handleProductSelectChange(this)">
                <option value="">Chọn sản phẩm</option>
                ${productOptions}
            </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size:9px;">SL</label>
            <input type="number" class="form-input item-quantity" required min="1" value="${qtyVal}"/>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size:9px;">Giá thuê (VNĐ)</label>
            <input type="number" class="form-input item-price" required min="0" value="${priceVal}" placeholder="Giá"/>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size:9px;">Đặt cọc (VNĐ)</label>
            <input type="number" class="form-input item-deposit" required min="0" value="${depositVal}" placeholder="Cọc"/>
        </div>
        <button type="button" class="btn-modal-delete" style="padding: 10px; margin-bottom: 0; display: flex; align-items: center; justify-content: center; height: 38px; border-radius: 8px;" onclick="this.closest('.order-item-row').remove(); calculateTotalOrderAmount('${containerId.split('-')[0]}')">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
        </button>
    `;

    container.appendChild(row);

    if (productVal) {
        row.querySelector(".item-product").value = productVal;
    }

    const prefix = containerId.split('-')[0];
    row.querySelector(".item-quantity").addEventListener("input", () => calculateTotalOrderAmount(prefix));
    row.querySelector(".item-price").addEventListener("input", () => calculateTotalOrderAmount(prefix));
    row.querySelector(".item-deposit").addEventListener("input", () => calculateTotalOrderAmount(prefix));
    
    calculateTotalOrderAmount(prefix);
}

function handleProductSelectChange(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const row = selectEl.closest(".order-item-row");
    if (!selectedOption || !row) return;

    const price = selectedOption.getAttribute("data-price") || 0;
    const deposit = selectedOption.getAttribute("data-deposit") || 0;

    row.querySelector(".item-price").value = price;
    row.querySelector(".item-deposit").value = deposit;

    const prefix = selectEl.closest(".modal").id.split("-")[2]; // "add" or "edit"
    calculateTotalOrderAmount(prefix);
}

function calculateTotalOrderAmount(prefix) {
    const container = document.getElementById(`${prefix}-order-items-container`);
    if (!container) return;

    let total = 0;
    const rows = container.querySelectorAll(".order-item-row");
    rows.forEach(row => {
        const qty = parseInt(row.querySelector(".item-quantity").value) || 0;
        const price = parseFloat(row.querySelector(".item-price").value) || 0;
        const deposit = parseFloat(row.querySelector(".item-deposit").value) || 0;
        total += (price + deposit) * qty;
    });

    const displayEl = document.getElementById(`${prefix}-order-total-display`);
    if (displayEl) {
        displayEl.textContent = formatCurrency(total);
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "block";
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "none";
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

async function getOrder(id) {
    const cached = orders.find((order) => order._id === id);
    if (cached) return cached;

    const response = await apiFetch(`/api/orders/${id}`);
    return parseApiResponse(response);
}

function formatDateToYYYYMMDD(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function openOrderDetailModal(id) {
    try {
        const order = await getOrder(id);
        const start = new Date(order.startDate).toLocaleDateString("vi-VN", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const end = new Date(order.returnDate).toLocaleDateString("vi-VN", {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const statusMeta = getStatusMeta(order.status);

        document.getElementById("detail-order-id").textContent = `#${order._id.toUpperCase()}`;
        
        const statusEl = document.getElementById("detail-order-status");
        statusEl.className = `status-badge ${statusMeta.class}`;
        statusEl.textContent = statusMeta.label;

        document.getElementById("detail-order-customer").textContent = order.user?.fullName || "Khách vãng lai";
        document.getElementById("detail-order-phone").textContent = order.user?.phone || "Không có SĐT";
        document.getElementById("detail-order-address").textContent = order.user?.address || "Chưa cập nhật";
        document.getElementById("detail-order-dates").textContent = `${start} - ${end}`;

        // Load items list
        let rentalSum = 0;
        let depositSum = 0;
        const itemsListEl = document.getElementById("detail-order-items-list");
        itemsListEl.innerHTML = order.items.map(item => {
            const productTitle = item.product?.name || "Sản phẩm đã xóa";
            const itemRent = (item.rentalPrice || 0) * (item.quantity || 1);
            const itemDep = (item.deposit || 0) * (item.quantity || 1);
            rentalSum += itemRent;
            depositSum += itemDep;

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #efeded; font-size: 13px;">
                    <div>
                        <div style="font-weight: 500;">${escapeHtml(productTitle)}</div>
                        <div style="font-size: 11px; color: #7a7979;">Đơn giá thuê: ${formatCurrency(item.rentalPrice)} | Cọc: ${formatCurrency(item.deposit)} | SL: ${item.quantity}</div>
                    </div>
                    <div style="text-align: right; font-weight: 500;">
                        <div>Thuê: ${formatCurrency(itemRent)}</div>
                        <div style="font-size: 11px; color: #7a7979;">Cọc: ${formatCurrency(itemDep)}</div>
                    </div>
                </div>
            `;
        }).join("");

        document.getElementById("detail-order-rental-total").textContent = formatCurrency(rentalSum);
        document.getElementById("detail-order-deposit-total").textContent = formatCurrency(depositSum);
        document.getElementById("detail-order-grand-total").textContent = formatCurrency(order.totalAmount);

        openModal("modal-order-detail");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function openOrderEditModal(id) {
    try {
        const order = await getOrder(id);

        document.getElementById("edit-order-id").value = order._id;
        document.getElementById("edit-order-user").value = order.user?._id || "";
        document.getElementById("edit-order-status").value = order.status;
        document.getElementById("edit-order-start-date").value = formatDateToYYYYMMDD(order.startDate);
        document.getElementById("edit-order-return-date").value = formatDateToYYYYMMDD(order.returnDate);

        // Populate items container
        const container = document.getElementById("edit-order-items-container");
        container.innerHTML = "";
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                createOrderItemRow("edit-order-items-container", item.product?._id || item.product, item.quantity, item.rentalPrice, item.deposit);
            });
        } else {
            createOrderItemRow("edit-order-items-container");
        }

        openModal("modal-order-edit");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function openOrderDeleteModal(id) {
    document.getElementById("delete-order-id").value = id;
    document.getElementById("delete-order-id-label").textContent = `#${id.slice(-6).toUpperCase()}`;

    openModal("modal-order-delete");
}

async function confirmOrderDelete() {
    const id = document.getElementById("delete-order-id").value;

    try {
        const response = await apiFetch(`/api/orders/${id}`, {
            method: "DELETE"
        });
        await parseApiResponse(response);

        closeModal("modal-order-delete");
        await loadOrders();
        showToast("Xóa đơn hàng thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function collectOrderItemsPayload(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const items = [];
    const rows = container.querySelectorAll(".order-item-row");
    rows.forEach(row => {
        const productVal = row.querySelector(".item-product").value;
        const qtyVal = parseInt(row.querySelector(".item-quantity").value) || 1;
        const priceVal = parseFloat(row.querySelector(".item-price").value) || 0;
        const depositVal = parseFloat(row.querySelector(".item-deposit").value) || 0;

        if (productVal) {
            items.push({
                product: productVal,
                quantity: qtyVal,
                rentalPrice: priceVal,
                deposit: depositVal
            });
        }
    });

    return items;
}

async function handleOrderAdd(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const items = collectOrderItemsPayload("add-order-items-container");
    if (items.length === 0) {
        showToast("Vui lòng thêm ít nhất 1 sản phẩm thuê", "error");
        return;
    }

    const payload = {
        user: formData.get("user"),
        status: formData.get("status"),
        startDate: formData.get("startDate"),
        returnDate: formData.get("returnDate"),
        items: items
    };

    try {
        const response = await apiFetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        await parseApiResponse(response);

        closeModal("modal-order-add");
        form.reset();
        await loadOrders();
        showToast("Tạo đơn hàng mới thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleOrderEdit(event) {
    event.preventDefault();
    const form = event.target;
    const id = document.getElementById("edit-order-id").value;
    const formData = new FormData(form);

    const items = collectOrderItemsPayload("edit-order-items-container");
    if (items.length === 0) {
        showToast("Vui lòng thêm ít nhất 1 sản phẩm thuê", "error");
        return;
    }

    const payload = {
        user: formData.get("user"),
        status: formData.get("status"),
        startDate: formData.get("startDate"),
        returnDate: formData.get("returnDate"),
        items: items
    };

    try {
        const response = await apiFetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        await parseApiResponse(response);

        closeModal("modal-order-edit");
        await loadOrders();
        showToast("Cập nhật đơn hàng thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function updatePaginationText(count, total = count) {
    const textEl = document.querySelector(".pagination-text");
    if (textEl) {
        const start = total === 0 ? 0 : 1;
        textEl.textContent = `Đang hiển thị ${start} đến ${count} trong số ${total} đơn thuê`;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatCompactCurrency(value) {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)} tỷ ₫`;
    }

    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)} triệu ₫`;
    }

    return formatCurrency(value);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
    // Load dynamic sidebar first
    const loaded = await loadLayout("sidebar-placeholder", "../layouts/sidebar.html");
    if (loaded) {
        initOrdersPage();
    } else {
        // Fallback fade-in if sidebar fails
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
