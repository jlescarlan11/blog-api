import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  LuCalendar,
  LuArrowLeft,
  LuPencil,
  LuTrash2,
  LuLoader,
  LuShare2,
  LuMessageCircle,
  LuClock,
  LuCornerDownLeft,
  LuCircleX,
  LuTag,
  LuThumbsUp,
  LuEye,
  LuCircleAlert,
  LuX,
} from "react-icons/lu";
import DOMPurify from "dompurify";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../context/AuthContext";

// --- Interfaces ---

// Defines the structure for a blog post
interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  likes: number;
  views?: number;
  comments: Comment[];
  hasLiked?: boolean; // Indicates if the current user has liked the post
}

// Defines the structure for a comment
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id?: string; // User ID might be optional depending on backend structure
    firstName: string;
    lastName: string;
  };
}

/**
 * Renders a single blog post, displaying its content, metadata,
 * comments, and providing interactive features like liking, sharing,
 * and commenting. Includes admin functionalities for editing and deleting.
 */
const Post = () => {
  // --- Hooks and State ---

  const { postId } = useParams<{ postId: string }>(); // Get post ID from URL
  const navigate = useNavigate(); // Navigation hook

  // State for the fetched post data
  const [post, setPost] = useState<Post | null>(null);
  // State for loading indicators
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  // State for error handling
  const [error, setError] = useState<string | null>(null);

  // State for UI visibility
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State for the new comment input
  const [commentText, setCommentText] = useState("");

  // Get authenticated user and their role from AuthContext
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Ref to track if a view has been registered for the current post ID.
  // This prevents incrementing the view count on component re-renders
  // or when navigating back to the same post from elsewhere.
  // FIX: Update ref type to include undefined as useParams can return undefined
  const registeredViewId = useRef<string | undefined>(undefined);

  // --- Constants and Environment Variables ---

  const POSTS_API = import.meta.env.VITE_POST_API;
  const COMMENT_API = import.meta.env.VITE_COMMENT_API;
  const ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST;
  const token = localStorage.getItem("token"); // Get auth token

  // --- Data Fetching ---

  /**
   * Fetches the post data from the API.
   * Uses useCallback to memoize the function, optimizing performance
   * by preventing unnecessary re-creations on renders.
   */
  const fetchPost = useCallback(async () => {
    if (!postId) {
      // If postId is not available, set error and stop loading
      setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get<Post>(`${POSTS_API}/${postId}`, {
        headers,
      });

      const fetchedPost = response.data;

      // Senior Dev Principle: Sort comments once after fetching, not in render.
      if (fetchedPost.comments && fetchedPost.comments?.length > 0) {
        fetchedPost.comments.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // Sort newest first
        );
        // Automatically show comments if there are any initially
        setShowComments(true);
      } else {
        // Ensure comments are an empty array if null/undefined
        fetchedPost.comments = [];
      }

      setPost(fetchedPost);
      document.title = `${fetchedPost.title} | Blog`; // Update page title
    } catch (err) {
      console.error("Error fetching post:", err);
      // Provide a more specific error message based on the error object if possible
      const errorMessage =
        axios.isAxiosError(err) && err.response?.status === 404
          ? "The post was not found."
          : "Failed to load the post. It may be unavailable.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [postId, POSTS_API, token]); // Dependencies: fetchPost should re-create if these change

  // Effect to fetch the post when the component mounts or postId changes
  useEffect(() => {
    fetchPost();

    // Cleanup function: Reset document title when the component unmounts
    return () => {
      document.title = "Blog";
    };
  }, [fetchPost]); // Dependency array includes fetchPost

  // Effect to register a view for the post.
  // This effect runs when the post data is successfully loaded and the
  // view hasn't been registered for this specific post ID yet.
  useEffect(() => {
    // Only register if post data is available, user is authenticated,
    // and the current post ID hasn't been registered yet in the ref.
    if (post && token && postId && registeredViewId.current !== postId) {
      const registerView = async () => {
        try {
          await axios.post(
            `${POSTS_API}/${postId}/view`,
            {}, // Empty body is typical for a view endpoint
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log(`View registered for post ${postId}`);
          // Senior Dev Principle: Update the ref *after* successful API call.
          registeredViewId.current = postId;
          // Optional: Refetch post to show updated view count immediately
          // fetchPost(); // Uncomment if you want real-time view count update
        } catch (viewErr) {
          console.error("Failed to register view:", viewErr);
          // No user-facing toast for view registration errors, as it's background task
        }
      };

      registerView();
    }
    // Dependencies: post (to ensure data is loaded), token (for auth), postId (to trigger on ID change)
  }, [post, token, postId, POSTS_API]);

  // --- API Actions ---

  /**
   * Handles the deletion of the current post.
   * Accessible only to admin users.
   */
  const deletePost = async () => {
    setDeleteLoading(true); // Indicate loading state for deletion

    try {
      // Use the admin-specific API endpoint for deletion
      await axios.delete(`${ADMIN_POSTS_API}/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Post deleted successfully");
      navigate("/posts"); // Navigate back to the posts list
    } catch (err) {
      console.error("Error deleting post:", err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to delete post.";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false); // Close the confirmation modal
    }
  };

  /**
   * Handles the submission of a new comment for the post.
   */
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser form submission

    if (!token) {
      toast.info("Please sign in to comment");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmittingComment(true); // Indicate comment submission loading

    try {
      // Post the new comment data to the API
      await axios.post(
        `${POSTS_API}/${postId}/comments`,
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCommentText(""); // Clear the input field
      toast.success("Comment added successfully");
      fetchPost(); // Refetch post data to include the new comment
      setShowComments(true); // Ensure comments section is visible
    } catch (err) {
      console.error("Error submitting comment:", err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to submit comment.";
      toast.error(errorMessage);
    } finally {
      setSubmittingComment(false); // Reset submission loading state
    }
  };

  /**
   * Handles the deletion of a specific comment.
   * Accessible only to admin users.
   */
  const deleteComment = async (commentId: string) => {
    // Senior Dev Principle: Use a more robust confirmation than window.confirm
    // in a real application (e.g., a custom modal), but window.confirm is acceptable for basic cases.
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    setDeletingCommentId(commentId); // Indicate which comment is being deleted

    try {
      // Use the comment-specific API endpoint for deletion
      await axios.delete(`${COMMENT_API}/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Comment deleted successfully");
      fetchPost(); // Refetch post data to remove the deleted comment
    } catch (err) {
      console.error(`Error deleting comment ${commentId}:`, err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to delete comment.";
      toast.error(errorMessage);
    } finally {
      setDeletingCommentId(null); // Reset deleting state
    }
  };

  /**
   * Toggles the like status of the post (like/unlike).
   */
  const toggleLike = async () => {
    if (!token) {
      toast.info("Please sign in to like posts");
      return;
    }
    if (!postId || !post) return; // Ensure post data is available

    try {
      // Send POST request to the like endpoint. The backend should handle
      // whether it's a like or unlike based on the user's current status.
      const response = await axios.post(
        `${POSTS_API}/${postId}/like`,
        {}, // Empty body
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Get updated like count and liked status from the response
      const { likes: newLikesCount, liked: newLikedStatus } = response.data;

      // Update the post state immutably
      setPost((prevPost) => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          likes: newLikesCount,
          hasLiked: newLikedStatus,
        };
      });

      // Show success toast based on the action performed
      toast.success(newLikedStatus ? "Post liked!" : "Post unliked.");
    } catch (err) {
      console.error("Error toggling like:", err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to toggle like status.";
      toast.error(errorMessage);
    }
  };

  /**
   * Handles sharing the post using the Web Share API or copying the link to clipboard.
   */
  const handleShare = async () => {
    try {
      // Check if Web Share API is supported by the browser
      if (navigator.share) {
        await navigator.share({
          title: post?.title || "Blog Post", // Use post title if available
          url: window.location.href, // Share the current page URL
        });
        toast.success("Post shared successfully");
      } else {
        // Fallback: Copy the current page URL to the clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // FIX: Check if error is an Error object and access its name property
      // Handle user dismissing the share dialog gracefully
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Failed to share post");
      } else if (!(error instanceof Error)) {
        // Handle non-Error objects if necessary, though less common for AbortError
        toast.error("Failed to share post");
      }
    }
  };

  // --- Utility Functions ---

  /**
   * Formats a date string into a human-readable format (e.g., "March 8, 2023").
   * Includes basic error handling for invalid date strings.
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return "Invalid Date";

    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };

      const date = new Date(dateString);
      // Check if the parsed date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return date.toLocaleDateString(undefined, options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  /**
   * Toggles the visibility of the comments section.
   */
  const toggleCommentsVisibility = () => {
    setShowComments(!showComments);
  };

  // --- Render Logic ---

  // Show loading spinner while fetching the post initially
  if (loading && !post) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-base-content/70">Loading post...</p>
        </div>
      </div>
    );
  }

  // Show error message if fetching failed
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl border border-error/20 rounded-lg">
          <div className="card-body items-center text-center">
            <LuCircleAlert className="w-16 h-16 text-error mb-4" />
            <h2 className="card-title text-error">Error Loading Post</h2>
            <p>{error}</p>
            <div className="card-actions mt-6">
              <button
                className="btn btn-primary rounded-md"
                onClick={() => navigate("/posts")}
              >
                <LuArrowLeft className="mr-2" /> Back to Posts
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "Not Found" message if post is null after loading completes without error
  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl rounded-lg">
          <div className="card-body items-center text-center">
            <LuCircleAlert className="w-16 h-16 text-warning mb-4" />
            <h2 className="card-title">Post Not Found</h2>
            <p>
              The post you're looking for doesn't exist or has been removed.
            </p>
            <div className="card-actions mt-6">
              <button
                className="btn btn-primary rounded-md"
                onClick={() => navigate("/posts")}
              >
                <LuArrowLeft className="mr-2" /> Back to Posts
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Modals ---

  // Component for the delete confirmation modal
  const DeleteConfirmationModal = () => (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        showDeleteConfirm ? "" : "hidden" // Hide/show based on state
      }`}
    >
      {/* Overlay background */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setShowDeleteConfirm(false)} // Close modal on overlay click
      ></div>
      {/* Modal content card */}
      <div className="card w-96 bg-base-100 shadow-xl relative z-10 rounded-lg">
        <div className="card-body">
          {/* Close button */}
          <button
            className="btn btn-sm btn-circle absolute right-2 top-2"
            onClick={() => setShowDeleteConfirm(false)}
            aria-label="Close modal"
          >
            <LuX />
          </button>
          {/* Modal title and message */}
          <h3 className="font-bold text-lg text-center mb-2">Delete Post</h3>
          <p className="text-center mb-4">
            Are you sure you want to delete this post? This action cannot be
            undone.
          </p>
          {/* Action buttons */}
          <div className="flex justify-center gap-4">
            <button
              className="btn btn-outline rounded-md"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-error rounded-md"
              disabled={deleteLoading} // Disable while deleting
              onClick={deletePost} // Call delete function on click
            >
              {deleteLoading ? (
                <>
                  <LuLoader className="animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <LuTrash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Main Component Render ---

  return (
    <>
      {/* Main container */}
      <div className="container max-w-4xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-12">
          {/* Breadcrumbs */}
          <div className="text-sm breadcrumbs mb-6">
            <ul>
              <li>
                <a
                  className="hover:underline cursor-pointer"
                  onClick={() => navigate("/")}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  className="hover:underline cursor-pointer"
                  onClick={() => navigate("/posts")}
                >
                  Posts
                </a>
              </li>
              {/* Truncate long post titles in breadcrumbs for small screens */}
              <li className="text-base-content/70 truncate max-w-[200px] sm:max-w-none">
                {post.title}
              </li>
            </ul>
          </div>

          {/* Post Header Section */}
          <div className="mb-10">
            {/* Post Title */}
            <h1 className="text-4xl font-bold leading-tight mb-6">
              {post.title}
            </h1>

            {/* Unpublished Badge (if applicable) */}
            {!post.published && (
              <div className="badge badge-warning mb-3 rounded-md">
                Unpublished
              </div>
            )}

            {/* Post Metadata (Author, Date, Views, Likes, Comments) */}
            <div className="flex flex-wrap items-center gap-5 text-base-content/70 mb-6">
              {/* Author Info */}
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="text-xs">
                      {post.author.firstName?.charAt(0) || ""}
                      {post.author.lastName?.charAt(0) || ""}
                    </span>
                  </div>
                </div>
                <span className="font-medium">
                  {post.author.firstName} {post.author.lastName}
                </span>
              </div>

              {/* Creation Date */}
              <div className="flex items-center gap-1.5">
                <LuCalendar className="h-4 w-4" />
                <span>{formatDate(post.createdAt)}</span>
              </div>

              {/* Updated Date (if different from created) */}
              {post.createdAt !== post.updatedAt && (
                <div className="flex items-center gap-1.5 text-xs">
                  <LuClock className="h-3 w-3" />
                  <span>
                    Updated{" "}
                    {formatDistanceToNow(new Date(post.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}

              {/* Stats (Views, Likes, Comments) - Aligned right on larger screens */}
              <div className="flex items-center gap-4 ml-auto">
                {/* Views */}
                <div className="flex items-center gap-1.5">
                  <LuEye className="h-4 w-4" />
                  <span>{post.views || 0}</span>
                </div>
                {/* Likes */}
                <button
                  className={`flex items-center gap-1.5 transition-colors ${
                    post.hasLiked ? "text-primary" : "hover:text-primary"
                  }`}
                  onClick={toggleLike}
                  title={post.hasLiked ? "Unlike this post" : "Like this post"}
                  disabled={!token} // Disable like button if not signed in
                  aria-label={post.hasLiked ? "Unlike post" : "Like post"}
                >
                  <LuThumbsUp
                    className={`h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`}
                  />
                  <span>{post.likes || 0}</span>
                </button>
                {/* Comment Count */}
                <div className="flex items-center gap-1.5">
                  <LuMessageCircle className="h-4 w-4" />
                  <span>{post.comments?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Admin Actions (Edit, Delete) - Only visible to admins */}
            {isAdmin && (
              <div className="flex justify-end gap-3 mb-6">
                <button
                  className="btn btn-outline btn-sm gap-2 rounded-md"
                  onClick={() => navigate(`/posts/edit/${post.id}`)}
                >
                  <LuPencil className="h-4 w-4" /> Edit Post
                </button>
                <button
                  className="btn btn-error btn-sm gap-2 rounded-md"
                  onClick={() => setShowDeleteConfirm(true)} // Show delete confirmation modal
                >
                  <LuTrash2 className="h-4 w-4" />
                  Delete Post
                </button>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <LuTag className="h-5 w-5 text-base-content/50" />
                {post.tags.map((tag, index) => (
                  <div key={index} className="badge badge-outline rounded-md">
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Content (rendered with dangerouslySetInnerHTML and DOMPurify) */}
          <div className="prose prose-lg max-w-none mb-12 bg-base-100 p-6 rounded-lg shadow-sm border">
            <div
              dangerouslySetInnerHTML={{
                // Senior Dev Principle: Always sanitize user-generated or external HTML content
                __html: DOMPurify.sanitize(post.content),
              }}
            />
          </div>

          {/* Action Buttons (Back, Like, Comments, Share) */}
          <div className="flex flex-wrap justify-between items-center my-8 gap-4 bg-base-200 p-4 rounded-lg">
            {/* Back Button */}
            <button
              className="btn btn-outline btn-sm gap-2 rounded-md"
              onClick={() => navigate("/posts")}
            >
              <LuArrowLeft /> Back to All Posts
            </button>

            <div className="flex gap-3">
              {/* Like Button */}
              <button
                className={`btn btn-outline btn-sm gap-2 rounded-md ${
                  post.hasLiked ? "btn-primary" : ""
                }`}
                onClick={toggleLike}
                title={post.hasLiked ? "Unlike this post" : "Like this post"}
                disabled={!token} // Disable if not signed in
                aria-label={post.hasLiked ? "Unlike post" : "Like post"}
              >
                <LuThumbsUp
                  className={`h-4 w-4 ${post.hasLiked ? "fill-current" : ""}`}
                />
                Like ({post.likes || 0})
              </button>

              {/* Toggle Comments Button */}
              <button
                className="btn btn-outline btn-sm gap-2 rounded-md"
                onClick={toggleCommentsVisibility}
                aria-expanded={showComments} // Accessibility: Indicate if comments are expanded
                aria-controls="comments-section" // Accessibility: Link to the comments section
              >
                <LuMessageCircle className="h-4 w-4" />
                <span>
                  {showComments ? "Hide" : "Show"} Comments (
                  {post.comments?.length || 0})
                </span>
              </button>

              {/* Share Button */}
              <button
                className="btn btn-primary btn-sm gap-2 rounded-md"
                onClick={handleShare}
                title="Share this post"
                aria-label="Share this post"
              >
                <LuShare2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          {/* Comments Section */}
          {/* Added id for aria-controls */}
          <div className="mt-8" id="comments-section">
            {/* Comments Header */}
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <LuMessageCircle className="h-5 w-5" />
              Comments{" "}
              {post.comments?.length > 0 && `(${post.comments?.length})`}
            </h3>

            {/* Comment Input Form (if user is signed in) */}
            {token ? (
              <div className="card bg-base-100 shadow-sm border mb-8 rounded-lg">
                <div className="card-body p-4">
                  <form onSubmit={submitComment} className="space-y-4">
                    <div className="form-control">
                      <textarea
                        className="textarea textarea-bordered h-24 w-full focus:border-primary resize-none rounded-md"
                        placeholder="Share your thoughts about this post..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        aria-label="Comment text" // Accessibility
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="btn btn-primary gap-2 rounded-md"
                        disabled={submittingComment || !commentText.trim()} // Disable if submitting or text is empty
                      >
                        {submittingComment ? (
                          <>
                            <LuLoader className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <LuCornerDownLeft className="h-4 w-4" />
                            Post Comment
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              // Message to sign in to comment
              <div role="alert" className="alert alert-info mb-8 rounded-md">
                <div>
                  <LuMessageCircle className="h-5 w-5" />
                  <span>Please sign in to leave a comment.</span>
                </div>
              </div>
            )}

            {/* Display Comments List (if visible) */}
            {showComments && (
              <div className="space-y-4">
                {/* Senior Dev Principle: Render sorted comments directly from state */}
                {post.comments.length === 0 ? (
                  // Message if no comments yet
                  <div className="text-center py-12 text-base-content/70 bg-base-200 rounded-lg">
                    <LuMessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  // Map and display comments (already sorted in fetchPost)
                  post.comments.map((c) => {
                    // Basic validation for comment data
                    if (!c || !c.id || !c.user || !c.createdAt) {
                      console.warn("Skipping rendering of invalid comment:", c);
                      return null; // Skip rendering invalid comments
                    }

                    return (
                      // Individual Comment Card
                      <div
                        key={c.id}
                        className="card bg-base-100 shadow-sm border hover:shadow-md transition-shadow rounded-lg"
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            {/* Comment Author Info */}
                            <div className="flex items-center gap-3">
                              <div className="avatar placeholder">
                                <div className="bg-neutral-focus text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                                  <span className="text-xs">
                                    {c.user.firstName?.charAt(0) || ""}
                                    {c.user.lastName?.charAt(0) || ""}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {c.user.firstName} {c.user.lastName}
                                </div>
                                {/* Comment Timestamp */}
                                <div className="text-xs text-base-content/70">
                                  {c.createdAt
                                    ? formatDistanceToNow(
                                        new Date(c.createdAt),
                                        {
                                          addSuffix: true,
                                        }
                                      )
                                    : "Invalid Date"}
                                </div>
                              </div>
                            </div>

                            {/* Delete Comment Button (Admin only) */}
                            {isAdmin && (
                              <button
                                className="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md"
                                onClick={() => deleteComment(c.id)} // Call delete comment function
                                disabled={deletingCommentId === c.id} // Disable while deleting
                                aria-label={`Delete comment by ${c.user.firstName} ${c.user.lastName}`}
                                title="Delete comment"
                              >
                                {deletingCommentId === c.id ? (
                                  <LuLoader className="h-3 w-3 animate-spin" />
                                ) : (
                                  <LuCircleX className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {/* Comment Content */}
                          {/* Senior Dev Principle: Use whitespace-pre-line to preserve line breaks from textarea input */}
                          <p className="whitespace-pre-line">{c.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render the Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </>
  );
};

export default Post;
