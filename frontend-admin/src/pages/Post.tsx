import { useState, useEffect } from "react";
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
  LuUser,
  LuClock,
  LuCornerDownLeft,
} from "react-icons/lu";
import DOMPurify from "dompurify";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../context/AuthContext";

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
  comments: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

const Post = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const { user } = useAuth();

  // Single API URL from environment
  const API = import.meta.env.VITE_ADMIN_POST;
  const token = localStorage.getItem("token");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API}/${postId}`, { headers });
        setPost(response.data);
        document.title = `${response.data.title} | Blog`;
      } catch (err) {
        console.error("Error fetching post:", err);
        setError(
          "Failed to load the post. It may have been deleted or is unavailable."
        );
        toast.error("Failed to load the post");
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPost();

    return () => {
      document.title = "Blog";
    };
  }, [postId, API, token]);

  const deletePost = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    )
      return;

    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Post deleted successfully");
      navigate("/posts");
    } catch (err) {
      console.error("Error deleting post:", err);
      toast.error("Failed to delete post");
      setDeleteLoading(false);
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/${postId}/comments`, {
        headers,
      });
      setComments(response.data);
      setShowComments(true);
    } catch (err) {
      console.error("Error loading comments:", err);
      toast.error("Failed to load comments");
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.info("Please sign in to comment");
    if (!commentText.trim()) return toast.error("Comment cannot be empty");

    setSubmittingComment(true);
    try {
      const response = await axios.post(
        `${API}/${postId}/comments`,
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([response.data, ...comments]);
      setCommentText("");
      toast.success("Comment added successfully");
    } catch (err) {
      console.error("Error submitting comment:", err);
      toast.error("Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || "Blog Post",
        url: window.location.href,
      });
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Link copied to clipboard"));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="flex flex-col items-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/70">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl border border-error/20">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-error">Error Loading Post</h2>
            <p>{error}</p>
            <div className="card-actions mt-4">
              <button
                className="btn btn-primary"
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

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">Post Not Found</h2>
            <p>
              The post you're looking for doesn't exist or has been removed.
            </p>
            <div className="card-actions mt-4">
              <button
                className="btn btn-primary"
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

  return (
    <div className="container max-w-4xl mx-auto px-4 pb-16">
      <div className="py-6">
        <div className="text-sm breadcrumbs mb-6">
          <ul>
            <li>
              <a className="hover:underline" onClick={() => navigate("/")}>
                Home
              </a>
            </li>
            <li>
              <a className="hover:underline" onClick={() => navigate("/posts")}>
                Posts
              </a>
            </li>
            <li className="text-base-content/70 truncate max-w-[200px]">
              {post.title}
            </li>
          </ul>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-base-content/70 mb-6">
            <div className="flex items-center gap-1.5">
              <LuUser className="h-4 w-4" />
              <span>
                {post.author.firstName} {post.author.lastName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <LuCalendar className="h-4 w-4" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
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
          </div>

          {isAdmin && (
            <div className="flex justify-end gap-3 mb-6">
              <button
                className="btn btn-outline btn-sm gap-2"
                onClick={() => navigate(`/posts/edit/${post.id}`)}
              >
                <LuPencil className="h-4 w-4" /> Edit
              </button>
              <button
                className="btn btn-error btn-sm gap-2"
                onClick={deletePost}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <LuLoader className="h-4 w-4 animate-spin" />
                ) : (
                  <LuTrash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="prose prose-lg max-w-none mb-12">
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content),
            }}
          />
        </div>

        <div className="divider"></div>

        <div className="flex justify-between items-center mb-8">
          <button
            className="btn btn-outline btn-sm gap-2"
            onClick={() => navigate("/posts")}
          >
            <LuArrowLeft /> Back to Posts
          </button>

          <div className="flex gap-3">
            <button
              className="btn btn-outline btn-sm gap-2"
              onClick={loadComments}
            >
              <LuMessageCircle className="h-4 w-4" />
              <span>{comments.length || post.comments || 0} Comments</span>
            </button>

            <button
              className="btn btn-outline btn-sm gap-2"
              onClick={handleShare}
              title="Share this post"
            >
              <LuShare2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="mt-8" id="comments">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <LuMessageCircle className="h-5 w-5" />
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>

          {token ? (
            <div className="card bg-base-100 shadow-sm border mb-8">
              <div className="card-body p-4">
                <form onSubmit={submitComment}>
                  <div className="form-control">
                    <textarea
                      className="textarea textarea-bordered h-24 w-full focus:border-primary"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary gap-2"
                      disabled={submittingComment || !commentText.trim()}
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
            <div className="alert mb-8">
              <div>Please sign in to leave a comment</div>
            </div>
          )}

          {showComments && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-base-content/70 bg-base-200 rounded-lg">
                  <LuMessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="card bg-base-100 shadow-sm border hover:shadow transition-shadow"
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="avatar placeholder">
                          <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                            <span className="text-xs">
                              {c.author.firstName.charAt(0)}
                              {c.author.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">
                            {c.author.firstName} {c.author.lastName}
                          </div>
                          <div className="text-xs text-base-content/70">
                            {formatDistanceToNow(new Date(c.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                      <p className="whitespace-pre-line">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;
