import React, { useState } from "react";
import { Route, Routes, BrowserRouter as Router } from "react-router-dom"; // Import Router
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout"; // Assuming Layout is a component that renders Navbar and other content
import { AuthProvider, useAuth } from "./context/AuthContext"; // Assuming AuthProvider and useAuth are correctly exported
import Settings from "./pages/Settings";
import Post from "./pages/Post";
// import Signup from "./pages/SignUp"; // We will use the modal instead of a separate page
import LoginModal from "./components/LoginModal"; // Assuming you have a LoginModal component
import SignupModal from "./components/SignupModal"; // Assuming you have the SignupModal component

interface RouteProps {
  children: React.ReactNode;
}

// ProtectedRoute component - Note: The original logic allowed access even if not authenticated.
// You might want to adjust this to redirect to a login page if isAuthenticated is false.
const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth(); // useAuth is correctly used here, within the AuthProvider tree

  // Consider adding a redirect here if authentication is required for these routes
  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <>{children}</> // Current logic allows access. Modify as needed for actual protection.
  );
};

const App: React.FC = () => {
  // State to manage the visibility of the Login and Signup Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Functions to open and close the modals
  const openLoginModal = () => {
    setIsSignupModalOpen(false); // Close signup modal if open
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const openSignupModal = () => {
    setIsLoginModalOpen(false); // Close login modal if open
    setIsSignupModalOpen(true);
  };

  const closeSignupModal = () => {
    setIsSignupModalOpen(false);
  };

  return (
    // Wrap the entire application (or at least the part using routing and auth context) with AuthProvider
    <AuthProvider>
      {/*
        Wrap the application with Router (e.g., BrowserRouter) if it's not done at a higher level (like index.tsx).
        If your index.tsx already wraps App with BrowserRouter, you can remove this Router here.
      */}
      <Router>
        {/* Render the Login and Signup Modals at a high level so they can be controlled from anywhere */}
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
        <SignupModal isOpen={isSignupModalOpen} onClose={closeSignupModal} />

        {/*
          Routes are wrapped by AuthProvider.
          Layout is rendered by a Route element, ensuring it and its children (like Navbar)
          are within the routing context and the AuthProvider context.
        */}
        <Routes>
          {/*
            The Layout route. Components rendered by Outlet inside Layout will be
            the children routes defined below.
            Pass modal control functions down to Layout, which will pass them to Navbar.
          */}
          <Route
            element={
              <Layout
                onLoginClick={openLoginModal}
                onSignupClick={openSignupModal}
                children={undefined}
              />
            }
          >
            {/* Nested routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
            <Route
              path="/post/:postId"
              element={
                <ProtectedRoute>
                  <Post />
                </ProtectedRoute>
              }
            />
            {/*
              Remove the direct route to the Signup page component
              since we are using a modal.
              <Route path="/signup" element={<ProtectedRoute><Signup /></ProtectedRoute>} />
            */}
            {/* Add a route for the login page if you have one, potentially without ProtectedRoute */}
            {/* <Route path="/login" element={<Login />} /> */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
