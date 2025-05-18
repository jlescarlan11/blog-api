import React from "react";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import { AuthProvider, useAuth } from "./context/AuthContext";

interface RouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <>
      <h1>You Must Log In First</h1>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/posts"
            element={
              <ProtectedRoute>
                <Posts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;
