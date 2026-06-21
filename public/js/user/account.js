async function loadLayout(placeholderId, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    document.getElementById(placeholderId).outerHTML = html;

    if (placeholderId === "navbar-placeholder") {
      window.initNavbarAuth?.();
      window.initNavbarCategories?.();
    }
  } catch (error) {
    console.error(`Không thể nạp layout từ ${url}:`, error);
  }
}

function setAccountMessage(message, isError = false) {
  const element = document.getElementById("account-message");
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#9f1d1d" : "#735c00";
}

async function loadAccount() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  const result = await response.json();

  if (!response.ok || !result.success || !result.data?.user) {
    window.location.href = "/views/login.html";
    return;
  }

  const user = result.data.user;
  document.getElementById("account-full-name").value = user.fullName || "";
  document.getElementById("account-email").value = user.email || "";
  document.getElementById("account-phone").value = user.phone || "";
  document.getElementById("account-address").value = user.address || "";
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  setAccountMessage("Đang lưu...");

  const formData = new FormData(event.currentTarget);
  const payload = {
    fullName: formData.get("fullName")?.trim() || "",
    phone: formData.get("phone")?.trim() || "",
    address: formData.get("address")?.trim() || ""
  };

  try {
    const response = await fetch("/api/users/profile/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Không thể cập nhật thông tin.");
    }

    setAccountMessage("Đã lưu thông tin tài khoản.");
    window.initNavbarAuth?.();
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  document.getElementById("account-form")?.addEventListener("submit", handleAccountSubmit);
  loadAccount();
});
