import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCalendar,
  LuMessageCircle,
  LuCornerDownLeft,
  LuEye,
  LuThumbsUp,
  LuChevronLeft,
  LuChevronRight,
  LuUser,
  LuShare2,
  LuPencil,
  LuTrash2,
  LuTag,
  LuClock,
  LuChevronUp,
  LuHouse,
} from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  hasLiked: boolean;
  tags: string[];
  author: User;
  comments: Comment[];
  // Assuming a 'published' property exists on the post data
  published?: boolean;
}

const POSTS_API = import.meta.env.VITE_POST_API;
const COMMENTS_PER_PAGE = 5;

const Post: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialPost = location.state?.post as PostData | null;
  const [post, setPost] = useState<PostData | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const hasViewed = useRef(false);

  // Comment pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const commentScrollRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token");
  // Extract postId from location state if available, otherwise it might be undefined initially
  const postId = initialPost?.id || location.pathname.split("/").pop();

  const fetchPost = useCallback(async () => {
    // Ensure postId is available before fetching
    if (!postId || typeof postId !== "string") {
      setError("Post ID not found or invalid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const { data } = await axios.get<PostData>(`${POSTS_API}/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // --- Added check for published status ---
      // Assuming the API returns 'published: true' for published posts
      // Or 'published: false' or omits the property for drafts.
      // Adjust this logic based on your actual API response structure.
      if (!data.published && user?.id !== data.author.id) {
        // If the post is not published and the current user is not the author,
        // show an error or redirect.
        setError("This post is not published yet.");
        setPost(null); // Clear any potentially loaded draft data
        return; // Stop further processing
      }
      // --- End of added check ---

      data.comments =
        data.comments?.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) || [];
      setPost(data);
    } catch (err) {
      console.error(err);
      // Check if the error is a 404 (Not Found), which might indicate a non-existent or unpublished post
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("Post not found.");
      } else {
        setError("Unable to load post. Please try again.");
      }
      setPost(null); // Clear post data on error
    } finally {
      setLoading(false);
    }
  }, [postId, token, user]); // Added 'user' to dependencies

  const trackView = useCallback(async () => {
    // Only track view if post is loaded, is published, user is not the author, and hasn't been viewed in this session
    if (
      !post ||
      !post.published ||
      user?.id === post.author.id ||
      hasViewed.current
    )
      return;
    try {
      await axios.post(
        `${POSTS_API}/${post.id}/view`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      hasViewed.current = true;
    } catch {
      /* silent */
    }
  }, [post, token, user]);

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const submitEdit = async (commentId: string) => {
    if (!token) return toast.error("Sign in to edit");
    if (!editText.trim()) return;

    try {
      await axios.patch(
        `${POSTS_API}/${post!.id}/comments/${commentId}`,
        { content: editText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Comment updated");
      setEditingCommentId(null);
      setEditText("");
      await fetchPost(); // Re-fetch post to get updated comments
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!token) return toast.error("Sign in to delete");
    try {
      await axios.delete(`${POSTS_API}/${post!.id}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Comment deleted");
      await fetchPost(); // Re-fetch post to get updated comments
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  useEffect(() => {
    // Ensure postId is available before fetching
    if (postId && typeof postId === "string") {
      fetchPost();
    } else if (!initialPost) {
      // If no initial post and no postId from URL, show error
      setError("Post ID not found.");
      setLoading(false);
    }

    // Add scroll event listener to show/hide scroll-to-top button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchPost, postId, initialPost]); // Added postId and initialPost to dependencies

  useEffect(() => {
    trackView();
  }, [trackView]);

  const toggleLike = async () => {
    if (!token || !post) {
      if (!token) toast.info("Sign in to like posts");
      return;
    }
    // Only allow liking if the post is published
    if (!post.published) {
      toast.info("Cannot like an unpublished post.");
      return;
    }
    try {
      await axios({
        method: post.hasLiked ? "delete" : "post",
        url: `${POSTS_API}/${post.id}/like`,
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPost(); // Re-fetch post to get updated like count and status
    } catch {
      toast.error("Could not update like");
    }
  };

  const sharePost = () => {
    if (!post || !post.published) {
      toast.info("Cannot share an unpublished post.");
      return;
    }
    if (navigator.share) {
      navigator
        .share({
          title: post?.title || "Shared post",
          url: window.location.href,
        })
        .catch(() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied to clipboard");
        });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error("Sign in to comment");
    if (!post || !post.published) {
      // Only allow commenting on published posts
      toast.info("Cannot comment on an unpublished post.");
      return;
    }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${POSTS_API}/${post!.id}/comments`,
        { content: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      toast.success("Comment added");
      await fetchPost(); // Re-fetch post to get the new comment
      // Reset to first page and scroll to comments after adding a new one
      setCurrentPage(1);
      if (commentScrollRef.current) {
        commentScrollRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToComments = () => {
    commentScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Calculate pagination values
  const totalComments = post?.comments?.length || 0;
  const totalPages = Math.ceil(totalComments / COMMENTS_PER_PAGE);
  const paginatedComments = post?.comments?.slice(
    (currentPage - 1) * COMMENTS_PER_PAGE,
    currentPage * COMMENTS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (commentScrollRef.current) {
      commentScrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Skeleton loading state with more refined animation
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="animate-pulse space-y-8">
          <div className="h-3 bg-base-300 rounded w-32 mb-2"></div>
          <div className="h-8 bg-base-300 rounded w-3/4 mb-6"></div>
          <div className="flex gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-base-300"></div>
            <div>
              <div className="h-4 bg-base-300 rounded w-32 mb-2"></div>
              <div className="h-3 bg-base-300 rounded w-24"></div>
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <div className="h-5 bg-base-300 rounded w-24"></div>
            <div className="h-5 bg-base-300 rounded w-24"></div>
            <div className="h-5 bg-base-300 rounded w-24"></div>
          </div>
          <div className="space-y-4">
            <div className="h-3 bg-base-300 rounded w-full"></div>
            <div className="h-3 bg-base-300 rounded w-full"></div>
            <div className="h-3 bg-base-300 rounded w-5/6"></div>
            <div className="h-3 bg-base-300 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state if the post is not found or not published
  if (error) {
    return (
      <div className="hero min-h-screen bg-base-100">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4">Oops!</h1>
            <p className="mb-6 text-lg">{error}</p>
            {/* Only show Try Again button if it's a general error, not 'not published' */}
            {error !== "This post is not published yet." &&
              error !== "Post not found." && (
                <button onClick={fetchPost} className="btn btn-primary">
                  Try Again
                </button>
              )}
            <button
              onClick={() => navigate("/")}
              className="btn btn-ghost ml-2"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If post is null and not loading/error, it means initialPost was null and fetchPost failed or was skipped
  if (!post) return null;

  return (
    <div className="bg-base-100 min-h-screen" ref={mainContentRef}>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Streamlined Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost btn-sm gap-2 hover:bg-base-200 transition-colors"
          >
            <LuHouse className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden"
        >
          {/* Post Header */}
          <div className="card-body p-5 md:p-8">
            <h1 className="card-title text-2xl md:text-3xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author info - simplified */}
            <div className="flex items-center gap-3 mb-6">
              <div className="avatar">
                <div className="bg-primary text-primary-content rounded-full w-10">
                  <span>
                    {post.author.firstName.charAt(0)}
                    {post.author.lastName.charAt(0)}
                  </span>
                </div>
              </div>
              <div>
                <div className="font-medium">
                  {post.author.firstName} {post.author.lastName}
                </div>
                <div className="text-xs text-base-content/70">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>

            {/* More readable metadata section */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-base-200">
              <div className="flex flex-wrap items-center gap-3 text-base-content/70 text-sm">
                <div className="flex items-center gap-1">
                  <LuCalendar className="h-3 w-3" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                {post.updatedAt !== post.createdAt && (
                  <div className="flex items-center gap-1">
                    <LuClock className="h-3 w-3" />
                    <span>
                      Updated{" "}
                      {formatDistanceToNow(new Date(post.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <LuEye className="h-3 w-3" />
                  <span>{post.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <LuMessageCircle className="h-3 w-3" />
                  <span>{post.comments?.length}</span>
                </div>
              </div>

              {/* Action buttons - more compact */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleLike}
                  aria-pressed={post.hasLiked}
                  aria-label={post.hasLiked ? "Unlike" : "Like"}
                  // Disable like button if not published
                  disabled={!post.published}
                  className={`btn btn-sm ${
                    post.hasLiked ? "btn-primary" : "btn-outline"
                  } gap-1 ${!post.published && "btn-disabled"}`}
                >
                  <LuThumbsUp className="h-3 w-3" />
                  <span>{post.likes}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={sharePost}
                  className="btn btn-sm btn-ghost btn-square"
                  aria-label="Share post"
                  // Disable share button if not published
                  disabled={!post.published}
                >
                  <LuShare2 className="h-4 w-4" />
                </motion.button>

                {/* Allow author to see/edit even if not published */}
                {user?.id === post.author.id && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/edit-post/${post.id}`)}
                    className="btn btn-sm btn-ghost btn-square"
                    aria-label="Edit post"
                  >
                    <LuPencil className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Tags - more subtle */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 my-4">
                <div className="flex items-center">
                  <LuTag className="h-4 w-4 text-base-content/50 mr-1" />
                </div>
                {post.tags.map((tag) => (
                  <div key={tag} className="badge badge-outline badge-sm">
                    {tag}
                  </div>
                ))}
              </div>
            )}

            {/* Post Content */}
            <div className="prose prose-lg max-w-none mt-6">
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content),
                }}
              />
            </div>

            {/* Show Draft status if not published and user is author */}
            {!post.published && user?.id === post.author.id && (
              <div className="alert alert-warning mt-6 py-2 px-4 text-sm">
                This post is currently a draft and not visible to the public.
              </div>
            )}

            {/* Comment quick action - only show if published */}
            {post.published && (
              <div className="flex justify-end mt-8">
                <button
                  onClick={scrollToComments}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <LuMessageCircle className="h-4 w-4" />
                  <span>Comments ({post.comments?.length})</span>
                </button>
              </div>
            )}
          </div>
        </motion.article>

        {/* Comments Section - cleaner design - only show if published */}
        {post.published && (
          <section
            ref={commentScrollRef}
            className="card bg-base-100 shadow-sm border border-base-200 mt-6"
            aria-labelledby="comments-heading"
          >
            <div className="card-body p-5 md:p-6">
              <h2
                id="comments-heading"
                className="card-title text-xl flex items-center gap-2 mb-5"
              >
                <LuMessageCircle /> Comments ({post.comments?.length})
              </h2>

              {/* Comment Form */}
              {token ? (
                <form onSubmit={submitComment} className="mb-6">
                  <textarea
                    className="textarea textarea-bordered w-full h-20 mb-2 text-sm"
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    aria-label="Comment text"
                    required
                  />
                  <div className="flex justify-end">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary btn-sm"
                      aria-busy={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Posting...
                        </>
                      ) : (
                        <>
                          <LuCornerDownLeft className="h-4 w-4" /> Post
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              ) : (
                <div className="alert alert-info mb-5 flex justify-between items-center py-2 px-4">
                  <div className="flex items-center gap-2">
                    <LuUser className="h-4 w-4" />
                    <span className="text-sm">Sign in to comment</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                    className="btn btn-xs btn-primary"
                  >
                    Sign In
                  </motion.button>
                </div>
              )}

              {/* Comments List with Pagination */}
              {totalComments > 0 ? (
                <>
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {paginatedComments?.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="card bg-base-100 border border-base-200 shadow-sm"
                        >
                          <div className="card-body p-3 md:p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="avatar">
                                  <div className="bg-primary text-primary-content rounded-full w-7">
                                    <span className="text-xs">
                                      {comment.user.firstName.charAt(0)}
                                      {comment.user.lastName.charAt(0)}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-medium text-sm">
                                  {comment.user.firstName}{" "}
                                  {comment.user.lastName}
                                </span>
                              </div>
                              <time
                                className="text-xs text-base-content/60"
                                dateTime={comment.createdAt}
                              >
                                {formatDistanceToNow(
                                  new Date(comment.createdAt),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </time>
                            </div>

                            <div className="whitespace-pre-line">
                              {editingCommentId === comment.id ? (
                                <div>
                                  <textarea
                                    className="textarea textarea-bordered textarea-sm w-full mb-2 text-sm"
                                    value={editText}
                                    onChange={(e) =>
                                      setEditText(e.target.value)
                                    }
                                    aria-label="Edit comment text"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => submitEdit(comment.id)}
                                      className="btn btn-primary btn-xs"
                                    >
                                      Save
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={cancelEditing}
                                      className="btn btn-ghost btn-xs"
                                    >
                                      Cancel
                                    </motion.button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm">
                                  {DOMPurify.sanitize(comment.content)}
                                </p>
                              )}
                              {user?.id === comment.user.id &&
                                editingCommentId !== comment.id && (
                                  <div className="flex gap-1 mt-2 justify-end">
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => startEditing(comment)}
                                      className="btn btn-ghost btn-xs btn-square"
                                      aria-label="Edit comment"
                                    >
                                      <LuPencil className="h-3 w-3" />
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => deleteComment(comment.id)}
                                      className="btn btn-ghost btn-xs btn-square"
                                      aria-label="Delete comment"
                                    >
                                      <LuTrash2 className="h-3 w-3" />
                                    </motion.button>
                                  </div>
                                )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination - more compact */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <div className="join">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="join-item btn btn-xs"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                        >
                          <LuChevronLeft className="h-3 w-3" />
                        </motion.button>

                        {[...Array(totalPages)].map((_, i) => (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            key={i}
                            onClick={() => handlePageChange(i + 1)}
                            className={`join-item btn btn-xs ${
                              currentPage === i + 1 ? "btn-active" : ""
                            }`}
                            aria-current={
                              currentPage === i + 1 ? "page" : undefined
                            }
                          >
                            {i + 1}
                          </motion.button>
                        ))}

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="join-item btn btn-xs"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                        >
                          <LuChevronRight className="h-3 w-3" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-base-content/70">
                  <LuMessageCircle className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Scroll to top button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 btn btn-circle btn-primary shadow-lg"
              aria-label="Scroll to top"
            >
              <LuChevronUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Post;
