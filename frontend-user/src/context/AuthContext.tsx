// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, getToken, removeToken, storeToken } from "../auth"; // Assuming these functions exist

// Define the structure for the user object based on your jwtDecode type
interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  // Add any other properties included in your JWT payload
}

// Define the type for the authentication context value
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null; // User can be null if not authenticated
  loading: boolean; // Add loading state to the context type
  login: (token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void; // Add updateUser function
}

// Create the context with an initial null value, asserting the type
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider component to wrap your application or parts of it
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State for the authenticated user, initialized by checking for an existing token
  const [user, setUser] = useState<User | null>(() => getCurrentUser()); // Specify User | null type
  // State for authentication status, initialized by checking for an existing token
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());
  // State to indicate if the authentication status is currently being loaded or checked
  const [loading, setLoading] = useState(true); // Initialize as true as we check on mount

  // Effect to handle initial loading and storage changes
  useEffect(() => {
    // Perform initial check (if not already done by initial state)
    const token = getToken();
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(!!token);
    setLoading(false); // Set loading to false after initial check

    // Listen for storage changes to sync across tabs
    const handleStorageChange = () => {
      const updatedUser = getCurrentUser();
      const updatedIsAuthenticated = !!getToken();
      setUser(updatedUser);
      setIsAuthenticated(updatedIsAuthenticated);
      // No need to set loading true here, as storage changes are typically fast
    };

    window.addEventListener("storage", handleStorageChange);

    // Cleanup function to remove the event listener
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []); // Empty dependency array means this effect runs only once on mount

  // Function to handle user login
  const login = (token: string) => {
    storeToken(token); // Store the token in local storage
    setUser(getCurrentUser()); // Get the newly decoded user from the stored token
    setIsAuthenticated(true);
    // No need to set loading true here, login is an explicit action
  };

  // Function to handle user logout
  const logout = () => {
    removeToken(); // Remove the token from local storage
    setUser(null); // Clear the user state
    setIsAuthenticated(false);
    // No need to set loading true here, logout is an explicit action
  };

  // Function to update the user state in the context client-side
  // This is useful for updating user info (like name) after a successful backend call
  const updateUser = (userData: Partial<User>) => {
    // Update the user state with partial data immutably
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

  // Provide the context value to the children components
  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout, updateUser }} // Include loading in the context value
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the AuthContext
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Throw an error if the hook is used outside of an AuthProvider
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context; // Return the context value
};
