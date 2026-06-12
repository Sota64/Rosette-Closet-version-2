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

    // Load orders
    loadOrders();
}

let orders = [];

async function loadOrders() {
    try {
        const response = await apiFetch("/api/orders");
        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }
        orders = await parseApiResponse(response);
        renderOrdersTable(orders);
        updatePaginationText(orders.length);
    } catch (error) {
        console.error("Không thể tải danh sách đơn hàng:", error);
        const tbody = document.querySelector(".orders-table tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #ba1a1a;">Không thể tải dữ liệu: ${escapeHtml(error.message)}</td></tr>`;
        }
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
                        <button class="action-btn-icon" title="Xem chi tiết" onclick="handleOrderAction('Xem chi tiết', '${order._id}')">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="action-btn-icon" title="Cập nhật trạng thái" onclick="handleOrderAction('Cập nhật trạng thái', '${order._id}')">
                            <span class="material-symbols-outlined">edit</span>
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

function handleOrderAction(action, id) {
    alert(`${action} đơn hàng #${id.slice(-6).toUpperCase()}: Tính năng đang được phát triển.`);
}

function updatePaginationText(count) {
    const textEl = document.querySelector(".pagination-text");
    if (textEl) {
        textEl.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} đơn thuê`;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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
