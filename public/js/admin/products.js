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

// In-memory products store for prototyping
let products = [];

function loadProductsFromTable() {
    products = [];
    const rows = document.querySelectorAll('.products-table tbody tr');
    rows.forEach((row, idx) => {
        const id = idx + 1;
        const name = row.querySelector('.product-name').textContent.trim();
        const code = row.querySelector('.product-code').textContent.trim();
        const category = row.querySelector('.category-tag').textContent.trim();
        const color = row.querySelector('.color-text').textContent.trim();
        const sizes = Array.from(row.querySelectorAll('.size-group .size-tag.size-active')).map(el => el.textContent.trim());
        const priceText = row.querySelector('.price-text').textContent.trim();
        
        // Deposit text is the second price-text in the row
        const priceElements = row.querySelectorAll('.price-text');
        const depositText = priceElements[1] ? priceElements[1].textContent.trim() : "0đ";
        
        const statusText = row.querySelector('.status-badge').textContent.trim();
        const img = row.querySelector('.product-img').src;

        // Custom descriptions based on the product
        let description = '';
        if (name.includes('Midnight Glamour')) {
            description = 'Đầm dạ hội lụa satin cao cấp thiết kế sang trọng pha chút cổ điển, đính pha lê lấp lánh phần ngực giúp tôn dáng và toát lên vẻ quý phái.';
        } else if (name.includes('Golden Ember')) {
            description = 'Đầm cocktail màu vàng lấp lánh cao cấp, thiết kế ôm dáng quyến rũ thích hợp cho các buổi tiệc tối sang trọng.';
        } else if (name.includes('Petal Whisper')) {
            description = 'Váy cưới xòe bồng bềnh ren hoa tay dài thanh lịch, phong cách công chúa lãng mạn tinh tế.';
        } else {
            description = 'Đầm nhung đen dáng dài cổ điển quý phái, chất liệu nhung mịn màng tôn lên nét quý phái tinh tế.';
        }

        products.push({
            id,
            name,
            code,
            category,
            color,
            sizes,
            rentalPrice: parseInt(priceText.replace(/\D/g, '')) || 0,
            deposit: parseInt(depositText.replace(/\D/g, '')) || 0,
            status: statusText.toLowerCase().includes('available') ? 'available' : 
                    statusText.toLowerCase().includes('rented') ? 'rented' : 
                    statusText.toLowerCase().includes('cleaning') ? 'maintenance' : 'outofstock',
            image: img,
            description
        });
    });
}

function formatCurrency(val) {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
}

function renderProductsTable() {
    const tbody = document.querySelector('.products-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const sizeTags = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => {
            const isActive = p.sizes.includes(sz);
            return `<span class="size-tag ${isActive ? 'size-active' : ''}">${sz}</span>`;
        }).join('');

        let statusClass = '';
        let statusLabel = '';
        if (p.status === 'available') {
            statusClass = 'badge-available';
            statusLabel = 'Available';
        } else if (p.status === 'rented') {
            statusClass = 'badge-rented';
            statusLabel = 'Rented';
        } else if (p.status === 'maintenance') {
            statusClass = 'badge-cleaning';
            statusLabel = 'Cleaning';
        } else {
            statusClass = 'badge-outofstock';
            statusLabel = 'Out of Stock';
        }

        const isPulse = p.status === 'maintenance' ? 'badge-pulse' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <div class="product-img-wrapper">
                        <img class="product-img" src="${p.image || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150'}" alt="${p.name}"/>
                    </div>
                    <div class="product-info">
                        <p class="product-name">${p.name}</p>
                        <p class="product-code">${p.code}</p>
                    </div>
                </div>
            </td>
            <td><span class="category-tag">${p.category}</span></td>
            <td><span class="color-text" style="color: #4d4635;">${p.color}</span></td>
            <td>
                <div class="size-group">
                    ${sizeTags}
                </div>
            </td>
            <td><span class="price-text">${formatCurrency(p.rentalPrice)}</span></td>
            <td><span class="price-text" style="font-weight: normal; color: #5f5e5e;">${formatCurrency(p.deposit)}</span></td>
            <td>
                <span class="status-badge ${statusClass}">
                    <span class="badge-dot ${isPulse}"></span>
                    ${statusLabel}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-icon" title="Xem chi tiết" onclick="openDetailModal(${p.id})">
                        <span class="material-symbols-outlined">visibility</span>
                    </button>
                    <button class="action-btn-icon" title="Chỉnh sửa" onclick="openEditModal(${p.id})">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="action-btn-icon btn-delete" title="Xóa" onclick="openDeleteModal(${p.id})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal open/close helpers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Detail View Modal Populate
