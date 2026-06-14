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
