import React, { useState, useEffect, useRef } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import { isAuthenticated, logout } from "../auth";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth";
import { LuChevronDown } from "react-icons/lu";

interface NavbarProps {
  onLoginClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const navigate = useNavigate();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const user = getCurrentUser();

  const initial = user?.firstName?.charAt(0).toUpperCase() ?? "?";
  const userEmail = user?.email ?? "";

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const handleToggle = () => setIsDropdownOpen(details.open);
    details.addEventListener("toggle", handleToggle);

    return () => details.removeEventListener("toggle", handleToggle);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="bg-base-100 shadow-sm">
      <div className="navbar container max-w-7xl mx-auto">
        <div className="flex-1">
          <a
            className="btn btn-ghost hover:bg-transparent border-none text-xl normal-case"
            href="/"
            aria-label="Lester's Cave Home"
          >
            <span className="relative z-10 font-bold text-base-content mansalva-regular">
              Lester's Cave
            </span>
          </a>
        </div>
        <div className="flex-none">
          <ul className="px-2 flex items-center gap-4">
            <li>
              <ThemeSwitcher />
            </li>
            <li>
              {isAuthenticated() ? (
                <div>
                  <details
                    ref={detailsRef}
                    className="dropdown dropdown-end bg-transparent"
                  >
                    <summary className="btn btn-ghost hover:bg-transparent border-none m-1">
                      <div className="avatar avatar-placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                          <span className="text-sm">{initial}</span>
                        </div>
                      </div>
                      <LuChevronDown
                        className={`transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </summary>
                    <ul className="menu dropdown-content rounded-box z-1 mr-4 shadow-sm bg-base-200">
                      <li className="!cursor-default pointer-events-none select-none  !pr-8">
                        <div className="text-sm font-semibold truncate">
                          <div className="avatar avatar-placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              <span className="text-sm">{initial}</span>
                            </div>
                          </div>
                          {userEmail}
                        </div>
                      </li>
                      <div className="divider my-0" />
                      <li>
                        <span
                          className="btn btn-ghost justify-start text-error hover:bg-transparent border-none  normal-case"
                          onClick={handleLogout}
                        >
                          Log out
                        </span>
                      </li>
                    </ul>
                  </details>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={onLoginClick}>
                  Login
                </button>
              )}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
