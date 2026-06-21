function getNavbarUserInitials(name = "") {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "U";
}

function escapeNavbarHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderNavbarLogin(authSlot) {
  authSlot.innerHTML = `
    <a href="/views/login.html" class="btn btn-primary btn-small">
      Đăng nhập
    </a>
  `;
}

function renderNavbarUser(authSlot, user) {
  const name = user.fullName || user.email || "Tài khoản";
  const profileHref = user.role === "admin" ? "/views/admin/dashboard.html" : "/views/user/homepage.html";
  const roleLabel = user.role === "admin" ? "Quản trị viên" : "Thành viên";

  authSlot.innerHTML = `
    <a class="navbar-user" href="${profileHref}" aria-label="Tài khoản ${escapeNavbarHtml(name)}">
      <span class="navbar-avatar">${escapeNavbarHtml(getNavbarUserInitials(name))}</span>
      <span class="navbar-user-meta">
        <strong>${escapeNavbarHtml(name)}</strong>
        <small>${roleLabel}</small>
      </span>
    </a>
  `;
}

async function initNavbarAuth() {
  const authSlot = document.querySelector("[data-navbar-auth]");

  if (!authSlot) return;

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include"
    });
    const result = await response.json();

    if (!response.ok || !result.success || !result.data?.user) {
      renderNavbarLogin(authSlot);
      return;
    }

    renderNavbarUser(authSlot, result.data.user);
  } catch (error) {
    renderNavbarLogin(authSlot);
  }
}

window.initNavbarAuth = initNavbarAuth;

async function initNavbarCategories() {
  const menu = document.getElementById("navbar-categories-menu");
  if (!menu) return;

  try {
    const response = await fetch("/api/categories");
    const result = await response.json();
    if (result.success && result.data && result.data.length > 0) {
      // Keep "Tất Cả" and append others
      menu.innerHTML = '<a href="/views/user/collections.html" class="dropdown-item">Tất Cả</a>';
      
      result.data.forEach(category => {
        const item = document.createElement("a");
        item.href = `/views/user/collections.html?category=${category._id || category.name}`;
        item.className = "dropdown-item";
        item.innerHTML = `${escapeNavbarHtml(category.name)}`;
        menu.appendChild(item);
      });
    }
  } catch (error) {
    console.error("Failed to load categories for navbar:", error);
  }
}

window.initNavbarCategories = initNavbarCategories;

function updateNavbarCartBadge() {
  const badge = document.getElementById("navbar-cart-badge");
  if (!badge) return;

  try {
    const cart = JSON.parse(localStorage.getItem("rosette_cart") || "[]");
    const count = cart.reduce((total, item) => total + (Number(item.quantity) || 1), 0);

    if (count > 0) {
      badge.textContent = count;
      badge.hidden = false;
      badge.style.display = "flex";
    } else {
      badge.hidden = true;
      badge.style.display = "none";
    }
  } catch (error) {
    console.error("Error reading cart for navbar badge:", error);
    badge.hidden = true;
    badge.style.display = "none";
  }
}

function initNavbarCart() {
  updateNavbarCartBadge();
  document.addEventListener("rosette:cart-updated", updateNavbarCartBadge);
}

window.initNavbarCart = initNavbarCart;

// Hook initNavbarCart into the general navbar initialization
const originalInitNavbarAuth = window.initNavbarAuth;
window.initNavbarAuth = async function() {
  if (originalInitNavbarAuth) {
    await originalInitNavbarAuth();
  }
  initNavbarCart();
};
