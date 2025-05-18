// themeswitcher.tsx
import { useEffect, useState } from "react";

const ThemeSwitcher: React.FC = () => {
  // Initialize theme from localStorage or default to 'lofi'
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("theme") || "lofi"
  );

  // Function to handle checkbox change
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // If the checkbox is checked, set theme to 'black', otherwise set to 'lofi'
    const newTheme = event.target.checked ? "black" : "lofi";
    setTheme(newTheme);
  };

  // Effect to update the data-theme attribute and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <input
      type="checkbox"
      id="theme-toggle"
      checked={theme === "black"}
      onChange={handleCheckboxChange}
      className="checkbox theme-controller"
      aria-label="Toggle dark mode"
    />
  );
};

export default ThemeSwitcher;
