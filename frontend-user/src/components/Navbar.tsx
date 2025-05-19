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
  onSignupClick: () => void; // Added prop for signup button click
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onSignupClick }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  // Get user initial for avatar, default to '?' if not available
  const initial = user?.firstName?.charAt(0).toUpperCase() ?? "?";
  // Get user email, default to empty string
  const userEmail = user?.email ?? "";
  // Get user full name or default to "Account"
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

  // Reset dropdown when auth state changes (e.g., after login/logout)
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [isAuthenticated]);

  // Handle keyboard navigation for accessibility (Escape key to close dropdown)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  // Toggle dropdown open/close state
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle click on Settings menu item
  const handleSettingsClick = () => {
    setIsDropdownOpen(false); // Close dropdown
    navigate("/settings"); // Navigate to settings page
  };

  // Handle click on Logout menu item
  const handleLogout = () => {
    setIsDropdownOpen(false); // Close dropdown
    logout(); // Call logout function from AuthContext
    navigate("/"); // Navigate to home page after logout
  };

  return (
    <header className="bg-base-100 shadow-sm sticky top-0 z-50">
      <nav
        className="navbar container max-w-7xl mx-auto px-4"
        aria-label="Main navigation"
      >
        <div className="flex-1">
          {/* Site Title/Logo Link */}
          <a
            className="flex items-center text-xl font-bold hover:opacity-80 transition-opacity"
            href="/"
            aria-label="Sutta's Blog Home"
          >
            {/* Assuming 'mansalva-regular' is a custom font class */}
            <span className="relative z-10 text-base-content mansalva-regular">
              Sutta's Blog
            </span>
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Conditional rendering based on authentication state */}
          {isAuthenticated ? (
            // User is authenticated: Show user avatar and dropdown menu
            <div>
              <div className="relative" ref={dropdownRef}>
                {/* Button to toggle dropdown */}
                <button
                  className="btn btn-ghost py-4 rounded-full flex items-center gap-2 hover:bg-base-200"
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-controls="user-menu"
                  onKeyDown={handleKeyDown}
                >
                  {/* User Avatar */}
                  <div className="avatar avatar-placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
                      {initial ? (
                        <span className="text-sm font-medium">{initial}</span>
                      ) : (
                        <User size={16} /> // Fallback icon if initial is not available
                      )}
                    </div>
                  </div>
                  {/* User Full Name (hidden on small screens) */}
                  <span className="hidden md:inline text-sm">
                    {userFullname}
                  </span>
                  {/* Dropdown arrow icon */}
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
                    {/* User Profile Section in Dropdown */}
                    <div className="px-4 py-3 border-b border-base-300">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                            {initial ? (
                              <span className="text-base font-medium">
                                {initial}
                              </span>
                            ) : (
                              <User size={20} /> // Fallback icon
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{userFullname}</p>
                          {/* Truncate long emails */}
                          <p className="text-xs text-base-content/60 truncate max-w-[180px]">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {/* Settings Button */}
                      <button
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-base-300 text-sm"
                        onClick={handleSettingsClick}
                        role="menuitem"
                      >
                        <SettingsIcon size={16} />
                        Settings
                      </button>

                      {/* Logout Button */}
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
            // User is not authenticated: Show Login and Sign Up buttons
            <>
              <button
                className="btn btn-ghost" // Using btn-ghost for a less prominent signup button
                onClick={onSignupClick}
                aria-label="Sign up for an account"
              >
                Sign Up
              </button>
              <button
                className="btn btn-primary"
                onClick={onLoginClick}
                aria-label="Log in to your account"
              >
                Login
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
