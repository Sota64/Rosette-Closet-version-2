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
