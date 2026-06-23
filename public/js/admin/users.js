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

    // Bind Add modal open
    const addBtn = document.querySelector(".btn-add");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            resetUserAddressFields("add");
            openModal("modal-user-add");
        });
    }

    // Bind click outside to close modals
    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            closeModal(event.target.id);
        }
    });

    // Load users from DB
    loadUsers();
}

let users = [];
let usersPagination = {
    total: 0
};
const USER_ADDRESS_API_URL = "https://provinces.open-api.vn/api/?depth=3";
const USER_ADDRESS_CACHE_KEY = "rosette_vietnam_address_data";
const USER_ADDRESS_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const USER_FALLBACK_ADDRESS_DATA = [
    {
        name: "Thành phố Hà Nội",
        districts: [
            { name: "Quận Ba Đình", wards: [{ name: "Phường Phúc Xá" }, { name: "Phường Trúc Bạch" }, { name: "Phường Liễu Giai" }] },
            { name: "Quận Hoàn Kiếm", wards: [{ name: "Phường Hàng Bạc" }, { name: "Phường Hàng Bài" }, { name: "Phường Tràng Tiền" }] },
            { name: "Quận Cầu Giấy", wards: [{ name: "Phường Nghĩa Đô" }, { name: "Phường Quan Hoa" }, { name: "Phường Yên Hoà" }] }
        ]
    },
    {
        name: "Thành phố Hồ Chí Minh",
        districts: [
            { name: "Quận 1", wards: [{ name: "Phường Bến Nghé" }, { name: "Phường Bến Thành" }, { name: "Phường Đa Kao" }] },
            { name: "Quận 3", wards: [{ name: "Phường 1" }, { name: "Phường 2" }, { name: "Phường 3" }] },
            { name: "Thành phố Thủ Đức", wards: [{ name: "Phường Linh Trung" }, { name: "Phường Thảo Điền" }, { name: "Phường An Phú" }] }
        ]
    },
    {
        name: "Thành phố Đà Nẵng",
        districts: [
            { name: "Quận Hải Châu", wards: [{ name: "Phường Hải Châu I" }, { name: "Phường Hải Châu II" }] },
            { name: "Quận Sơn Trà", wards: [{ name: "Phường An Hải Bắc" }, { name: "Phường Phước Mỹ" }] }
        ]
    }
];
let userAddressData = [];

function normalizeAddressName(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getCachedAddressData() {
    try {
        const cached = JSON.parse(localStorage.getItem(USER_ADDRESS_CACHE_KEY) || "null");
        if (!cached?.data || !cached?.savedAt) return null;
        if (Date.now() - cached.savedAt > USER_ADDRESS_CACHE_MAX_AGE) return null;
        return cached.data;
    } catch (error) {
        return null;
    }
}

function saveCachedAddressData(data) {
    try {
        localStorage.setItem(USER_ADDRESS_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn("Không thể lưu cache địa chỉ:", error);
    }
}

async function loadVietnamAddressData() {
    const cached = getCachedAddressData();
    if (cached) {
        userAddressData = cached;
        return cached;
    }

    try {
        const response = await fetch(USER_ADDRESS_API_URL);
        if (!response.ok) throw new Error("Không thể tải danh sách tỉnh thành");
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("Dữ liệu tỉnh thành không hợp lệ");
        userAddressData = data;
        saveCachedAddressData(data);
        return data;
    } catch (error) {
        console.warn("Đang dùng dữ liệu địa chỉ dự phòng:", error);
        userAddressData = USER_FALLBACK_ADDRESS_DATA;
        return USER_FALLBACK_ADDRESS_DATA;
    }
}

function setSelectOptions(select, options, placeholder, selectedName = "") {
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        select.appendChild(option);
    });

    if (selectedName) {
        const selected = Array.from(select.options).find((option) => (
            normalizeAddressName(option.value) === normalizeAddressName(selectedName)
        ));

        if (selected) {
            select.value = selected.value;
        } else {
            const option = document.createElement("option");
            option.value = selectedName;
            option.textContent = selectedName;
            select.appendChild(option);
            select.value = selectedName;
        }
    }
}

function findProvince(name) {
    const normalized = normalizeAddressName(name);
    return userAddressData.find((province) => normalizeAddressName(province.name) === normalized);
}

function findDistrict(province, name) {
    const normalized = normalizeAddressName(name);
    return province?.districts?.find((district) => normalizeAddressName(district.name) === normalized);
}

function populateUserProvinceSelect(prefix, selectedProvince = "") {
    setSelectOptions(
        document.getElementById(`${prefix}-user-province`),
        userAddressData,
        "Chọn tỉnh / thành phố",
        selectedProvince
    );
}

function populateUserDistrictSelect(prefix, provinceName, selectedDistrict = "") {
    const districtSelect = document.getElementById(`${prefix}-user-district`);
    const province = findProvince(provinceName);
    const districts = province?.districts || [];

    setSelectOptions(districtSelect, districts, "Chọn quận / huyện", selectedDistrict);
    if (districtSelect) districtSelect.disabled = districts.length === 0;
}

