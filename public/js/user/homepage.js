async function loadLayout(placeholderId, url) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(placeholderId).outerHTML = html;
      } catch (error) {
        console.error(`Không thể nạp layout từ ${url}:`, error);
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      loadLayout("navbar-placeholder", "../layouts/navbar.html");
      loadLayout("footer-placeholder", "../layouts/footer.html");
    });