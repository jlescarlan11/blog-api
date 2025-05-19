import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
// LoginModal is now managed and rendered in App.tsx
// import LoginModal from "./LoginModal";

interface LayoutProps {
  // Define the props that Layout expects to receive from App.tsx
  onLoginClick: () => void;
  onSignupClick: () => void;
  // Add children prop explicitly as Layout is used with nested routes in App.tsx
  children: React.ReactNode;
}

// Accept the onLoginClick and onSignupClick props, and children
const Layout: React.FC<LayoutProps> = ({ onLoginClick, onSignupClick }) => {
  const location = useLocation();
  // Modal state is now managed in App.tsx
  // const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Effect to set the theme from localStorage on route change
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "lofi";
    document.documentElement.setAttribute("data-theme", saved);
  }, [location.pathname]);

  // Modal control functions are now passed down as props
  // const openLoginModal = () => {
  //   setIsLoginModalOpen(true);
  // };

  // const closeLoginModal = () => {
  //   setIsLoginModalOpen(false);
  // };

  return (
    <>
      {/* Pass the received onLoginClick and onSignupClick functions to the Navbar */}
      <Navbar onLoginClick={onLoginClick} onSignupClick={onSignupClick} />

      {/* Outlet renders the matched child route elements */}
      {/* We don't explicitly use the 'children' prop here, but defining it in
          LayoutProps resolves the TypeScript error when Layout is used in App.tsx */}
      <Outlet />

      {/*
        Modals are now rendered in App.tsx, so remove them from Layout.
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      */}
    </>
  );
};

export default Layout;
