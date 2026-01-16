import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8081/api",
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

    // ✅ Don't redirect for auth endpoints
    if (!isPublicEndpoint(url) && (status === 401 || status === 403)) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
export { api }; // ✅ important for compatibility
