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

function initDashboard() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.nav-item');

    // Sidebar Collapse Logic
    if (toggleBtn && sidebar && content) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            content.classList.toggle('content-expanded');
            
            // Change icon based on state
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

    // Navigation Active State Logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => {
                l.classList.remove('active');
            });
            link.classList.add('active');
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
    // Nạp sidebar trước
    const loaded = await loadLayout("sidebar-placeholder", "../layouts/sidebar.html");
    if (loaded) {
        // Khởi tạo các sự kiện của dashboard sau khi sidebar đã được chèn vào DOM
        initDashboard();
    } else {
        // Hỗ trợ fade-in nếu việc load sidebar thất bại
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
