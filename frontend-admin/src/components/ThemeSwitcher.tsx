import { useEffect, useState } from "react";
import { LuSun } from "react-icons/lu";

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("theme") || "lofi"
  );

  const toggleTheme = () => {
    const newTheme = theme === "lofi" ? "black" : "lofi";
    setTheme(newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <label className="swap swap-rotate rounded-full size-8 ">
      {/* This hidden checkbox controls the state */}
      <input
        type="checkbox"
        checked={theme === "black"}
        onChange={toggleTheme}
        className="swap-input"
      />

      {/* Sun icon (light theme) */}
      <LuSun className="swap-on rounded-full fill-current size-4" />

      {/* Moon icon (dark theme) */}
      <svg
        className="swap-off rounded-full text-4 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
      </svg>
    </label>
  );
};

export default ThemeSwitcher;
