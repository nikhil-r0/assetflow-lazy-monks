import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject mock headers for local testing when token is not present
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
});
