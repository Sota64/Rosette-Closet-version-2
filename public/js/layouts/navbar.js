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
  authSlot.classList.remove("navbar-auth-menu-open");
}

function renderNavbarUser(authSlot, user) {
  const name = user.fullName || user.email || "Tài khoản";
  const roleLabel = user.role === "admin" ? "Quản trị viên" : "Thành viên";
  const adminItem = user.role === "admin"
    ? '<a class="navbar-auth-dropdown-item" href="/views/admin/dashboard.html"><span class="material-symbols-outlined">dashboard</span>Trang quản trị</a>'
    : "";

  authSlot.innerHTML = `
    <button class="navbar-user" type="button" aria-label="Mở menu tài khoản ${escapeNavbarHtml(name)}" aria-expanded="false" data-navbar-auth-toggle>
      <span class="navbar-avatar">${escapeNavbarHtml(getNavbarUserInitials(name))}</span>
      <span class="navbar-user-meta">
        <strong>${escapeNavbarHtml(name)}</strong>
        <small>${roleLabel}</small>
      </span>
      <span class="material-symbols-outlined navbar-auth-chevron">expand_more</span>
    </button>
    <div class="navbar-auth-dropdown" role="menu">
      ${adminItem}
      <a class="navbar-auth-dropdown-item" href="/views/user/account.html"><span class="material-symbols-outlined">person</span>Thông tin tài khoản</a>
      <a class="navbar-auth-dropdown-item" href="/views/user/orders.html"><span class="material-symbols-outlined">receipt_long</span>Đơn hàng của tôi</a>
      <button class="navbar-auth-dropdown-item navbar-auth-logout" type="button" data-navbar-logout><span class="material-symbols-outlined">logout</span>Đăng xuất</button>
    </div>
  `;

  initNavbarAuthDropdown(authSlot);
}

function closeNavbarAuthDropdown(authSlot) {
  const toggle = authSlot.querySelector("[data-navbar-auth-toggle]");
  authSlot.classList.remove("navbar-auth-menu-open");
  toggle?.setAttribute("aria-expanded", "false");
}

function closeAllNavbarAuthDropdowns() {
  document.querySelectorAll(".navbar-auth-menu-open").forEach((authSlot) => {
    closeNavbarAuthDropdown(authSlot);
  });
}

function toggleNavbarAuthDropdown(authSlot) {
  const toggle = authSlot.querySelector("[data-navbar-auth-toggle]");
  const shouldOpen = !authSlot.classList.contains("navbar-auth-menu-open");
  authSlot.classList.toggle("navbar-auth-menu-open", shouldOpen);
  toggle?.setAttribute("aria-expanded", String(shouldOpen));
}

async function handleNavbarLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error("Không thể đăng xuất:", error);
  } finally {
    window.location.href = "/views/login.html";
  }
}

function initNavbarAuthDropdown(authSlot) {
  const toggle = authSlot.querySelector("[data-navbar-auth-toggle]");
  const logoutButton = authSlot.querySelector("[data-navbar-logout]");

  toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNavbarAuthDropdown(authSlot);
  });

  logoutButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleNavbarLogout();
  });

  if (window.__rosetteNavbarAuthEventsBound) return;
  window.__rosetteNavbarAuthEventsBound = true;

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-navbar-auth]")) {
      closeAllNavbarAuthDropdowns();
    }
  });
  
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllNavbarAuthDropdowns();
    }
  });
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
    const count = Array.isArray(cart) ? cart.length : 0;

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

const ROSETTE_CHATBOT_API_URL = "/api/chatbot";

function ensureRosetteChatbotStyles() {
  if (document.querySelector('link[href="/public/css/layouts/chatbot.css"]')) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/public/css/layouts/chatbot.css";
  document.head.appendChild(link);
}

function extractRosetteChatbotAnswer(payload) {
  if (typeof payload === "string") return payload;

  const candidates = [
    payload?.data?.answer,
    payload?.data?.message,
    payload?.data?.reply,
    payload?.data?.response,
    payload?.data?.content,
    payload?.answer,
    payload?.reply,
    payload?.response,
    payload?.content,
    payload?.message
  ];

  const answer = candidates.find((item) => typeof item === "string" && item.trim());
  return answer || "Mình đã nhận phản hồi nhưng chưa đọc được nội dung trả lời.";
}

