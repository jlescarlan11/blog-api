// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, getToken, removeToken, storeToken } from "../auth";

// Define the structure for the user object based on your jwtDecode type
interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  // Add any other properties included in your JWT payload
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null; // User can be null if not authenticated
  login: (token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void; // Add updateUser function
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => getCurrentUser()); // Specify User | null type
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  useEffect(() => {
    // Listen for storage changes to sync across tabs
    const handleStorageChange = () => {
      setUser(getCurrentUser());
      setIsAuthenticated(!!getToken());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (token: string) => {
    storeToken(token);
    setUser(getCurrentUser()); // Get the newly decoded user from the stored token
    setIsAuthenticated(true);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  // New function to update the user state in the context
  const updateUser = (userData: Partial<User>) => {
    // Update the user state with partial data
    setUser((prevUser) => {
      if (!prevUser) return null; // Should not happen if authenticated, but for safety
      return { ...prevUser, ...userData };
    });
    // Note: This only updates the client-side state.
    // For persistent changes, the backend API must be called first.
    // If the backend returns a new token with updated info,
    // you might want to re-run login(newToken) instead of just updating state.
    // However, updating state directly is simpler if the backend doesn't issue a new token on every update.
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
