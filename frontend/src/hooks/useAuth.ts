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
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("token");
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

  return {
    user,
    loading,
    login,
    register,
    logout,
  };
};
