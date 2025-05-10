// src/components/Navbar.tsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { logout, isAuthenticated } from "../auth";
import { LuNewspaper } from "react-icons/lu";

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
    <div className="p-4 bg-base-100 ">
      <div className="container max-w-7xl mx-auto flex items-center justify-between ">
        <div className="text-xl flex items-center gap-4">
          <LuNewspaper className="" />
          <h1 className="font-bold">Sutta's Blog</h1>
        </div>

        <div className="flex items-center space-x-4">
          {children}
          {isAuthenticated() ? (
            <button onClick={handleLogout} className="btn btn-sm btn-outline">
              Logout
            </button>
          ) : (
            <>
              <Link to="/" className="btn btn-sm btn-ghost">
                Home
              </Link>
              <Link to="/login" className="btn btn-sm btn-ghost">
                Login
              </Link>
              <Link to="/signup" className="btn btn-sm btn-ghost">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