function openDetailModal(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    document.getElementById('detail-product-img').src = p.image;
    document.getElementById('detail-product-name').textContent = p.name;
    document.getElementById('detail-product-code').textContent = p.code;
    document.getElementById('detail-product-category').textContent = p.category;
    document.getElementById('detail-product-color').textContent = p.color;
    document.getElementById('detail-product-sizes').textContent = p.sizes.join(', ') || 'Trống';
    document.getElementById('detail-product-price').textContent = formatCurrency(p.rentalPrice);
    document.getElementById('detail-product-deposit').textContent = formatCurrency(p.deposit);
    
    let statusText = 'Available';
    if (p.status === 'rented') statusText = 'Rented';
    else if (p.status === 'maintenance') statusText = 'Cleaning';
    else if (p.status === 'outofstock') statusText = 'Out of Stock';
    document.getElementById('detail-product-status').textContent = statusText;
    
    document.getElementById('detail-product-description').textContent = p.description;
    
    openModal('modal-product-detail');
}

// Edit Modal Populate
function openEditModal(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    document.getElementById('edit-product-id').value = p.id;
    document.getElementById('edit-product-name').value = p.name;
    document.getElementById('edit-product-description').value = p.description;
    document.getElementById('edit-product-category').value = p.category;
    document.getElementById('edit-product-color').value = p.color;
    
    // Set size checkboxes
    const form = document.getElementById('form-product-edit');
    form.querySelectorAll('input[name="sizes"]').forEach(cb => {
        cb.checked = p.sizes.includes(cb.value);
    });
    
    document.getElementById('edit-product-price').value = p.rentalPrice;
    document.getElementById('edit-product-deposit').value = p.deposit;
    document.getElementById('edit-product-status').value = p.status;
    document.getElementById('edit-product-image').value = p.image;
    
    openModal('modal-product-edit');
}

// Delete Modal Populate
function openDeleteModal(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    document.getElementById('delete-product-id').value = p.id;
    document.getElementById('delete-product-name').textContent = p.name;
    
    openModal('modal-product-delete');
}

// Confirm Delete function
function confirmProductDelete() {
    const id = parseInt(document.getElementById('delete-product-id').value);
    products = products.filter(p => p.id !== id);
    
    renderProductsTable();
    closeModal('modal-product-delete');
}

// Handle Add Product Submit
function handleProductAdd(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const name = formData.get('name');
    const description = formData.get('description');
    const category = formData.get('category');
    const color = formData.get('color');
    const rentalPrice = parseInt(formData.get('rentalPrice')) || 0;
    const deposit = parseInt(formData.get('deposit')) || 0;
    const status = formData.get('status');
    const image = formData.get('image') || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150';
    
    const sizes = [];
    form.querySelectorAll('input[name="sizes"]:checked').forEach(cb => {
        sizes.push(cb.value);
    });
    
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const code = `#RC-${88000 + newId}`;
    
    products.push({
        id: newId,
        name,
        code,
        category,
        color,
        sizes,
        rentalPrice,
        deposit,
        status,
        image,
        description
    });
    
    renderProductsTable();
    closeModal('modal-product-add');
    form.reset();
}

// Handle Edit Product Submit
function handleProductEdit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const id = parseInt(formData.get('id'));
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    p.name = formData.get('name');
    p.description = formData.get('description');
    p.category = formData.get('category');
    p.color = formData.get('color');
    p.rentalPrice = parseInt(formData.get('rentalPrice')) || 0;
    p.deposit = parseInt(formData.get('deposit')) || 0;
    p.status = formData.get('status');
    p.image = formData.get('image') || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150';
    
    const sizes = [];
    form.querySelectorAll('input[name="sizes"]:checked').forEach(cb => {
        sizes.push(cb.value);
    });
    p.sizes = sizes;
    
    renderProductsTable();
    closeModal('modal-product-edit');
}

function initProductsPage() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.nav-item');

    if (toggleBtn && sidebar && content) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('sidebar-open');
            } else {
                sidebar.classList.toggle('sidebar-collapsed');
                content.classList.toggle('content-expanded');
            }
            
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

    if (navLinks.length > 1) {
        navLinks.forEach(link => link.classList.remove('active'));
        navLinks[1].classList.add('active');
    }

    // Load static content into data store and render dynamically
    loadProductsFromTable();
    renderProductsTable();

    // Bind Add Product Button click to open Add Modal
    const addBtn = document.querySelector('.btn-add');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openModal('modal-product-add');
        });
    }

    // Close Modals when clicking on overlay background
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in-out';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const loaded = await loadLayout("sidebar-placeholder", "../layouts/sidebar.html");
    if (loaded) {
        initProductsPage();
    } else {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
