// src/components/Navbar.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";

interface NavbarProps {
  children?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex items-center justify-between p-4 bg-base-100 shadow">
      <div className="text-xl font-semibold">Navbar</div>
      <div className="flex items-center space-x-4">
        {children}
        <button onClick={handleLogout} className="btn btn-sm btn-outline">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
