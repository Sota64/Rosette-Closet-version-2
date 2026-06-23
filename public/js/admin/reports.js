let reportData = {
    stats: {
        totalRevenue: 0,
        avgOrder: 0,
        maxOrder: 0,
        minOrder: 0,
        count: 0
    },
    statsByDay: [],
    statsByMonth: [],
    statsByYear: []
};

let activeTab = 'day'; // 'day', 'month', 'year'
let filterStart = null;
let filterEnd = null;

let chartInstance = null;

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

function initReportsPage() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.nav-item');
    const canvas = document.querySelector('.canvas-container');

    // Sidebar Collapse / Toggle Logic
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('sidebar-open');
            } else {
                sidebar.classList.toggle('sidebar-collapsed');
                if (content) content.classList.toggle('content-expanded');
                if (canvas) canvas.classList.toggle('canvas-expanded');
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

    // Set Active Item for Reports (index 4)
    if (navLinks.length > 4) {
        navLinks.forEach(link => link.classList.remove('active'));
        navLinks[4].classList.add('active');
    }

    // Micro-interactions for buttons
    document.querySelectorAll('button, .btn, .nav-item, .table-tab').forEach(el => {
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

    // Page fade-in
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in-out';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });

    // Fetch reports
    fetchStats();
}

async function fetchStats() {
    try {
        const response = await apiFetch("/api/orders/reports/stats");
        if (response.status === 401) {
            window.location.href = "/views/login.html";
            return;
        }
        const data = await parseApiResponse(response);
        reportData = data;

        renderKPIs();
        renderTabContent();
        showToast("Tải dữ liệu thống kê thành công!", "success");
    } catch (error) {
        console.error("Không thể tải báo cáo thống kê:", error);
        showToast("Không thể tải báo cáo: " + error.message, "error");
        
        const tbody = document.querySelector(".reports-table tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 28px; color: #ba1a1a;">Không thể nạp dữ liệu: ${escapeHtml(error.message)}</td></tr>`;
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

function renderKPIs() {
    const stats = reportData.stats || {};
    document.getElementById("stat-total-revenue").textContent = formatCurrency(stats.totalRevenue || 0);
    document.getElementById("stat-avg-value").textContent = formatCurrency(stats.avgOrder || 0);
    document.getElementById("stat-max-value").textContent = formatCurrency(stats.maxOrder || 0);
    document.getElementById("stat-min-value").textContent = formatCurrency(stats.minOrder || 0);
}

function getActiveData() {
    let sourceData = [];
    if (activeTab === 'day') {
        sourceData = [...reportData.statsByDay];
    } else if (activeTab === 'month') {
        sourceData = [...reportData.statsByMonth];
    } else if (activeTab === 'year') {
        sourceData = [...reportData.statsByYear];
    }

    // Apply date range filter if present
    if (filterStart || filterEnd) {
        sourceData = sourceData.filter(item => {
            const dateStr = item._id; // YYYY-MM-DD, YYYY-MM, or YYYY
            let itemTime;
            
            if (activeTab === 'year') {
                itemTime = new Date(`${dateStr}-01-01`).getTime();
            } else if (activeTab === 'month') {
                itemTime = new Date(`${dateStr}-01`).getTime();
            } else {
                itemTime = new Date(dateStr).getTime();
            }

            if (filterStart) {
                const startLimit = new Date(filterStart).getTime();
                if (itemTime < startLimit) return false;
            }
            if (filterEnd) {
                const endLimit = new Date(filterEnd).getTime();
                if (itemTime > endLimit) return false;
            }
            return true;
        });
    }

    // Sort chronologically for chart but reverse chronological for table
    return sourceData;
}

function renderTabContent() {
    const data = getActiveData();
    const tbody = document.querySelector(".reports-table tbody");
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 28px; color: #7a7979;">Không có dữ liệu trong khoảng thời gian này</td></tr>`;
        renderChart([]);
        return;
    }

    // Table needs newest first
    const tableData = [...data].sort((a, b) => b._id.localeCompare(a._id));

    tbody.innerHTML = tableData.map(item => {
        let periodName = item._id;
        if (activeTab === 'day') {
            periodName = new Date(item._id).toLocaleDateString("vi-VN", {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } else if (activeTab === 'month') {
            const [y, m] = item._id.split("-");
            periodName = `Tháng ${m}/${y}`;
        } else {
            periodName = `Năm ${item._id}`;
        }

        return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(periodName)}</td>
                <td class="text-center" style="font-family: 'Be Vietnam Pro', sans-serif;">${item.count}</td>
                <td class="text-right" style="color: #735c00; font-weight: 600;">${formatCurrency(item.totalRevenue)}</td>
                <td class="text-right">${formatCurrency(item.avgOrder)}</td>
                <td class="text-right" style="color: #047857; font-weight: 500;">${formatCurrency(item.maxOrder)}</td>
                <td class="text-right" style="color: #ba1a1a;">${formatCurrency(item.minOrder)}</td>
            </tr>
        `;
    }).join("");

    // Chart needs oldest first to plot left-to-right
    const chartData = [...data].sort((a, b) => a._id.localeCompare(b._id));
    renderChart(chartData);
}

function switchReportTab(tab) {
    activeTab = tab;

    // Update active tab styles
    const tabs = document.querySelectorAll(".table-tab");
    tabs.forEach(btn => {
        btn.classList.remove("tab-active");
        if (btn.textContent.includes(tab === 'day' ? 'ngày' : tab === 'month' ? 'tháng' : 'năm')) {
            btn.classList.add("tab-active");
        }
    });

    renderTabContent();
}

function applyDateRangeFilter() {
    const startVal = document.getElementById("filter-start-date").value;
    const endVal = document.getElementById("filter-end-date").value;

    filterStart = startVal ? startVal : null;
    filterEnd = endVal ? endVal : null;

    renderTabContent();
}

function clearDateFilter() {
    document.getElementById("filter-start-date").value = "";
    document.getElementById("filter-end-date").value = "";
    filterStart = null;
    filterEnd = null;

    renderTabContent();
}

function renderChart(data) {
    const canvas = document.getElementById("revenue-trend-chart");
    if (!canvas) return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (data.length === 0) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px 'Be Vietnam Pro'";
        ctx.fillStyle = "#7f7663";
        ctx.textAlign = "center";
        ctx.fillText("Không có dữ liệu biểu diễn", canvas.width / 2, canvas.height / 2);
        return;
    }

    // Prepare labels and values
    const labels = data.map(d => {
        if (activeTab === 'day') {
            return new Date(d._id).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (activeTab === 'month') {
            const parts = d._id.split("-");
            return `${parts[1]}/${parts[0]}`;
        }
        return d._id;
    });

    const revenues = data.map(d => d.totalRevenue);

    const ctx = canvas.getContext("2d");

    // Create a smooth gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, "rgba(115, 92, 0, 0.4)");
    gradient.addColorStop(1, "rgba(115, 92, 0, 0.0)");

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu',
                data: revenues,
                borderColor: '#735c00',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#735c00',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#1d1912',
                    bodyColor: '#1d1912',
                    borderColor: '#f2eae0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let value = context.parsed.y;
                            return "Doanh thu: " + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            family: "'Be Vietnam Pro', sans-serif",
                            size: 11
                        },
                        color: '#7f7663'
                    }
                },
                y: {
                    grid: {
                        color: '#f2eae0',
                        drawBorder: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        font: {
                            family: "'Be Vietnam Pro', sans-serif",
                            size: 11
                        },
                        color: '#7f7663',
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000) + 'Tr';
                            } else if (value >= 1000) {
                                return (value / 1000) + 'k';
                            }
                            return value;
                        }
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function exportReportData() {
    const data = getActiveData();
    if (data.length === 0) {
        showToast("Không có dữ liệu để xuất báo cáo!", "error");
        return;
    }

    // Convert data to CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Thoi gian,So luong don,Tong gia tri (VND),Gia tri trung binh (VND),Gia tri lon nhat (VND),Gia tri nho nhat (VND)\n";

    data.forEach(item => {
        csvContent += `"${item._id}",${item.count},${item.totalRevenue},${item.avgOrder},${item.maxOrder},${item.minOrder}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_thong_ke_${activeTab}_RosetteCloset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Xuất báo cáo CSV thành công!", "success");
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatCompactCurrency(value) {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}T ₫`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}Tr ₫`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K ₫`;
    }
    return formatCurrency(value);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

document.addEventListener("DOMContentLoaded", async () => {
    const [sidebarLoaded] = await Promise.all([
        loadLayout("sidebar-placeholder", "../layouts/sidebar.html"),
        loadLayout("footer-placeholder", "../layouts/footer.html")
    ]);

    if (sidebarLoaded) {
        window.initNavbarAuth?.();
        initReportsPage();
    } else {
        // Fallback fade-in if sidebar fails
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.8s ease-in-out';
        requestAnimationFrame(() => {
            document.body.style.opacity = '1';
        });
    }
});
