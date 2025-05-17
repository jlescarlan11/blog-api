// src/App.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";

import { isAuthenticated } from "./auth";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Posts from "./pages/Posts";

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

const App: React.FC = () => {
  return (
    <Routes>
      {/* Use the updated Layout component */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Removed the direct /login and /signup routes */}
        {/* <Route
          path="/login"
          element={
            <PublicRoute>
              <LogIn />
            </PublicRoute>
          }
        /> */}
        <Route path="/posts" element={<Posts />} />
        {/* <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        /> */}
      </Route>
    </Routes>
  );
};

export default App;
