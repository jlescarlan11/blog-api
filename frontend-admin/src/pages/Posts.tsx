import { useState, useEffect, useCallback } from "react";
import {
  LuSearch,
  LuPencil,
  LuTrash2,
  LuEye,
  LuCircleCheck,
  LuCircleX,
  LuArrowDown,
  LuArrowUp,
  LuLoader,
  LuCircleAlert,
  LuFilter,
  LuRefreshCw,
  LuChevronLeft,
  LuChevronRight,
  LuCirclePlus,
  LuHouse,
  LuSquareCheck,
  LuSquare,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

// Define types for the post data
interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

const Posts = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);

  // Loading states for operations
  const [loadingPostIds, setLoadingPostIds] = useState<Record<string, string>>(
    {}
  );
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState<boolean>(false);

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const navigate = useNavigate();

  // Get the API URL from environment variables
  const ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST;
  const token = localStorage.getItem("token");

  // Setup search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Function to fetch blog posts - Wrapped in useCallback
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(ADMIN_POSTS_API, {
        params: {
          page: currentPage,
          limit: postsPerPage,
          search: debouncedSearch,
          filter: filterStatus,
          sort: `${sortField}:${sortDirection}`,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(response.data.posts);
      setTotalPosts(response.data.totalPosts);
      setTotalPages(Math.ceil(response.data.totalPosts / postsPerPage));

      // Reset selections when data changes
      setSelectedPosts([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to fetch blog posts.");
      toast.error("Failed to fetch blog posts.");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    postsPerPage,
    debouncedSearch,
    filterStatus,
    sortField,
    sortDirection,
    ADMIN_POSTS_API,
    token,
  ]);

  // useEffect to fetch posts when dependencies change
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Function to handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of table when changing pages
      document
        .querySelector(".posts-table")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Function to handle sort change
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to desc for new field
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Get sort icon for table headers
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <LuArrowUp className="inline-block ml-1 h-4 w-4" aria-hidden="true" />
    ) : (
      <LuArrowDown className="inline-block ml-1 h-4 w-4" aria-hidden="true" />
    );
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Toggle post selection
  const togglePostSelection = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map((post) => post.id));
    }
    setSelectAll(!selectAll);
  };

  // Check if all visible posts are selected
  useEffect(() => {
    if (posts.length > 0 && selectedPosts.length === posts.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedPosts, posts]);

  // Function to toggle post publish status
  const togglePublishStatus = async (
    postId: string,
    currentStatus: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent row click

    // Set loading state for this specific post with operation type
    setLoadingPostIds((prev) => ({ ...prev, [postId]: "status" }));

    try {
      await axios.patch(
        `${ADMIN_POSTS_API}/${postId}/status`,
        { published: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state to reflect the change
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, published: !currentStatus } : post
        )
      );

      toast.success(
        `Post ${!currentStatus ? "published" : "unpublished"} successfully`
      );
    } catch (err) {
      console.error("Error toggling publish status:", err);
      toast.error("Failed to update post status");
    } finally {
      // Clear loading state for this post
      setLoadingPostIds((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    }
  };

  // Function to delete a single post
  const deletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click

    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    // Set loading state for this specific post with operation type
    setLoadingPostIds((prev) => ({ ...prev, [postId]: "delete" }));

    try {
      await axios.delete(`${ADMIN_POSTS_API}/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove post from local state
      setPosts(posts.filter((post) => post.id !== postId));
      setSelectedPosts((prev) => prev.filter((id) => id !== postId));

      toast.success("Post deleted successfully");

      // If we deleted the last post on the page, go back one page
      if (
        (posts.length === 1 && currentPage > 1) ||
        (posts.length > 1 &&
          posts.filter((post) => post.id !== postId).length === 0 &&
          currentPage > 1)
      ) {
        setCurrentPage(currentPage - 1);
      } else {
        // Refetch to update counts and ensure correct data
        fetchPosts();
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      toast.error("Failed to delete post");
    } finally {
      // Clear loading state for this post
      setLoadingPostIds((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    }
  };

  // Function to delete multiple selected posts
  const deleteSelectedPosts = async () => {
    if (selectedPosts.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedPosts.length} posts?`
      )
    ) {
      return;
    }

    // Set bulk delete loading state
    setBulkDeleteLoading(true);

    try {
      await axios.post(
        `${ADMIN_POSTS_API}/bulk-delete`,
        { postIds: selectedPosts },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`${selectedPosts.length} posts deleted successfully`);
      setSelectedPosts([]); // Clear selections
      setSelectAll(false);

      // Refetch to update the list
      fetchPosts();
    } catch (err) {
      console.error("Error bulk deleting posts:", err);
      toast.error("Failed to delete selected posts");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle row click to navigate to post detail
  const handleRowClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  // Function to navigate to edit post page
  const navigateToEditPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/posts/edit/${postId}`);
  };

  // Function to navigate to view a single post
  const navigateToPostDetail = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/posts/${postId}`);
  };

  // Function to clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setSortField("createdAt");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // Function to get status badge class
  const getStatusBadgeClass = (published: boolean) => {
    return published
      ? "badge badge-success bg-green-100 text-green-800"
      : "badge badge-error bg-red-100 text-red-800";
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  };

  return (
    <div className="container mx-auto px-4 pb-12 max-w-7xl">
      <div className="py-6">
        {/* Breadcrumbs */}
        <nav className="flex mb-5" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600"
                onClick={() => navigate("/")}
              >
                <LuHouse className="mr-2 h-4 w-4" />
                Dashboard
              </a>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-sm font-medium text-gray-700">Posts</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Posts</h1>
          <div className="flex gap-3">
            {selectedPosts.length > 0 && (
              <button
                className="btn btn-error btn-sm flex items-center gap-1 transition-all"
                disabled={bulkDeleteLoading}
                onClick={deleteSelectedPosts}
                aria-label="Delete selected posts"
              >
                {bulkDeleteLoading ? (
                  <>
                    <LuLoader
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Delete ({selectedPosts.length})</span>
                  </>
                )}
              </button>
            )}
            <button
              className="btn btn-primary btn-sm flex items-center gap-1"
              onClick={() => navigate("/posts/new")}
              aria-label="Create new post"
            >
              <LuCirclePlus className="h-4 w-4" aria-hidden="true" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Stats summary */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-500">Total Posts</h3>
              <p className="text-2xl font-bold">{totalPosts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
              <h3 className="text-lg font-medium text-gray-500">Published</h3>
              <p className="text-2xl font-bold">
                {posts.filter((post) => post.published).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-amber-500">
              <h3 className="text-lg font-medium text-gray-500">Drafts</h3>
              <p className="text-2xl font-bold">
                {posts.filter((post) => !post.published).length}
              </p>
            </div>
          </div>
        )}

        {/* Filters button (mobile) */}
        <div className="md:hidden mb-4">
          <button
            className="btn btn-outline w-full flex justify-between items-center"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            <span className="flex items-center">
              <LuFilter className="mr-2 h-4 w-4" aria-hidden="true" />
              Filters & Search
            </span>
            <span>{showFilters ? "−" : "+"}</span>
          </button>
        </div>

        {/* Filters and search */}
        <div
          id="filter-panel"
          className={`bg-white shadow-md rounded-lg mb-6 transition-all ${
            showFilters ? "" : "hidden md:block"
          }`}
        >
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <LuSearch
                    className="h-4 w-4 text-gray-500"
                    aria-hidden="true"
                  />
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts..."
                  className="input input-bordered w-full pl-10"
                  aria-label="Search posts"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select select-bordered w-full md:w-48"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="unpublished">Draft</option>
              </select>

              <select
                value={postsPerPage}
                onChange={(e) => {
                  setPostsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing limit
                }}
                className="select select-bordered w-full md:w-36"
                aria-label="Posts per page"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>

              <button
                className="btn btn-outline flex items-center gap-1"
                onClick={clearFilters}
                disabled={
                  !searchQuery &&
                  filterStatus === "all" &&
                  sortField === "createdAt" &&
                  sortDirection === "desc"
                }
                aria-label="Clear all filters"
              >
                <LuRefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            {/* Active filters display */}
            {(searchQuery ||
              filterStatus !== "all" ||
              sortField !== "createdAt" ||
              sortDirection !== "desc") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {searchQuery && (
                  <span className="badge badge-outline gap-1">
                    Search: "{searchQuery}"
                    <button
                      className="ml-1"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search query"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="badge badge-outline gap-1">
                    Status:{" "}
                    {filterStatus === "published" ? "Published" : "Draft"}
                    <button
                      className="ml-1"
                      onClick={() => setFilterStatus("all")}
                      aria-label="Clear status filter"
                    >
                      ×
                    </button>
                  </span>
                )}
                {(sortField !== "createdAt" || sortDirection !== "desc") && (
                  <span className="badge badge-outline gap-1">
                    Sort: {sortField} ({sortDirection})
                    <button
                      className="ml-1"
                      onClick={() => {
                        setSortField("createdAt");
                        setSortDirection("desc");
                      }}
                      aria-label="Clear sort"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table of posts */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden posts-table">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <div
                      className="flex items-center"
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={selectAll}
                      onClick={toggleSelectAll}
                      onKeyDown={(e) => e.key === "Enter" && toggleSelectAll()}
                    >
                      {selectAll ? (
                        <LuSquareCheck
                          className="h-5 w-5 text-primary-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <LuSquare
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      )}
                      <span className="sr-only">Select all</span>
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => handleSort("title")}
                    aria-sort={
                      sortField === "title"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="flex items-center">
                      <span>Title</span> {getSortIcon("title")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none hidden md:table-cell"
                    onClick={() => handleSort("author")}
                    aria-sort={
                      sortField === "author"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="flex items-center">
                      <span>Author</span> {getSortIcon("author")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => handleSort("createdAt")}
                    aria-sort={
                      sortField === "createdAt"
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div className="flex items-center">
                      <span>Date</span> {getSortIcon("createdAt")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="border-b hover:bg-gray-50">
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span
                          className="loading loading-spinner loading-md text-primary-600"
                          aria-hidden="true"
                        ></span>
                        <span>Loading posts...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr className="border-b hover:bg-gray-50">
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-2 text-error">
                        <LuCircleAlert className="h-8 w-8" aria-hidden="true" />
                        <span>{error}</span>
                        <button
                          className="btn btn-sm btn-outline mt-2"
                          onClick={() => fetchPosts()}
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && posts.length === 0 && (
                  <tr className="border-b hover:bg-gray-50">
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-lg">No posts found</span>
                        {(searchQuery || filterStatus !== "all") && (
                          <span className="text-sm text-gray-500">
                            Try adjusting your search filters
                          </span>
                        )}
                        <button
                          className="btn btn-sm btn-outline mt-2"
                          onClick={clearFilters}
                          disabled={!searchQuery && filterStatus === "all"}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(post.id)}
                      tabIndex={0}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleRowClick(post.id)
                      }
                      aria-label={`Post: ${post.title}`}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePostSelection(post.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePostSelection(post.id);
                            }
                          }}
                          tabIndex={0}
                          role="checkbox"
                          aria-checked={selectedPosts.includes(post.id)}
                        >
                          {selectedPosts.includes(post.id) ? (
                            <LuSquareCheck
                              className="h-5 w-5 text-primary-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <LuSquare
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          )}
                          <span className="sr-only">Select post</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="line-clamp-1">{post.title}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-700">
                        {post.author.firstName} {post.author.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={getStatusBadgeClass(post.published)}>
                          {post.published ? "Published" : "Draft"}
                        </span>
                        <button
                          className="ml-2 btn btn-xs btn-ghost hover:bg-transparent"
                          onClick={(e) =>
                            togglePublishStatus(post.id, post.published, e)
                          }
                          title={post.published ? "Unpublish" : "Publish"}
                          aria-label={
                            post.published ? "Unpublish post" : "Publish post"
                          }
                          disabled={loadingPostIds[post.id] === "status"}
                        >
                          {loadingPostIds[post.id] === "status" ? (
                            <LuLoader
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                          ) : post.published ? (
                            <LuCircleX
                              className="h-3 w-3 text-red-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <LuCircleCheck
                              className="h-3 w-3 text-green-600"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={(e) => navigateToEditPost(post.id, e)}
                            disabled={!!loadingPostIds[post.id]}
                            aria-label="Edit post"
                          >
                            <LuPencil className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only md:not-sr-only md:ml-1">
                              Edit
                            </span>
                          </button>
                          <button
                            className="btn btn-xs btn-ghost text-red-600 hover:bg-red-50"
                            onClick={(e) => deletePost(post.id, e)}
                            disabled={!!loadingPostIds[post.id]}
                            aria-label="Delete post"
                          >
                            {loadingPostIds[post.id] === "delete" ? (
                              <LuLoader
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <LuTrash2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                            <span className="sr-only md:not-sr-only md:ml-1">
                              Delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            <div className="text-sm text-gray-500">
              Showing{" "}
              {Math.min((currentPage - 1) * postsPerPage + 1, totalPosts)} -{" "}
              {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts}{" "}
              posts
            </div>

            <nav aria-label="Pagination" className="flex justify-center">
              <ul className="inline-flex -space-x-px">
                <li>
                  <button
                    className="px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    aria-label="Go to first page"
                  >
                    <span className="sr-only">First</span>
                    <LuChevronLeft className="h-5 w-5" aria-hidden="true" />
                    <LuChevronLeft
                      className="h-5 w-5 -ml-3"
                      aria-hidden="true"
                    />
                  </button>
                </li>
                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                  >
                    <span className="sr-only">Previous</span>
                    <LuChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                </li>

                {/* Page numbers */}
                {getPageNumbers().map((pageNum) => (
                  <li key={pageNum}>
                    <button
                      className={`px-3 py-2 leading-tight border hover:bg-gray-100 ${
                        pageNum === currentPage
                          ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100"
                          : "text-gray-500 bg-white border-gray-300"
                      }`}
                      onClick={() => handlePageChange(pageNum)}
                      aria-current={
                        pageNum === currentPage ? "page" : undefined
                      }
                      aria-label={`Go to page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  </li>
                ))}

                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                  >
                    <span className="sr-only">Next</span>
                    <LuChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </li>
                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to last page"
                  >
                    <span className="sr-only">Last</span>
                    <LuChevronRight className="h-5 w-5" aria-hidden="true" />
                    <LuChevronRight
                      className="h-5 w-5 -ml-3"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default Posts;
