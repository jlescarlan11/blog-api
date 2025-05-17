import { useState } from "react";
import { LuSearch } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

const Posts = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const navigate = useNavigate();

  return (
    <div className="container max-w-7xl mx-auto pb-12">
      <div className="px-4 py-8">
        <div className="text-sm breadcrumbs">
          <ul>
            <li>
              <a className="hover:underline" onClick={() => navigate("/")}>
                Home
              </a>
            </li>
            <li>
              <a onClick={() => navigate("/")} className="hover:underline">
                Posts
              </a>
            </li>
          </ul>
        </div>

        {/* Page Title */}
        <h1 className="text-2xl font-bold mb-2"> Posts</h1>
      </div>
      <div>
        <div className="min-w-full mb-8 px-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-8">
            <div className="flex flex-col sm:flex-row gap-3 min-w-full sm:w-auto">
              <label htmlFor="" className="input">
                <LuSearch className="h-4 opacity-50" />
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Search"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;
