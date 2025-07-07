import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
    // MongoDB _id를 id로 변환하는 헬퍼 함수
    const convertMongoId = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(convertMongoId);
      } else if (obj && typeof obj === "object") {
        const converted = { ...obj };
        if (converted._id) {
          converted.id = converted._id;
        }
        // 중첩된 객체들도 변환
        Object.keys(converted).forEach((key) => {
          if (typeof converted[key] === "object" && converted[key] !== null) {
            converted[key] = convertMongoId(converted[key]);
          }
        });
        return converted;
      }
      return obj;
    };

    // 응답 데이터에서 _id를 id로 변환
    if (response.data) {
      response.data = convertMongoId(response.data);
    }

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
    // 토큰 만료 처리 - 로그인/회원가입 페이지가 아닐 때만 리디렉션
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      // 현재 경로가 로그인/회원가입 페이지가 아닐 때만 리디렉션
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    if (!error.response) {
      console.error("❌ Network Error: 서버에 연결할 수 없습니다.");
    }

    if (error.response?.status >= 500) {
      console.error("❌ Server Error:", error.response.data);
    }

    console.error("❌ API Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    return Promise.reject(error);
  }
);

export const apiHelpers = {
  pages: {
    getAll: () => api.get("/pages"),
    getById: (id: string) => api.get(`/pages/${id}`),
    create: (data: any) => api.post("/pages", data),
    update: (id: string, data: any) => api.put(`/pages/${id}`, data),
    delete: (id: string) => api.delete(`/pages/${id}`),
    share: (id: string) => api.post(`/pages/${id}/share`),
  },

  blocks: {
    create: (pageId: string, data: any) =>
      api.post(`/pages/${pageId}/blocks`, data),
    update: (pageId: string, blockId: string, data: any) =>
      api.put(`/pages/${pageId}/blocks/${blockId}`, data),
    delete: (pageId: string, blockId: string) =>
      api.delete(`/pages/${pageId}/blocks/${blockId}`),
  },

  auth: {
    login: (data: any) => api.post("/auth/login", data),
    register: (data: any) => api.post("/auth/register", data),
    getMe: () => api.get("/auth/me"),
  },
};