function appendRosetteChatbotMessage(messages, text, role = "bot") {
  const message = document.createElement("div");
  message.className = `chatbot-message ${role}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

function setRosetteChatbotOpen(widget, isOpen) {
  const launcher = widget.querySelector(".chatbot-launcher");
  const input = widget.querySelector(".chatbot-input");

  widget.classList.toggle("is-open", isOpen);
  launcher?.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    setTimeout(() => input?.focus(), 120);
  }
}

function renderRosetteChatbotWidget() {
  if (document.querySelector("[data-rosette-chatbot]")) return;

  ensureRosetteChatbotStyles();

  const widget = document.createElement("div");
  widget.className = "chatbot-widget";
  widget.dataset.rosetteChatbot = "true";
  widget.innerHTML = `
    <section class="chatbot-panel" aria-label="Chatbot Rosette Closet">
      <div class="chatbot-header">
        <div class="chatbot-title">
          <span class="chatbot-title-icon" aria-hidden="true">
            <span class="material-symbols-outlined">support_agent</span>
          </span>
          <div>
            <strong>Rosette Assistant</strong>
            <span>Hỗ trợ tư vấn nhanh</span>
          </div>
        </div>
        <button class="chatbot-close" type="button" aria-label="Đóng chatbot">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="chatbot-messages" aria-live="polite">
        <div class="chatbot-message bot">Xin chào, mình có thể hỗ trợ gì cho bạn?</div>
      </div>
      <form class="chatbot-form">
        <textarea class="chatbot-input" rows="1" placeholder="Nhập câu hỏi..." aria-label="Nhập câu hỏi chatbot"></textarea>
        <button class="chatbot-send" type="submit" aria-label="Gửi câu hỏi">
          <span class="material-symbols-outlined">send</span>
        </button>
      </form>
    </section>
    <button class="chatbot-launcher" type="button" aria-label="Mở chatbot" aria-expanded="false">
      <span class="material-symbols-outlined">support_agent</span>
      <span class="chatbot-launcher-dot" aria-hidden="true"></span>
    </button>
  `;

  document.body.appendChild(widget);

  const launcher = widget.querySelector(".chatbot-launcher");
  const closeButton = widget.querySelector(".chatbot-close");
  const form = widget.querySelector(".chatbot-form");
  const input = widget.querySelector(".chatbot-input");
  const sendButton = widget.querySelector(".chatbot-send");
  const messages = widget.querySelector(".chatbot-messages");

  launcher?.addEventListener("click", () => {
    setRosetteChatbotOpen(widget, !widget.classList.contains("is-open"));
  });

  closeButton?.addEventListener("click", () => {
    setRosetteChatbotOpen(widget, false);
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form?.requestSubmit();
    }
  });

  input?.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = input.value.trim();
    if (!question) return;

    appendRosetteChatbotMessage(messages, question, "user");
    input.value = "";
    input.style.height = "auto";
    input.disabled = true;
    sendButton.disabled = true;

    const loadingMessage = appendRosetteChatbotMessage(messages, "Đang trả lời...", "bot loading");

    try {
      const response = await fetch(ROSETTE_CHATBOT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });
      const responseText = await response.text();
      let result = responseText;

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        result = responseText;
      }

      if (!response.ok) {
        throw new Error(result?.message || "Chatbot chưa thể trả lời lúc này.");
      }

      loadingMessage.className = "chatbot-message bot";
      loadingMessage.textContent = extractRosetteChatbotAnswer(result);
    } catch (error) {
      loadingMessage.className = "chatbot-message bot";
      loadingMessage.textContent = error.message || "Không thể kết nối tới chatbot.";
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setRosetteChatbotOpen(widget, false);
    }
  });
}

function initRosetteChatbot() {
  if (window.__rosetteChatbotInitialized) return;
  window.__rosetteChatbotInitialized = true;
  renderRosetteChatbotWidget();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRosetteChatbot);
} else {
  initRosetteChatbot();
}
