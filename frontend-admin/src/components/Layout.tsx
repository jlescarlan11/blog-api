import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import LoginModal from "./LoginModal";

const Layout: React.FC = () => {
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "lofi";
    document.documentElement.setAttribute("data-theme", saved);
  }, [location.pathname]);

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <>
      {/* Pass the openLoginModal function to the Navbar */}
      {/* Render ThemeSwitcher next to Navbar, not as a child */}
      <Navbar onLoginClick={openLoginModal} />
      <Outlet />
      {/* Render the LoginModal component */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
};

export default Layout;
