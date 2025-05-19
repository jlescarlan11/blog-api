import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LuSearch,
  LuPencil,
  LuTrash2,
  // LuEye, // Removed unused import
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
import { toast } from "react-toastify"; // Assuming react-toastify is installed

// Define types for the post data - Good practice to keep types separate or in a dedicated file
interface Post {
  id: string;
  title: string;
  content: string; // Note: Content is not displayed in the table, but kept in type
  published: boolean;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  // Include tags, views, likes in the type definition as they are fetched
  tags?: string[];
  views?: number;
  likes?: number;
}

// Define types for loading states
type LoadingOperation = "status" | "delete";
type LoadingPostIds = Record<string, LoadingOperation>;

const Posts = () => {
  // --- State Management ---
  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // 'all', 'published', 'unpublished'

  // Sorting states
  const [sortField, setSortField] = useState<string>("createdAt"); // Default sort field
  const [sortDirection, setSortDirection] = useState<string>("desc"); // 'asc' or 'desc'

  // Data states
  const [allPosts, setAllPosts] = useState<Post[]>([]); // Holds ALL fetched posts
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]); // Posts for the current page after filtering/sorting

  // UI states
  const [loading, setLoading] = useState<boolean>(true); // Initial data loading
  const [error, setError] = useState<string | null>(null); // Error state for fetching
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]); // IDs of selected posts
  const [selectAll, setSelectAll] = useState<boolean>(false); // State for select all checkbox

  // Loading states for individual post operations (status toggle, delete)
  const [loadingPostIds, setLoadingPostIds] = useState<LoadingPostIds>({});
  // Loading state for bulk delete operation
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState<boolean>(false);

  // Filter panel visibility (for mobile)
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [postsPerPage, setPostsPerPage] = useState<number>(10); // Number of posts per page

  // Debounced search state - Used to prevent excessive filtering while typing
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Router hook
  const navigate = useNavigate();

  // --- API Endpoints and Authentication ---
  // Get API URLs from environment variables
  // NOTE: Using a new endpoint to fetch ALL posts for client-side processing.
  // For very large datasets, a server-side pagination/filtering approach is recommended.
  const ALL_ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST?.replace(
    "/posts",
    "/all-posts"
  ); // Assuming VITE_ADMIN_POST is like /api/admin/posts
  const ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST; // Keep for individual post operations

  // Retrieve authentication token
  const token = localStorage.getItem("token"); // Consider more secure ways to handle tokens in production

  // --- Effects ---

  // Effect for debouncing the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400); // 400ms delay

    // Cleanup function to clear the timer if searchQuery changes before the delay
    return () => clearTimeout(timer);
  }, [searchQuery]); // Dependency array: runs whenever searchQuery changes

  // Effect to fetch ALL blog posts initially and when API endpoint/token changes
  // Wrapped in useCallback to memoize the function itself
  const fetchAllPosts = useCallback(async () => {
    // Basic validation for API endpoint
    if (!ALL_ADMIN_POSTS_API) {
      console.error("ALL_ADMIN_POSTS_API is not defined.");
      setError("API endpoint is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    try {
      // Fetch ALL posts from the backend
      const response = await axios.get<Post[]>(ALL_ADMIN_POSTS_API, {
        // Explicitly type response data as Post[]
        headers: {
          Authorization: `Bearer ${token}`,
          // Add other necessary headers like Accept, Content-Type
          Accept: "application/json",
        },
      });

      // Store all fetched posts in state
      setAllPosts(response.data);

      // Reset selections and pagination when new data is fetched
      setSelectedPosts([]);
      setSelectAll(false);
      setCurrentPage(1); // Reset to the first page
    } catch (err) {
      console.error("Error fetching all posts:", err);
      // Provide a user-friendly error message using toast
      if (axios.isAxiosError(err)) {
        // Use optional chaining for safety
        toast.error(
          err.response?.data?.message || "Failed to fetch blog posts."
        );
      } else {
        toast.error("An unexpected error occurred while fetching posts.");
      }
      // Set error state for displaying in the UI table (optional, could just rely on toast)
      setError("Failed to fetch blog posts."); // Keep error state for table message
    } finally {
      setLoading(false);
    }
  }, [ALL_ADMIN_POSTS_API, token]); // Dependencies for fetching all posts. Excluded 'error' to prevent infinite loops.

  // Initial data fetch effect
  useEffect(() => {
    fetchAllPosts();
  }, [fetchAllPosts]); // Dependency array: runs only when fetchAllPosts changes (due to useCallback)

  // --- Client-Side Data Processing (Filtering, Sorting, Pagination) ---
  // Use useMemo to optimize filtering and sorting - recalculates only when dependencies change
  const processedPosts = useMemo(() => {
    let filtered = [...allPosts]; // Start with a copy of all posts

    // 1. Filtering
    if (debouncedSearch) {
      const lowerCaseSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          // Search across title, content, and author names (first, last, full)
          post.title.toLowerCase().includes(lowerCaseSearch) ||
          post.content?.toLowerCase().includes(lowerCaseSearch) || // Use optional chaining for content
          post.author.firstName.toLowerCase().includes(lowerCaseSearch) ||
          post.author.lastName.toLowerCase().includes(lowerCaseSearch) ||
          `${post.author.firstName} ${post.author.lastName}` // Search full name
            .toLowerCase()
            .includes(lowerCaseSearch)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (post) =>
          filterStatus === "published" ? post.published : !post.published // Filter by published status
      );
    }

    // 2. Sorting
    filtered.sort((a, b) => {
      // Determine the values to compare based on sortField
      const aValue =
        sortField === "author"
          ? `${a.author.firstName} ${a.author.lastName}`.toLowerCase() // Case-insensitive author sort
          : sortField === "title"
          ? a.title.toLowerCase() // Case-insensitive title sort
          : a[sortField as keyof Post]; // Other fields

      const bValue =
        sortField === "author"
          ? `${b.author.firstName} ${b.author.lastName}`.toLowerCase()
          : sortField === "title"
          ? b.title.toLowerCase()
          : b[sortField as keyof Post];

      // Handle null/undefined values gracefully (place them at the end)
      if (aValue === null || aValue === undefined)
        return sortDirection === "asc" ? 1 : -1; // Nulls at end for asc, beginning for desc
      if (bValue === null || bValue === undefined)
        return sortDirection === "asc" ? -1 : 1;

      // Perform comparison based on value types
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue) // String comparison
          : bValue.localeCompare(aValue);
      }

      // Numeric or Date comparison
      // Ensure values are treated as numbers or dates for comparison
      const numA =
        typeof aValue === "string"
          ? new Date(aValue).getTime()
          : (aValue as number);
      const numB =
        typeof bValue === "string"
          ? new Date(bValue).getTime()
          : (bValue as number);

      if (numA < numB) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (numA > numB) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0; // Values are equal
    });

    return filtered; // Return the processed array
  }, [allPosts, debouncedSearch, filterStatus, sortField, sortDirection]); // Dependencies

  // Effect to update displayed posts whenever processedPosts or pagination state changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    // Slice the processed (filtered/sorted) array for the current page
    setDisplayedPosts(processedPosts.slice(startIndex, endIndex));
  }, [processedPosts, currentPage, postsPerPage]); // Dependencies

  // Calculate total pages based on the *processed* posts count
  const totalPosts = processedPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Effect to reset current page if it goes out of bounds after filtering/sorting
  useEffect(() => {
    // Ensure currentPage is valid after filtering/sorting changes the totalPages
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages); // Go to the last page if current page is beyond new total
    } else if (currentPage < 1 && totalPages > 0) {
      setCurrentPage(1); // Ensure page is at least 1
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1); // If no posts, reset to page 1 (table will show no data)
    }
  }, [totalPages, currentPage]); // Dependencies

  // --- Handlers ---

  // Handle page change
  const handlePageChange = (page: number) => {
    // Validate page number
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Optional: Scroll to top of table when changing pages for better UX
      document
        .querySelector(".posts-table") // Use a specific class or ref for the table container
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle sort change
  const handleSort = (field: string) => {
    // If clicking the same field, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new field, set field and default to descending sort
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Get sort icon for table headers
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null; // No icon if not sorting by this field
    return sortDirection === "asc" ? (
      <LuArrowUp className="inline-block ml-1 h-4 w-4" aria-hidden="true" />
    ) : (
      <LuArrowDown className="inline-block ml-1 h-4 w-4" aria-hidden="true" />
    );
  };

  // Function to format date string
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        // Consider adding time if relevant: hour: 'numeric', minute: 'numeric'
      };
      return date.toLocaleDateString(undefined, options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date"; // Return fallback on error
    }
  };

  // Toggle individual post selection
  const togglePostSelection = (postId: string) => {
    setSelectedPosts(
      (prev) =>
        prev.includes(postId)
          ? prev.filter((id) => id !== postId) // Deselect if already selected
          : [...prev, postId] // Select if not selected
    );
  };

  // Toggle select all posts on the current page
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPosts([]); // Deselect all
    } else {
      // Select all posts currently *displayed* on the page
      setSelectedPosts(displayedPosts.map((post) => post.id));
    }
    // Note: The selectAll state is also managed by an effect based on selectedPosts vs displayedPosts
  };

  // Effect to update selectAll checkbox state based on currently displayed posts selection
  useEffect(() => {
    // Check if all posts on the current page are selected
    const allDisplayedSelected =
      displayedPosts.length > 0 && // Only check if there are posts displayed
      displayedPosts.every((post) => selectedPosts.includes(post.id));
    setSelectAll(allDisplayedSelected);
  }, [selectedPosts, displayedPosts]); // Dependencies: runs when selectedPosts or displayedPosts change

  // Function to toggle post publish status (Publish/Unpublish)
  const togglePublishStatus = async (
    postId: string,
    currentStatus: boolean,
    e: React.MouseEvent // Use React.MouseEvent for event type
  ) => {
    e.stopPropagation(); // Prevent the row click event from firing

    // Basic validation for API endpoint
    if (!ADMIN_POSTS_API) {
      console.error("ADMIN_POSTS_API is not defined.");
      toast.error("API endpoint is not configured for this action.");
      return;
    }

    // Set loading state for this specific post with 'status' operation type
    setLoadingPostIds((prev) => ({ ...prev, [postId]: "status" }));

    try {
      // Send PATCH request to update status using the main PATCH route
      await axios.patch(
        `${ADMIN_POSTS_API}/${postId}`, // Use the main PATCH route
        { published: !currentStatus }, // Send only the published status
        { headers: { Authorization: `Bearer ${token}` } } // Include token
      );

      // Show success toast notification
      toast.success(
        `Post ${!currentStatus ? "published" : "unpublished"} successfully`
      );

      // Refetch all posts to update the local state and UI
      fetchAllPosts();
    } catch (err) {
      console.error("Error toggling publish status:", err);
      // Provide a user-friendly error message using toast
      if (axios.isAxiosError(err)) {
        toast.error(
          err.response?.data?.message || "Failed to update post status"
        );
      } else {
        toast.error("An unexpected error occurred while updating status.");
      }
    } finally {
      // Clear loading state for this post after operation completes
      setLoadingPostIds((prev) => {
        const updated = { ...prev };
        delete updated[postId]; // Remove the post ID from loading state
        return updated;
      });
    }
  };

  // Function to delete a single post
  const deletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click

    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return; // Abort if user cancels
    }

    // Basic validation for API endpoint
    if (!ADMIN_POSTS_API) {
      console.error("ADMIN_POSTS_API is not defined.");
      toast.error("API endpoint is not configured for this action.");
      return;
    }

    // Set loading state for this specific post with 'delete' operation type
    setLoadingPostIds((prev) => ({ ...prev, [postId]: "delete" }));

    console.log(`${ADMIN_POSTS_API}/${postId}`);
    try {
      // Send DELETE request
      await axios.delete(`${ADMIN_POSTS_API}/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }, // Include token
      });

      // Show success toast
      toast.success("Post deleted successfully");

      // Refetch all posts to update the local state and UI
      fetchAllPosts();
    } catch (err) {
      console.error("Error deleting post:", err);
      // Provide a user-friendly error message using toast
      if (axios.isAxiosError(err)) {
        // Use optional chaining for safety
        toast.error(err.response?.data?.message || "Failed to delete post");
      } else {
        toast.error("An unexpected error occurred while deleting post.");
      }
    } finally {
      // Clear loading state for this post
      setLoadingPostIds((prev) => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    }
  };

  // Function to delete multiple selected posts (Bulk Delete)
  const deleteSelectedPosts = async () => {
    if (selectedPosts.length === 0) {
      toast.info("No posts selected for deletion.");
      return; // Do nothing if no posts are selected
    }

    // Confirmation dialog for bulk delete
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedPosts.length} selected posts?`
      )
    ) {
      return; // Abort if user cancels
    }

    // Basic validation for API endpoint
    if (!ADMIN_POSTS_API) {
      console.error("ADMIN_POSTS_API is not defined.");
      toast.error("API endpoint is not configured for this action.");
      return;
    }

    // Set bulk delete loading state
    setBulkDeleteLoading(true);

    try {
      // Send POST request for bulk deletion
      await axios.post(
        `${ADMIN_POSTS_API}/bulk-delete`,
        { postIds: selectedPosts }, // Send array of IDs
        { headers: { Authorization: `Bearer ${token}` } } // Include token
      );

      // Show success toast
      toast.success(`${selectedPosts.length} posts deleted successfully`);

      // Clear selections and reset selectAll state
      setSelectedPosts([]);
      setSelectAll(false);

      // Refetch all posts to update the local state and UI
      fetchAllPosts();
    } catch (err) {
      console.error("Error bulk deleting posts:", err);
      // Provide a user-friendly error message using toast
      if (axios.isAxiosError(err)) {
        // Use optional chaining for safety
        toast.error(
          err.response?.data?.message || "Failed to delete selected posts"
        );
      } else {
        toast.error("An unexpected error occurred during bulk deletion.");
      }
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle row click to navigate to post detail page
  const handleRowClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  // Function to navigate to edit post page
  const navigateToEditPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    // Navigate to the new edit route format
    navigate(`/posts/${postId}/edit`);
  };

  // Function to clear all filters and reset pagination/sorting
  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setSortField("createdAt");
    setSortDirection("desc");
    setCurrentPage(1); // Reset pagination
    setPostsPerPage(10); // Reset posts per page
  };

  // Function to get status badge Tailwind classes
  const getStatusBadgeClass = (published: boolean) => {
    // Use template literals for cleaner class string
    return `badge ${
      published
        ? "badge-success bg-green-100 text-green-800"
        : "badge-error bg-red-100 text-red-800"
    }`;
  };

  // Generate page numbers for pagination display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Number of page buttons to display around current page

    // If total pages are less than or equal to max pages to show, display all
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Logic to show a range of pages around the current page
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      // Adjust start and end if we're near the beginning or end to ensure maxPagesToShow are shown
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      if (startPage < 1) {
        // Ensure startPage is never less than 1
        startPage = 1;
        endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    return pageNumbers;
  };

  // --- Render ---
  return (
    <div className="container mx-auto px-4 pb-12 max-w-7xl">
      <div className="py-6">
        {/* Breadcrumbs */}
        <nav className="flex mb-5" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              {/* Use button or div with role="link" if not using react-router-dom Link */}
              <button
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                onClick={() => navigate("/")}
                aria-label="Go to Dashboard"
              >
                <LuHouse className="mr-2 h-4 w-4" aria-hidden="true" />
                Dashboard
              </button>
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
            {/* Bulk Delete Button - Only show if posts are selected */}
            {selectedPosts.length > 0 && (
              <button
                className="btn btn-error btn-sm flex items-center gap-1 transition-all rounded-md" // Added rounded-md
                disabled={bulkDeleteLoading} // Disable while loading
                onClick={deleteSelectedPosts}
                aria-label={`Delete ${selectedPosts.length} selected posts`} // Dynamic label
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
            {/* New Post Button */}
            <button
              className="btn btn-primary btn-sm flex items-center gap-1 rounded-md" // Added rounded-md
              onClick={() => navigate("/posts/new")}
              aria-label="Create new post"
            >
              <LuCirclePlus className="h-4 w-4" aria-hidden="true" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Stats summary - Only show if data is loaded and no error */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* Total Posts Card */}
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
              <h3 className="text-lg font-medium text-gray-500">Total Posts</h3>
              <p className="text-2xl font-bold">{allPosts.length}</p>
              {/* Use allPosts.length for total count */}
            </div>
            {/* Published Posts Card */}
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
              <h3 className="text-lg font-medium text-gray-500">Published</h3>
              <p className="text-2xl font-bold">
                {allPosts.filter((post) => post.published).length}
                {/* Count published from allPosts */}
              </p>
            </div>
            {/* Draft Posts Card */}
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-amber-500">
              <h3 className="text-lg font-medium text-gray-500">Drafts</h3>
              <p className="text-2xl font-bold">
                {allPosts.filter((post) => !post.published).length}
                {/* Count drafts from allPosts */}
              </p>
            </div>
          </div>
        )}

        {/* Filters button (mobile toggle) */}
        <div className="md:hidden mb-4">
          <button
            className="btn btn-outline w-full flex justify-between items-center rounded-md" // Added rounded-md
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters} // ARIA attribute for accessibility
            aria-controls="filter-panel" // Link button to filter panel element
          >
            <span className="flex items-center">
              <LuFilter className="mr-2 h-4 w-4" aria-hidden="true" />
              Filters & Search
            </span>
            <span>{showFilters ? "−" : "+"}</span>
            {/* Visual indicator for panel state */}
          </button>
        </div>

        {/* Filters and search panel */}
        <div
          id="filter-panel" // ID for ARIA control
          className={`bg-white shadow-md rounded-lg mb-6 transition-all duration-300 ease-in-out ${
            showFilters
              ? "max-h-screen opacity-100"
              : "max-h-0 opacity-0 md:max-h-screen md:opacity-100" // Transition effect
          } overflow-hidden md:overflow-visible`} // Hide overflow when collapsed
        >
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
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
                  className="input input-bordered w-full pl-10 focus:border-primary-500 focus:ring-primary-500 rounded-md" // Add focus styles and rounded-md
                  aria-label="Search posts by title, content, or author" // Descriptive ARIA label
                />
              </div>

              {/* Status Filter Select */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1); // Reset pagination on filter change
                }}
                className="select select-bordered w-full md:w-48 focus:border-primary-500 focus:ring-primary-500 rounded-md" // Added rounded-md
                aria-label="Filter posts by status"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="unpublished">Draft</option>
              </select>

              {/* Posts Per Page Select */}
              <select
                value={postsPerPage}
                onChange={(e) => {
                  setPostsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing limit
                }}
                className="select select-bordered w-full md:w-36 focus:border-primary-500 focus:ring-primary-500 rounded-md" // Added rounded-md
                aria-label="Number of posts per page"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>

              {/* Reset Filters Button */}
              <button
                className="btn btn-outline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md" // Add focus styles and rounded-md
                onClick={clearFilters}
                // Disable button if filters are already at default state
                disabled={
                  !searchQuery &&
                  filterStatus === "all" &&
                  sortField === "createdAt" &&
                  sortDirection === "desc" &&
                  currentPage === 1 &&
                  postsPerPage === 10
                }
                aria-label="Clear all search filters and reset pagination" // Descriptive ARIA label
              >
                <LuRefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            {/* Active filters display */}
            {(searchQuery ||
              filterStatus !== "all" ||
              sortField !== "createdAt" ||
              sortDirection !== "desc" ||
              currentPage !== 1 ||
              postsPerPage !== 10) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700">
                <span className="font-medium">Active Filters:</span>
                {searchQuery && (
                  <span className="badge badge-outline gap-1 rounded-md">
                    {" "}
                    {/* Added rounded-md */}
                    Search: "{searchQuery}"
                    <button
                      className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search query filter" // ARIA label for filter removal
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="badge badge-outline gap-1 rounded-md">
                    {" "}
                    {/* Added rounded-md */}
                    Status:{" "}
                    {filterStatus === "published" ? "Published" : "Draft"}
                    <button
                      className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                      onClick={() => setFilterStatus("all")}
                      aria-label="Clear status filter"
                    >
                      ×
                    </button>
                  </span>
                )}
                {(sortField !== "createdAt" || sortDirection !== "desc") && (
                  <span className="badge badge-outline gap-1 rounded-md">
                    {" "}
                    {/* Added rounded-md */}
                    Sort:{" "}
                    {sortField === "createdAt"
                      ? "Date"
                      : sortField === "author"
                      ? "Author"
                      : sortField}{" "}
                    ({sortDirection === "asc" ? "Asc" : "Desc"}){" "}
                    {/* Display full sort direction */}
                    <button
                      className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                      onClick={() => {
                        setSortField("createdAt");
                        setSortDirection("desc");
                      }}
                      aria-label="Clear sort filter"
                    >
                      ×
                    </button>
                  </span>
                )}
                {(currentPage !== 1 || postsPerPage !== 10) && (
                  <span className="badge badge-outline gap-1 rounded-md">
                    {" "}
                    {/* Added rounded-md */}
                    Page: {currentPage}, Limit: {postsPerPage}
                    <button
                      className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                      onClick={() => {
                        setCurrentPage(1);
                        setPostsPerPage(10);
                      }}
                      aria-label="Reset pagination filters"
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
          {/* Use role="table" for semantic HTML */}
          <table className="w-full text-sm text-left" role="table">
            {/* Use role="thead" */}
            <thead className="text-xs uppercase bg-gray-50" role="rowgroup">
              {/* Use role="row" */}
              <tr role="row">
                {/* Select All Checkbox Header */}
                <th className="px-4 py-3 w-10" scope="col" role="columnheader">
                  <div
                    className="flex items-center cursor-pointer"
                    role="checkbox" // ARIA role
                    tabIndex={0} // Make focusable
                    aria-checked={selectAll} // ARIA state
                    onClick={toggleSelectAll}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && toggleSelectAll()
                    } // Keyboard accessibility
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
                    <span className="sr-only">
                      Select all posts on current page
                    </span>
                    {/* Screen reader text */}
                  </div>
                </th>
                {/* Title Header - Clickable for sorting */}
                <th
                  className="px-4 py-3 cursor-pointer select-none"
                  onClick={() => handleSort("title")}
                  aria-sort={
                    // ARIA sort state
                    sortField === "title"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  scope="col" // Table header scope
                  role="columnheader"
                >
                  <div className="flex items-center">
                    <span>Title</span> {getSortIcon("title")}
                  </div>
                </th>
                {/* Author Header - Clickable for sorting (hidden on small screens) */}
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
                  scope="col"
                  role="columnheader"
                >
                  <div className="flex items-center">
                    <span>Author</span> {getSortIcon("author")}
                  </div>
                </th>
                {/* Date Header - Clickable for sorting */}
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
                  scope="col"
                  role="columnheader"
                >
                  <div className="flex items-center">
                    <span>Date</span> {getSortIcon("createdAt")}
                  </div>
                </th>
                {/* Status Header */}
                <th
                  className="px-4 py-3 text-center"
                  scope="col"
                  role="columnheader"
                >
                  Status
                </th>
                {/* Actions Header */}
                <th
                  className="px-4 py-3 text-right"
                  scope="col"
                  role="columnheader"
                >
                  Actions
                </th>
              </tr>
            </thead>
            {/* Use role="tbody" */}
            <tbody role="rowgroup">
              {/* Loading State Row */}
              {loading && (
                <tr className="border-b hover:bg-gray-50" role="row">
                  <td colSpan={6} className="text-center py-12" role="cell">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span
                        className="loading loading-spinner loading-md text-primary-600"
                        aria-label="Loading posts" // ARIA label for spinner
                      ></span>
                      <span>Loading posts...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Error State Row */}
              {!loading && error && (
                <tr className="border-b hover:bg-gray-50" role="row">
                  <td colSpan={6} className="text-center py-12" role="cell">
                    <div className="flex flex-col items-center justify-center gap-2 text-error">
                      <LuCircleAlert className="h-8 w-8" aria-hidden="true" />
                      <span>{error}</span>
                      <button
                        className="btn btn-sm btn-outline mt-2 focus:outline-none focus:ring-2 focus:ring-error-500 rounded-md" // Added rounded-md
                        onClick={() => fetchAllPosts()} // Retry fetching
                        aria-label="Retry fetching posts"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* No Data State Row */}
              {!loading && !error && displayedPosts.length === 0 && (
                <tr className="border-b hover:bg-gray-50" role="row">
                  <td colSpan={6} className="text-center py-12" role="cell">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-lg">No posts found</span>
                      {(searchQuery || filterStatus !== "all") && (
                        <span className="text-sm text-gray-500">
                          Try adjusting your search filters
                        </span>
                      )}
                      <button
                        className="btn btn-sm btn-outline mt-2 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md" // Added rounded-md
                        onClick={clearFilters}
                        disabled={
                          !searchQuery &&
                          filterStatus === "all" &&
                          currentPage === 1 &&
                          postsPerPage === 10
                        }
                        aria-label="Clear all filters"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                !error &&
                displayedPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(post.id)} // Navigate on row click
                    tabIndex={0} // Make row focusable
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRowClick(post.id)
                    } // Keyboard navigation for row click
                    aria-label={`Post: ${post.title}`} // ARIA label for the row
                    role="row" // ARIA role
                  >
                    {/* Checkbox Cell */}
                    <td className="px-4 py-3" role="cell">
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click when clicking checkbox
                          togglePostSelection(post.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault(); // Prevent default space/enter behavior on div
                            e.stopPropagation();
                            togglePostSelection(post.id);
                          }
                        }}
                        tabIndex={0} // Make checkbox container focusable
                        role="checkbox" // ARIA role
                        aria-checked={selectedPosts.includes(post.id)} // ARIA state
                        aria-label={`Select post ${post.title}`} // ARIA label for checkbox
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
                        {/* Screen reader text */}
                      </div>
                    </td>
                    {/* Title Cell */}
                    <td
                      className="px-4 py-3 font-medium text-gray-900"
                      role="cell"
                    >
                      {/* Use line-clamp for truncated title */}
                      <div className="line-clamp-1">{post.title}</div>
                    </td>
                    {/* Author Cell (hidden on small screens) */}
                    <td
                      className="px-4 py-3 hidden md:table-cell text-gray-700"
                      role="cell"
                    >
                      {post.author.firstName} {post.author.lastName}
                    </td>
                    {/* Date Cell */}
                    <td className="px-4 py-3 text-gray-700" role="cell">
                      {formatDate(post.createdAt)}
                    </td>
                    {/* Status Cell */}
                    <td className="px-4 py-3 text-center" role="cell">
                      <span className={getStatusBadgeClass(post.published)}>
                        {post.published ? "Published" : "Draft"}
                      </span>
                      {/* Publish/Unpublish Toggle Button */}
                      <button
                        className="ml-2 btn btn-xs btn-ghost hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-gray-400 rounded" // Added rounded
                        onClick={(e) =>
                          togglePublishStatus(post.id, post.published, e)
                        }
                        title={post.published ? "Unpublish" : "Publish"} // Tooltip
                        aria-label={
                          // ARIA label for accessibility
                          post.published
                            ? `Unpublish post "${post.title}"`
                            : `Publish post "${post.title}"`
                        }
                        disabled={!!loadingPostIds[post.id]} // Disable if this post is loading
                      >
                        {/* Show loader if status toggle is in progress for this post */}
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
                    {/* Actions Cell */}
                    <td className="px-4 py-3" role="cell">
                      <div className="flex justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          className="btn btn-xs btn-ghost focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" // Added rounded
                          onClick={(e) => navigateToEditPost(post.id, e)}
                          disabled={!!loadingPostIds[post.id]} // Disable if this post is loading
                          aria-label={`Edit post "${post.title}"`} // ARIA label
                        >
                          <LuPencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only md:not-sr-only md:ml-1">
                            Edit
                          </span>
                          {/* Show text on medium screens and up */}
                        </button>
                        {/* Delete Button */}
                        <button
                          className="btn btn-xs btn-ghost text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 rounded" // Added rounded
                          onClick={(e) => deletePost(post.id, e)}
                          disabled={!!loadingPostIds[post.id]} // Disable if this post is loading
                          aria-label={`Delete post "${post.title}"`} // ARIA label
                        >
                          {/* Show loader if delete is in progress for this post */}
                          {loadingPostIds[post.id] === "delete" ? (
                            <LuLoader
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span className="sr-only md:not-sr-only md:ml-1">
                            Delete
                          </span>
                          {/* Show text on medium screens and up */}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            {/* Pagination Summary */}
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">
                {Math.min((currentPage - 1) * postsPerPage + 1, totalPosts)}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(currentPage * postsPerPage, totalPosts)}
              </span>{" "}
              of <span className="font-medium">{totalPosts}</span> posts
              {/* Indicate if filters are active */}
              {(searchQuery || filterStatus !== "all") && (
                <span className="text-gray-500">(filtered)</span>
              )}
            </div>

            {/* Pagination Controls */}
            <nav aria-label="Pagination" className="flex justify-center">
              <ul className="inline-flex -space-x-px rounded-md shadow-sm">
                {/* First Page Button */}
                <li>
                  <button
                    className="px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" // Standardized to rounded-l-md
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    aria-label="Go to first page"
                  >
                    <span className="sr-only">First</span>
                    <LuChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <LuChevronLeft
                      className="h-4 w-4 -ml-2" // Adjusted margin
                      aria-hidden="true"
                    />
                  </button>
                </li>
                {/* Previous Page Button */}
                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" // Add focus styles
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                  >
                    <span className="sr-only">Previous</span>
                    <LuChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>

                {/* Page numbers */}
                {getPageNumbers().map((pageNum) => (
                  <li key={pageNum}>
                    <button
                      className={`px-3 py-2 leading-tight border focus:outline-none focus:ring-2 ${
                        // Add focus styles
                        pageNum === currentPage
                          ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500" // Active page styles
                          : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 focus:ring-gray-500" // Inactive page styles
                      }`}
                      onClick={() => handlePageChange(pageNum)}
                      aria-current={
                        // ARIA attribute for current page
                        pageNum === currentPage ? "page" : undefined
                      }
                      aria-label={`Go to page ${pageNum}`} // ARIA label
                    >
                      {pageNum}
                    </button>
                  </li>
                ))}

                {/* Next Page Button */}
                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" // Add focus styles
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                  >
                    <span className="sr-only">Next</span>
                    <LuChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
                {/* Last Page Button */}
                <li>
                  <button
                    className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" // Standardized to rounded-r-md
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to last page"
                  >
                    <span className="sr-only">Last</span>
                    <LuChevronRight className="h-4 w-4" aria-hidden="true" />
                    <LuChevronRight
                      className="h-4 w-4 -ml-2" // Adjusted margin
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
