// ThemeSwitcher.tsx (React + TypeScript)
import { useEffect, useState } from "react";

const ThemeSwitcher: React.FC = () => {
  // load saved theme or fallback to light
  const [theme, setTheme] = useState<string>(
    () => localStorage.getItem("theme") || "light"
  );

  // whenever `theme` changes, apply it and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // you could pull the list of themes from a constant or fetch from DaisyUI docs
  const themes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    // … the rest of the 35+ names …
  ];

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="select select-bordered"
    >
      {themes.map((t) => (
        <option key={t} value={t}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </select>
  );
};

export default ThemeSwitcher;
