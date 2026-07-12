import axios from "axios";

export const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // JWT authentication
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Mock headers for local development/testing
    const mockUserId = localStorage.getItem("mock-user-id");
    const mockUserRole = localStorage.getItem("mock-user-role");
    const mockUserDeptId = localStorage.getItem("mock-user-dept-id");

    if (mockUserId && mockUserRole) {
      config.headers["x-user-id"] = mockUserId;
      config.headers["x-user-role"] = mockUserRole;

      if (mockUserDeptId) {
        config.headers["x-user-dept-id"] = mockUserDeptId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      // Uncomment once authentication flow is implemented
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);