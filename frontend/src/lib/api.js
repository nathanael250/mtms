const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function apiFetch(
  endpoint,
  { method = "GET", body, token, headers = {} } = {}
) {
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  return parseResponse(response);
}

export { API_BASE_URL };

