import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10초 타임아웃
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 개발 환경에서 요청 로깅
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 API Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 자동 에러 처리
api.interceptors.response.use(
  (response) => {
    // 개발 환경에서 응답 로깅
    if (process.env.NODE_ENV === "development") {
      console.log("✅ API Response:", {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    // 토큰 만료 처리
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // 네트워크 에러 처리
    if (!error.response) {
      console.error("❌ Network Error: 서버에 연결할 수 없습니다.");
      // 사용자에게 알림 (토스트 등)
    }

    // 서버 에러 처리
    if (error.response?.status >= 500) {
      console.error("❌ Server Error:", error.response.data);
      // 사용자에게 알림
    }

    console.error("❌ API Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    return Promise.reject(error);
  }
);

// API 헬퍼 함수들
export const apiHelpers = {
  // 페이지 관련
  pages: {
    getAll: () => api.get("/pages"),
    getById: (id: string) => api.get(`/pages/${id}`),
    create: (data: any) => api.post("/pages", data),
    update: (id: string, data: any) => api.put(`/pages/${id}`, data),
    delete: (id: string) => api.delete(`/pages/${id}`),
    share: (id: string) => api.post(`/pages/${id}/share`),
  },

  // 블록 관련
  blocks: {
    create: (pageId: string, data: any) =>
      api.post(`/pages/${pageId}/blocks`, data),
    update: (pageId: string, blockId: string, data: any) =>
      api.put(`/pages/${pageId}/blocks/${blockId}`, data),
    delete: (pageId: string, blockId: string) =>
      api.delete(`/pages/${pageId}/blocks/${blockId}`),
  },

  // 인증 관련
  auth: {
    login: (data: any) => api.post("/auth/login", data),
    register: (data: any) => api.post("/auth/register", data),
    getMe: () => api.get("/auth/me"),
  },
};
