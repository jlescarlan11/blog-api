// src/auth.ts

/**
 * Checks if a JWT token exists in localStorage.
 * @returns true if a token is present, false otherwise.
 */
export const isAuthenticated = (): boolean => {
  return localStorage.getItem("token") !== null;
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
