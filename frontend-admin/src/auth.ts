// src/auth.ts
import { jwtDecode } from "jwt-decode";

// This file now contains pure utility functions that don't manage state
// Keep these as they're useful for token decoding and storage management

export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode<{
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
    }>(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const storeToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const removeToken = (): void => {
  localStorage.removeItem("token");
};
