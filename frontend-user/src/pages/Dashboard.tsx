import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";

// Types based on your Prisma schema
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  createdAt: string;
  user: User;
}

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  views: number;
  likes: number;
  author: User;
  comments: Comment[];
}

const Dashboard: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const navigate = useNavigate();

  // Get token from local storage
  const token = localStorage.getItem("token");

  // Fetch all posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_BLOGPOST_URL;
        if (!apiUrl) {
          throw new Error(
            "VITE_BLOGPOST_URL is not defined in environment variables."
          );
        }

        const response = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setPosts(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [token]);

  // Handler for post click
  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`, { state: { post: post } });
  };

  // Get all unique tags from posts
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    posts.forEach((post) => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [posts]);

  // Filter and sort posts based on search term, selected tag, and sort option
  const filteredAndSortedPosts = React.useMemo(() => {
    // First filter the posts
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = posts.filter((post) => {
      const matchesSearch =
        searchTerm === "" ||
        post.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        post.content.toLowerCase().includes(lowerCaseSearchTerm);

      const matchesTag =
        selectedTag === "" ||
        (Array.isArray(post.tags) && post.tags.includes(selectedTag));

      return matchesSearch && matchesTag;
    });

    // Then sort the filtered posts
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "most-viewed":
          return b.views - a.views;
        case "most-liked":
          return b.likes - a.likes;
        case "most-commented":
          return b.comments.length - a.comments.length;
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [posts, searchTerm, selectedTag, sort]);

  // Get truncated content for preview and sanitize it
  const getTruncatedAndSanitizedContent = (
    content: string,
    maxLength: number = 150
  ) => {
    // Sanitize the content first, allowing only <strong> tags
    const cleanContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["strong"],
    });

    if (cleanContent.length <= maxLength) return cleanContent;
    // Truncate the sanitized content
    return cleanContent.substring(0, maxLength) + "...";
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTag("");
    setSort("newest");
  };

  // Reset search term
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Format post date to improve readability
  const formatPostDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
    });
  };

  // Render post card using DaisyUI card component - Grid View
  const renderPostGridCard = (post: Post) => {
    return (
      <div
        key={post.id}
        className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-base-200"
        onClick={() => handlePostClick(post)}
      >
        {/* Card header with gradient */}
        <div className="h-40 bg-gradient-to-r from-base-content/10 via-secondary/10 to-accent/10 rounded-t-lg flex items-center justify-center group-hover:opacity-90 transition-opacity">
          <div className="text-3xl font-bold text-base-content/60">
            {post.title.charAt(0).toLocaleUpperCase()}
          </div>
        </div>

        <div className="card-body p-4">
          {/* Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="badge badge-sm badge-primary text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="badge badge-sm badge-ghost text-xs">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h2 className="card-title text-lg font-bold mb-2 hover:text-base-content transition-colors line-clamp-2">
            {post.title}
            {!post.published && (
              <span className="badge badge-warning badge-sm ml-2">Draft</span>
            )}
          </h2>

          {/* Content preview */}
          <p
            className="text-base-content/70 text-sm mb-4 line-clamp-3"
            dangerouslySetInnerHTML={{
              __html: getTruncatedAndSanitizedContent(post.content, 120),
            }}
          ></p>

          {/* Metadata footer */}
          <div className="flex items-center justify-between text-xs text-base-content/60 mt-auto pt-4 border-t border-base-200">
            <div className="flex items-center">
              <div className="avatar avatar-placeholder mr-2">
                <div className="bg-primary text-primary-content   rounded-full w-8 h-8 flex items-center justify-center">
                  <span>
                    {post.author?.firstName?.charAt(0)}
                    {post.author?.lastName?.charAt(0)}
                  </span>
                </div>
              </div>
              <span className="font-medium">
                {post.author?.firstName} {post.author?.lastName}
              </span>
            </div>
            <span>{formatPostDate(post.createdAt)}</span>
          </div>

          {/* Post stats */}
          <div className="grid grid-cols-3 gap-2 text-xs text-base-content/60 mt-4 pt-2 border-t border-base-200">
            <span className="flex items-center justify-center bg-base-200/50 rounded-md py-1 px-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                ></path>
              </svg>
              {post.views}
            </span>
            <span className="flex items-center justify-center bg-base-200/50 rounded-md py-1 px-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                ></path>
              </svg>
              {post.likes}
            </span>
            <span className="flex items-center justify-center bg-base-200/50 rounded-md py-1 px-2">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                ></path>
              </svg>
              {post.comments?.length}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render post row for list view
  const renderPostListRow = (post: Post) => {
    return (
      <div
        key={post.id}
        className="flex flex-col bg-base-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-lg mb-4 cursor-pointer border border-base-200 overflow-hidden hover:border-base-content/30"
        onClick={() => handlePostClick(post)}
      >
        <div className="flex flex-col sm:flex-row p-4">
          {/* Left side - accent bar and icon */}
          <div className="hidden sm:flex flex-col items-center mr-4 pb-4">
            <div className="bg-base-content/20 text-base-content rounded-full w-12 h-12 flex items-center justify-center mb-2">
              <span className="text-lg font-bold">
                {post.title.charAt(0).toLocaleUpperCase()}
              </span>
            </div>
            <div className="flex flex-col items-center text-xs text-base-content/60 space-y-2">
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
                {post.views}
              </span>
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  ></path>
                </svg>
                {post.likes}
              </span>
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  ></path>
                </svg>
                {post.comments.length}
              </span>
            </div>
          </div>

          {/* Right side - Content */}
          <div className="flex-grow">
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.isArray(post.tags) &&
                post.tags.length > 0 &&
                post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="badge badge-sm badge-primary text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              {Array.isArray(post.tags) && post.tags.length > 3 && (
                <span className="badge badge-sm badge-ghost text-xs">
                  +{post.tags.length - 3}
                </span>
              )}
              {!post.published && (
                <span className="badge badge-sm badge-warning ml-2">Draft</span>
              )}
            </div>

            <h3 className="font-bold text-lg mb-2 hover:text-base-content transition-colors">
              {post.title}
            </h3>

            <p
              className="text-base-content/70 text-sm mb-4 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: getTruncatedAndSanitizedContent(post.content, 160),
              }}
            ></p>

            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center text-xs text-base-content/60 mb-2 sm:mb-0">
                <div className="avatar avatar-placeholder mr-2">
                  <div className="bg-base-content/20 text-base-content rounded-full w-6 h-6 flex items-center justify-center">
                    <span>
                      {post.author?.firstName?.charAt(0)}
                      {post.author?.lastName?.charAt(0)}
                    </span>
                  </div>
                </div>
                <span className="mr-4">
                  {post.author?.firstName} {post.author?.lastName}
                </span>
                <span>{formatPostDate(post.createdAt)}</span>
              </div>

              {/* Mobile stats */}
              <div className="flex sm:hidden gap-4 text-xs text-base-content/60">
                <span className="flex items-center">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  {post.views}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    ></path>
                  </svg>
                  {post.likes}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    ></path>
                  </svg>
                  {post.comments.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 lg:py-16 bg-base-100 min-h-screen">
      {/* Hero section with improved design */}
      <div className="hero bg-gradient-to-r from-base-content/10 via-secondary/5 to-accent/10 rounded-2xl p-8 mb-8 shadow-sm">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-4xl font-bold text-base-content leading-tight mb-4">
              Discover Articles
            </h1>
            <p className="text-base md:text-lg text-base-content/70 mb-8">
              Explore the latest blog posts and articles written by John Lester
              Escarlan
            </p>
            <div className="relative w-full max-w-lg mx-auto">
              <input
                type="text"
                placeholder="Search for articles..."
                className="input input-lg w-full pl-12 bg-base-100/80 backdrop-blur-sm border border-base-300 shadow-sm focus:border-base-content transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-4 top-4 text-base-content/40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {searchTerm && (
                <button
                  className="absolute right-4 top-4 text-base-content/40 hover:text-base-content transition-colors"
                  onClick={clearSearch}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter toggle and controls section */}
      <div className="bg-base-100 rounded-xl shadow-sm mb-8 border border-base-200">
        {/* Filter header - always visible */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center space-x-2">
            <button
              className="btn btn-sm btn-ghost gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {(selectedTag || sort !== "newest") && (
                <span className="badge badge-sm badge-primary">Active</span>
              )}
            </button>
            <div className="text-sm text-base-content/70">
              {filteredAndSortedPosts.length === 0 ? (
                <span>No posts found</span>
              ) : (
                <span>
                  Showing{" "}
                  <span className="font-medium">
                    {filteredAndSortedPosts.length}
                  </span>{" "}
                  posts
                </span>
              )}
            </div>
          </div>

          {/* View toggle buttons */}
          <div className="flex items-center space-x-4">
            {(searchTerm || selectedTag !== "" || sort !== "newest") && (
              <button
                className="btn btn-ghost btn-sm text-xs"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
            <div className="join">
              <button
                className={`join-item btn btn-sm ${
                  view === "grid" ? "btn-active" : ""
                }`}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                className={`join-item btn btn-sm ${
                  view === "list" ? "btn-active" : ""
                }`}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable filter options */}
        {showFilters && (
          <div className="p-4 bg-base-200/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tag filter */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-medium">
                  Filter by tag
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort options */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-medium">Sort by</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-viewed">Most Viewed</option>
                <option value="most-liked">Most Liked</option>
                <option value="most-commented">Most Commented</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading state with improved animation */}
      {loading && (
        <div className="flex flex-col justify-center items-center h-64 bg-base-100 rounded-box shadow-sm p-8">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-base-content/30 animate-ping"></div>
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-base-content border-base-content/30 animate-spin"></div>
          </div>
          <p className="mt-8 text-base-content/70 font-medium">
            Loading articles...
          </p>
        </div>
      )}

      {/* Error state with improved design */}
      {error && !loading && (
        <div className="alert alert-error shadow-lg rounded-xl">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">Oops! Something went wrong</h3>
            <div className="text-xs">{error}</div>
          </div>
          <button className="btn btn-sm">Try Again</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredAndSortedPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-base-100 rounded-box shadow-sm">
          <div className="bg-base-200 p-4 rounded-full mb-4">
            <svg
              className="h-12 w-12 text-base-content/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-base-content">
            No posts found
          </h3>
          <p className="mt-4 text-base-content/70 max-w-md">
            {searchTerm || selectedTag
              ? "Try adjusting your search or filter to find what you're looking for."
              : "No blog posts are available right now. Check back soon for new content!"}
          </p>
          {(searchTerm || selectedTag !== "") && (
            <button
              className="btn btn-base-content btn-sm mt-4"
              onClick={clearFilters}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Blog posts - Conditional rendering based on view mode */}
      {!loading && !error && filteredAndSortedPosts.length > 0 && (
        <>
          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:md:grid-cols-4 gap-8">
              {filteredAndSortedPosts.map(renderPostGridCard)}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredAndSortedPosts.map(renderPostListRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