function populateUserWardSelect(prefix, provinceName, districtName, selectedWard = "") {
    const wardSelect = document.getElementById(`${prefix}-user-ward`);
    const province = findProvince(provinceName);
    const district = findDistrict(province, districtName);
    const wards = district?.wards || [];

    setSelectOptions(wardSelect, wards, "Chọn phường / xã", selectedWard);
    if (wardSelect) wardSelect.disabled = wards.length === 0;
}

function parseAddress(addressString = "") {
    if (!addressString || addressString === "Chưa cập nhật") {
        return { street: "", ward: "", district: "", province: "" };
    }

    const parts = addressString.split(",").map((part) => part.trim()).filter(Boolean);
    const address = { street: "", ward: "", district: "", province: "" };

    if (parts.length >= 4) {
        address.province = parts[parts.length - 1];
        address.district = parts[parts.length - 2];
        address.ward = parts[parts.length - 3];
        address.street = parts.slice(0, parts.length - 3).join(", ");
    } else if (parts.length === 3) {
        address.province = parts[2];
        address.district = parts[1];
        address.street = parts[0];
    } else if (parts.length === 2) {
        address.province = parts[1];
        address.street = parts[0];
    } else {
        address.street = addressString;
    }

    return address;
}

function setSelectedUserAddress(prefix, address) {
    populateUserProvinceSelect(prefix, address.province);
    populateUserDistrictSelect(prefix, document.getElementById(`${prefix}-user-province`)?.value, address.district);
    populateUserWardSelect(
        prefix,
        document.getElementById(`${prefix}-user-province`)?.value,
        document.getElementById(`${prefix}-user-district`)?.value,
        address.ward
    );

    const streetInput = document.getElementById(`${prefix}-user-street`);
    if (streetInput) streetInput.value = address.street || "";
}

function resetUserAddressFields(prefix) {
    setSelectedUserAddress(prefix, { street: "", ward: "", district: "", province: "" });
    const districtSelect = document.getElementById(`${prefix}-user-district`);
    const wardSelect = document.getElementById(`${prefix}-user-ward`);
    if (districtSelect) districtSelect.disabled = true;
    if (wardSelect) wardSelect.disabled = true;
}

function getUserAddressPayload(prefix) {
    const street = document.getElementById(`${prefix}-user-street`)?.value.trim() || "";
    const ward = document.getElementById(`${prefix}-user-ward`)?.value.trim() || "";
    const district = document.getElementById(`${prefix}-user-district`)?.value.trim() || "";
    const province = document.getElementById(`${prefix}-user-province`)?.value.trim() || "";

    if (!street || !ward || !district || !province) {
        throw new Error("Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện, phường/xã và nhập địa chỉ chi tiết.");
    }

    return [street, ward, district, province].join(", ");
}

function bindUserAddressSelectors(prefix) {
    const provinceSelect = document.getElementById(`${prefix}-user-province`);
    const districtSelect = document.getElementById(`${prefix}-user-district`);
    const wardSelect = document.getElementById(`${prefix}-user-ward`);

    provinceSelect?.addEventListener("change", () => {
        populateUserDistrictSelect(prefix, provinceSelect.value);
        populateUserWardSelect(prefix, provinceSelect.value, "");
    });

    districtSelect?.addEventListener("change", () => {
        populateUserWardSelect(prefix, provinceSelect?.value, districtSelect.value);
    });

    if (districtSelect) districtSelect.disabled = true;
    if (wardSelect) wardSelect.disabled = true;
}

async function initUserAddressSelectors() {
    await loadVietnamAddressData();
    ["add", "edit"].forEach((prefix) => {
        populateUserProvinceSelect(prefix);
        bindUserAddressSelectors(prefix);
    });
}

