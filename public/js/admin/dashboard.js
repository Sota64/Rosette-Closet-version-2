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
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value = 0) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function getInitials(name = "") {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "RC";
}

function formatDateRange(startDate, returnDate) {
    if (!startDate || !returnDate) return "Chưa cập nhật";

    const start = new Date(startDate).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit"
    });
    const end = new Date(returnDate).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit"
    });

    return `${start} - ${end}`;
}

function getStatusMeta(status) {
    const map = {
        pending: { className: "status-pending", label: "Chờ duyệt" },
        approved: { className: "status-pending", label: "Đã duyệt" },
        delivering: { className: "status-pending", label: "Đang giao" },
        renting: { className: "status-renting", label: "Đang thuê" },
        returned: { className: "status-ready", label: "Đã trả" },
        completed: { className: "status-ready", label: "Hoàn thành" },
        cancelled: { className: "status-pending", label: "Đã hủy" }
    };

    return map[status] || { className: "status-pending", label: status || "Không rõ" };
}

async function parseApiResponse(response) {
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải dữ liệu bảng điều khiển");
    }

    return result.data;
}

function setTrend(element, value, suffix = "%") {
    if (!element) return;

    const numberValue = Number(value || 0);
    const icon = numberValue > 0 ? "trending_up" : numberValue < 0 ? "trending_down" : "remove";
    const sign = numberValue > 0 ? "+" : "";

    element.classList.remove("trend-up", "trend-neutral", "trend-error");
    element.classList.add(numberValue > 0 ? "trend-up" : numberValue < 0 ? "trend-error" : "trend-neutral");
    element.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        ${sign}${numberValue.toFixed(1)}${suffix}
    `;
}

function renderRevenueChart(series = []) {
    const svg = document.querySelector(".revenue-chart-container svg");
    if (!svg || !series.length) return;

    const values = series.map((point) => point.revenue || 0);
    const max = Math.max(...values, 1);
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
        const y = 36 - (value / max) * 30;
        return { x, y };
    });
    const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const area = `${line} L 100 40 L 0 40 Z`;

    svg.innerHTML = `
        <path d="${line}" fill="none" stroke="#D4AF37" stroke-width="2"></path>
        <path d="${area}" fill="url(#goldGradient)" opacity="0.1"></path>
        <defs>
            <linearGradient id="goldGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1"></stop>
                <stop offset="100%" style="stop-color:#D4AF37;stop-opacity:0"></stop>
            </linearGradient>
        </defs>
    `;
}

function renderMemberAvatars(totalUsers = 0) {
    const list = document.querySelector('[data-dashboard="member-avatars"]');
    if (!list) return;

    const visibleCount = Math.min(totalUsers, 3);
    const avatars = Array.from({ length: visibleCount }, (_, index) => `
        <li><div class="avatar-more">${index + 1}</div></li>
    `).join("");
    const more = totalUsers > visibleCount ? `<li><div class="avatar-more">+${totalUsers - visibleCount}</div></li>` : "";

    list.innerHTML = avatars + more;
}

function renderInventorySegments(healthPercent = 0) {
    const container = document.querySelector('[data-dashboard="inventory-segments"]');
    if (!container) return;

    const activeSegments = Math.round((healthPercent / 100) * 5);
    container.innerHTML = Array.from({ length: 5 }, (_, index) => {
        return `<div class="status-segment ${index < activeSegments ? "active" : "inactive"}"></div>`;
    }).join("");
}

function renderRecentOrders(orders = []) {
    const tbody = document.querySelector('[data-dashboard="recent-orders"]');
    if (!tbody) return;

    if (!orders.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding: 24px; color: #7a7979;">Chưa có đơn thuê nào</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map((order) => {
        const customerName = order.user?.fullName || "Khách vãng lai";
        const productNames = order.items?.map((item) => item.product?.name || "Sản phẩm đã xóa").join(", ") || "Không có sản phẩm";
        const status = getStatusMeta(order.status);

        return `
            <tr>
                <td>
                    <div class="customer-cell">
                        <div class="customer-initials">${escapeHtml(getInitials(customerName))}</div>
                        <p class="customer-name">${escapeHtml(customerName)}</p>
                    </div>
                </td>
                <td><p class="product-cell">${escapeHtml(productNames)}</p></td>
                <td><p class="date-cell">${escapeHtml(formatDateRange(order.startDate, order.returnDate))}</p></td>
                <td><span class="status-badge ${status.className}">${escapeHtml(status.label)}</span></td>
            </tr>
        `;
    }).join("");
}

function renderDashboard(data) {
    const adminName = data.admin?.fullName || "Quản trị viên";
    const firstName = adminName.split(" ").pop();
    const todayText = new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    const kpis = data.kpis || {};

    const adminNameElement = document.querySelector('[data-dashboard="admin-name"]');
    const adminRoleElement = document.querySelector('[data-dashboard="admin-role"]');
    if (adminNameElement) adminNameElement.textContent = adminName;
    if (adminRoleElement) adminRoleElement.textContent = data.admin?.role === "admin" ? "Quản trị viên" : "Người dùng";
    document.querySelector('[data-dashboard="welcome-title"]').textContent = `Chào mừng trở lại, ${firstName}`;
    document.querySelector('[data-dashboard="welcome-subtitle"]').textContent = `${todayText} — Tổng quan hoạt động hôm nay.`;

    document.querySelector('[data-dashboard="total-revenue"]').textContent = formatCurrency(kpis.totalRevenue);
    setTrend(document.querySelector('[data-dashboard="revenue-growth"]'), kpis.revenueGrowthPercent);
    renderRevenueChart(data.revenueSeries);

    document.querySelector('[data-dashboard="active-rentals"]').textContent = kpis.activeRentals || 0;
    document.querySelector('[data-dashboard="active-rental-percent"]').textContent = formatPercent(kpis.activeRentalPercent);
    document.querySelector('[data-dashboard="due-today"]').textContent = `${kpis.dueToday || 0} đơn đến hạn trả hôm nay`;
    document.querySelector('[data-dashboard="active-rental-bar"]').style.width = `${Math.min(kpis.activeRentalPercent || 0, 100)}%`;

    document.querySelector('[data-dashboard="total-users"]').textContent = kpis.totalUsers || 0;
    document.querySelector('[data-dashboard="new-users"]').textContent = `+${kpis.newUsers || 0}`;
    renderMemberAvatars(kpis.totalUsers || 0);

    document.querySelector('[data-dashboard="inventory-health"]').textContent = formatPercent(kpis.inventoryHealthPercent);
    document.querySelector('[data-dashboard="inventory-health-trend"]').textContent = formatPercent(kpis.inventoryHealthPercent);
    document.querySelector('[data-dashboard="inventory-health-subtitle"]').textContent = `${kpis.maintenanceProducts || 0} sản phẩm cần xử lý`;
    renderInventorySegments(kpis.inventoryHealthPercent || 0);

    renderRecentOrders(data.recentOrders || []);
    document.querySelector('[data-dashboard="insight"]').textContent = data.insight || "Chưa có đủ dữ liệu để tạo gợi ý vận hành.";
}

async function loadDashboard() {
    try {
        const response = await apiFetch("/api/dashboard");

        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }

        const data = await parseApiResponse(response);
        renderDashboard(data);
    } catch (error) {
        console.error("Không thể tải bảng điều khiển:", error);
        document.querySelector('[data-dashboard="insight"]').textContent = error.message;
    }
}

function initDashboard() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.nav-item');

    if (toggleBtn && sidebar && content) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            content.classList.toggle('content-expanded');

            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                if (sidebar.classList.contains('sidebar-collapsed')) {
                    icon.textContent = 'chevron_right';
                } else {
                    icon.textContent = 'menu';
                }
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => {
                l.classList.remove('active');
            });
            link.classList.add('active');
        });
    });

    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in-out';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });

    loadDashboard();
}

document.addEventListener("DOMContentLoaded", async () => {
    const loaded = await loadLayout("sidebar-placeholder", "../layouts/sidebar.html");
    if (loaded) {
        window.initNavbarAuth?.();
        initDashboard();
    } else {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
