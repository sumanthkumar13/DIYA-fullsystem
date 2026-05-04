import axios from "axios";

// const api = axios.create({
//   // baseURL: "http://localhost:8081/api", // local development URL
//   // baseURL: "https://diya-fullsystem.onrender.com/api", // render.com URL
//   baseURL: "/api" // GCP 
// });
console.log("Vite is hitting this API URL:", import.meta.env.VITE_API_BASE_URL);
const api = axios.create({
  // Vite automatically picks the right URL based on the environment
  baseURL: import.meta.env.VITE_API_BASE_URL 
});

/** ✅ Never attach token for these endpoints */
const PUBLIC_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/register-retailer",
  "/auth/send-otp",
  "/auth/verify-otp",
];

const isPublicEndpoint = (url: string) =>
  PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));

api.interceptors.request.use(
  (config) => {
    const url = config.url || "";

    // ✅ Do not send token for auth/public endpoints
    if (isPublicEndpoint(url)) return config;

    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // ✅ Only redirect to login for actual authentication failures (expired/invalid token).
    // IMPORTANT: Do NOT logout on 403. 403 means "authenticated but not authorized" and should be handled in-page.
    if (!isPublicEndpoint(url) && status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
export { api }; // ✅ important for compatibility