async function loadUsers() {
    try {
        const response = await apiFetch("/api/users");
        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }
        const data = await parseApiResponse(response);
        users = Array.isArray(data) ? data : data.users || [];
        usersPagination = Array.isArray(data) ? { total: users.length } : data.pagination || { total: users.length };
        renderUsersTable(users);
        updatePaginationText(users.length, usersPagination.total);
        renderUserStats(Array.isArray(data) ? null : data.stats);
    } catch (error) {
        console.error("Không thể tải danh sách người dùng:", error);
        const tbody = document.querySelector(".users-table tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 28px; color: #ba1a1a;">Không thể tải dữ liệu: ${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

function renderUserStats(stats) {
    if (!stats) return;

    const values = document.querySelectorAll(".kpi-value");
    const trends = document.querySelectorAll(".kpi-trend");

    if (values.length >= 4) {
        values[0].textContent = stats.total || 0;
        values[1].textContent = stats.active || 0;
        values[2].textContent = stats.admin || 0;
        values[3].textContent = stats.customer || 0;
    }

    if (trends.length >= 4) {
        const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
        trends[1].textContent = `${activePercent}% Hoạt động`;
        trends[2].textContent = "Admin";
        trends[3].innerHTML = `<span class="material-symbols-outlined">person</span>${stats.customer || 0}`;
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
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-icon" title="Chi tiết" onclick="openDetailModal('${user._id}')">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="action-btn-icon" title="Sửa" onclick="openEditModal('${user._id}')">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="action-btn-icon delete" title="Xóa" onclick="openDeleteModal('${user._id}')">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = "block";
    }
}

function resetModalFields(modal) {
    modal.querySelectorAll("form").forEach((form) => form.reset());
    modal.querySelectorAll('input[type="hidden"]').forEach((input) => {
        input.value = "";
    });
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        resetModalFields(modal);
        if (id === "modal-user-delete") {
            const deleteName = document.getElementById("delete-user-name");
            if (deleteName) deleteName.textContent = "";
        }
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

async function getUser(id) {
    const cached = users.find((user) => user._id === id);
    if (cached) return cached;

    const response = await apiFetch(`/api/users/${id}`);
    return parseApiResponse(response);
}

async function openDetailModal(id) {
    try {
        const user = await getUser(id);
        const registeredDate = new Date(user.createdAt).toLocaleDateString("vi-VN", {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        document.getElementById("detail-user-name").textContent = user.fullName;
        document.getElementById("detail-user-email").textContent = user.email;
        document.getElementById("detail-user-phone").textContent = user.phone;
        document.getElementById("detail-user-role").textContent = user.role === "admin" ? "Quản trị viên" : "Khách hàng";
        document.getElementById("detail-user-address").textContent = user.address || "Chưa cập nhật";
        document.getElementById("detail-user-status").textContent = user.isActive ? "Đang hoạt động" : "Đã khóa";
        document.getElementById("detail-user-created").textContent = registeredDate;

        openModal("modal-user-detail");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function openEditModal(id) {
    try {
        const user = await getUser(id);

        document.getElementById("edit-user-id").value = user._id;
        document.getElementById("edit-user-name").value = user.fullName;
        document.getElementById("edit-user-email").value = user.email;
        document.getElementById("edit-user-password").value = "";
        document.getElementById("edit-user-phone").value = user.phone;
        document.getElementById("edit-user-role").value = user.role;
        setSelectedUserAddress("edit", parseAddress(user.address || ""));
        document.getElementById("edit-user-status").value = String(user.isActive);

        openModal("modal-user-edit");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function openDeleteModal(id) {
    const user = users.find((item) => item._id === id);

    document.getElementById("delete-user-id").value = id;
    document.getElementById("delete-user-name").textContent = user?.fullName || "này";

    openModal("modal-user-delete");
}

async function confirmUserDelete() {
    const id = document.getElementById("delete-user-id").value;

    try {
        const response = await apiFetch(`/api/users/${id}`, {
            method: "DELETE"
        });
        await parseApiResponse(response);

        closeModal("modal-user-delete");
        await loadUsers();
        showToast("Xóa người dùng thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleUserAdd(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const payload = {
            fullName: formData.get("fullName").trim(),
            email: formData.get("email").trim(),
            password: formData.get("password"),
            phone: formData.get("phone").trim(),
            address: getUserAddressPayload("add"),
            role: formData.get("role"),
            isActive: formData.get("isActive") === "true"
        };

        const response = await apiFetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        await parseApiResponse(response);

        closeModal("modal-user-add");
        form.reset();
        resetUserAddressFields("add");
        await loadUsers();
        showToast("Thêm người dùng mới thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleUserEdit(event) {
    event.preventDefault();
    const form = event.target;
    const id = document.getElementById("edit-user-id").value;
    const formData = new FormData(form);

    try {
        const payload = {
            fullName: formData.get("fullName").trim(),
            email: formData.get("email").trim(),
            phone: formData.get("phone").trim(),
            address: getUserAddressPayload("edit"),
            role: formData.get("role"),
            isActive: formData.get("isActive") === "true"
        };

        const newPassword = formData.get("password");
        if (newPassword && newPassword.trim() !== "") {
            payload.password = newPassword;
        }

        const response = await apiFetch(`/api/users/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        await parseApiResponse(response);

        closeModal("modal-user-edit");
        await loadUsers();
        showToast("Cập nhật người dùng thành công!", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function updatePaginationText(count, total = count) {
    const textEl = document.querySelector(".pagination-text");
    if (textEl) {
        const start = total === 0 ? 0 : 1;
        textEl.textContent = `Đang hiển thị ${start} đến ${count} trong số ${total} người dùng`;
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
    const [sidebarLoaded] = await Promise.all([
        loadLayout("sidebar-placeholder", "../layouts/sidebar.html"),
        loadLayout("footer-placeholder", "../layouts/footer.html"),
        initUserAddressSelectors()
    ]);

    if (sidebarLoaded) {
        window.initNavbarAuth?.();
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
