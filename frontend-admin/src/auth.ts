// src/auth.ts
import { jwtDecode } from "jwt-decode";

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export const getCurrentUser = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode<{ id: string; email: string; role: string }>(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Stores the JWT token in localStorage.
 * @param token - The JWT token string.
 */
export const login = (token: string): void => {
  localStorage.setItem("token", token);
};

/**
 * Removes the JWT token from localStorage.
 */
export const logout = (): void => {
  localStorage.removeItem("token");
};
