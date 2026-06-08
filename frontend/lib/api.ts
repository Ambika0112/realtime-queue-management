const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  // We can add custom options here later if needed
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  // 1. Get the token from localStorage
  // Note: localStorage only exists in the browser, not on the server!
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // 2. Set up the headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 3. Attach the token if we have one
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 4. Make the actual request
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 5. Handle global errors (like expired tokens)
  if (response.status === 401) {
    // If we get a 401, the token is dead. Clear it.
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      // Optional: force a reload or redirect to login here
      // window.location.href = "/login";
    }
  }

  // 6. Return the raw response so the component can parse it
  return response;
}
