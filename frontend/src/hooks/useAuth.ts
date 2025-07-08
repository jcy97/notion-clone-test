import { useState, useEffect } from "react";
import { User, LoginRequest, RegisterRequest } from "../types/user.types";
import { api } from "../utils/api";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchUser();
    } else {
      const isSharedPage = window.location.pathname.includes("/shared/");

      if (isSharedPage) {
        const guestUser: User = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: "",
          name: `게스트 ${Math.floor(Math.random() * 1000)}`,
          avatar: undefined,
          createdAt: new Date(),
        };
        setUser(guestUser);
      }

      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("token");

      const isSharedPage = window.location.pathname.includes("/shared/");
      if (isSharedPage) {
        const guestUser: User = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: "",
          name: `게스트 ${Math.floor(Math.random() * 1000)}`,
          avatar: undefined,
          createdAt: new Date(),
        };
        setUser(guestUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    const response = await api.post("/auth/login", data);
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  };

  const register = async (data: RegisterRequest) => {
    const response = await api.post("/auth/register", data);
    const { user, token } = response.data;
    localStorage.setItem("token", token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const isGuest = user ? user.id.startsWith("guest_") : false;

  return {
    user,
    loading,
    login,
    register,
    logout,
    isGuest,
  };
};
