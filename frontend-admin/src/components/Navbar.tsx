import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronDown,
  User,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";

interface NavbarProps {
  onLoginClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const initial = user?.firstName?.charAt(0).toUpperCase() ?? "?";
  const userEmail = user?.email ?? "";
  const userFullname =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "Account";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset dropdown when auth state changes
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [isAuthenticated]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate("/settings");
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate("/");
  };

  return (
    <header className="bg-base-100 shadow-sm sticky top-0 z-50">
      <nav
        className="navbar container max-w-7xl mx-auto px-4"
        aria-label="Main navigation"
      >
        <div className="flex-1">
          <a
            className="flex items-center text-xl font-bold hover:opacity-80 transition-opacity"
            href="/"
            aria-label="Lester's Cave Home"
          >
            <span className="relative z-10 text-base-content mansalva-regular">
              Lester's Cave
            </span>
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* User menu or login button */}
          {isAuthenticated ? (
            <div>
              <div className="relative" ref={dropdownRef}>
                <button
                  className="btn btn-ghost py-4 rounded-full flex items-center gap-2 hover:bg-base-200"
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-controls="user-menu"
                  onKeyDown={handleKeyDown}
                >
                  <div className="avatar avatar-placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
                      {initial ? (
                        <span className="text-sm font-medium">{initial}</span>
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                  </div>
                  <span className="hidden md:inline text-sm">
                    {userFullname}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    id="user-menu"
                    className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-base-200 py-1 ring-1 ring-base-300"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    {/* User Profile Section */}
                    <div className="px-4 py-3 border-b border-base-300">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                            {initial ? (
                              <span className="text-base font-medium">
                                {initial}
                              </span>
                            ) : (
                              <User size={20} />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{userFullname}</p>
                          <p className="text-xs text-base-content/60 truncate max-w-[180px]">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-base-300 text-sm"
                        onClick={handleSettingsClick}
                        role="menuitem"
                      >
                        <SettingsIcon size={16} />
                        Settings
                      </button>

                      <button
                        className="w-full text-left px-4 py-2 flex items-center gap-2 text-error hover:bg-base-300 text-sm"
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onLoginClick}
              aria-label="Log in to your account"
            >
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
