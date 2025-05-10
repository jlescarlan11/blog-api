// src/App.tsx
import React, { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Signup from "./pages/SignUp";
import LogIn from "./pages/LogIn";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { isAuthenticated } from "./auth";

interface RouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) =>
  isAuthenticated() ? (
    <>{children}</>
  ) : (
    <>
      <Dashboard />
    </>
  );

const PublicRoute: React.FC<RouteProps> = ({ children }) =>
  isAuthenticated() ? <Navigate to="/" /> : <>{children}</>;

const Layout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
  }, [location.pathname]);

  return (
    <>
      <Navbar>
        <ThemeSwitcher />
      </Navbar>
      <Outlet />
    </>
  );
};

const App: React.FC = () => {
  return (
    <div className="container mx-auto max-w-7xl">
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
            path="/login"
            element={
              <PublicRoute>
                <LogIn />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
