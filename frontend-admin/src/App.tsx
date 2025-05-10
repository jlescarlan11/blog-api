// src/App.tsx
import React, { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import LogIn from "./pages/LogIn";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { isAuthenticated } from "./auth";

interface RouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) =>
  isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;

const PublicRoute: React.FC<RouteProps> = ({ children }) =>
  isAuthenticated() ? <Navigate to="/" /> : <>{children}</>;

const Layout: React.FC = () => {
  const location = useLocation();
  const hideNavbar = ["/login", "/signup"].includes(location.pathname);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
  }, [location.pathname]);

  return (
    <>
      {!hideNavbar && (
        <Navbar>
          <ThemeSwitcher />
        </Navbar>
      )}
      <Outlet />
    </>
  );
};

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              isAuthenticated() ? <Navigate to="/" /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LogIn />
              </PublicRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
};

export default App;
