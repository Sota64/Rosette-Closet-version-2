async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const requestOptions = {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    credentials: "include"
  };

  let response = await fetch(url, requestOptions);

  if (response.status === 401 && url !== "/api/auth/refresh") {
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include"
    });

    if (refreshResponse.ok) {
      response = await fetch(url, requestOptions);
    }
  }

  return response;
}
