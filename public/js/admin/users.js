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

function initUsersPage() {
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

    // Set Active Item for Customers (index 3)
    if (navLinks.length > 3) {
        navLinks.forEach(link => link.classList.remove('active'));
        navLinks[3].classList.add('active');
    }

    // Search filter logic
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = users.filter(user => 
                user.fullName.toLowerCase().includes(val) || 
                user.email.toLowerCase().includes(val) || 
                user.phone.toLowerCase().includes(val)
            );
            renderUsersTable(filtered);
        });
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

    // Load users from DB
    loadUsers();
}

let users = [];

async function loadUsers() {
    try {
        const response = await apiFetch("/api/users");
        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }
        users = await parseApiResponse(response);
        renderUsersTable(users);
        updatePaginationText(users.length);
    } catch (error) {
        console.error("Không thể tải danh sách người dùng:", error);
        const tbody = document.querySelector(".users-table tbody");
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

function renderUsersTable(userList) {
    const tbody = document.querySelector(".users-table tbody");
    if (!tbody) return;

    if (!userList || userList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #7a7979;">Không tìm thấy người dùng nào</td></tr>`;
        return;
    }

    tbody.innerHTML = userList.map(user => {
        const registeredDate = new Date(user.createdAt).toLocaleDateString("vi-VN", {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
        
        const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-wrapper">
                            <div class="user-avatar-initials">${initials}</div>
                        </div>
                        <span class="user-name">${escapeHtml(user.fullName)}</span>
                    </div>
                </td>
                <td class="user-email">${escapeHtml(user.email)}</td>
                <td class="user-phone">${escapeHtml(user.phone)}</td>
                <td class="user-address">${escapeHtml(user.address || 'Chưa cập nhật')}</td>
                <td>
                    <span class="role-badge ${user.role === 'admin' ? 'admin' : 'customer'}">
                        ${user.role === 'admin' ? 'Admin' : 'Khách hàng'}
                    </span>
                </td>
                <td class="user-created">${registeredDate}</td>
                <td>
                    <div class="status-wrapper">
                        <div class="status-dot ${user.isActive ? 'active' : 'inactive'}"></div>
                        <span class="status-text ${user.isActive ? 'active' : 'inactive'}">
                            ${user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-icon" title="Chi tiết" onclick="handleUserAction('Xem chi tiết', '${user.fullName}')">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="action-btn-icon" title="Sửa" onclick="handleUserAction('Chỉnh sửa', '${user.fullName}')">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="action-btn-icon delete" title="Xóa" onclick="handleUserAction('Xóa', '${user.fullName}')">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function handleUserAction(action, name) {
    alert(`${action} người dùng "${name}": Tính năng đang được phát triển.`);
}

function updatePaginationText(count) {
    const textEl = document.querySelector(".pagination-text");
    if (textEl) {
        textEl.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} người dùng`;
    }
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
        initUsersPage();
    } else {
        // Fallback fade-in if sidebar fails
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
