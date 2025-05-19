import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import axios from "axios";
import DOMPurify from "dompurify";
import { toast } from "react-toastify";
import { LuArrowLeft, LuCircleAlert, LuHouse } from "react-icons/lu";
import { useAuth } from "../context/AuthContext"; // Assuming AuthContext provides user and role

// Define the interface for the post data expected from the API
interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  tags: string[];
  // Add other fields if needed, but these are the main ones for editing
}

/**
 * Component for editing an existing blog post.
 * Fetches the post by ID, pre-populates the form, and handles updates.
 * Requires ADMIN role for access.
 */
const EditPostPage: React.FC = () => {
  // --- Hooks and State ---
  const { postId } = useParams<{ postId: string }>(); // Get post ID from URL
  const navigate = useNavigate(); // Navigation hook

  // State for post data (initially null, fetched from API)
  const [post, setPost] = useState<Post | null>(null);
  // States for form inputs
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [tagsInput, setTagsInput] = useState(""); // State for the comma-separated tags input string

  // Loading and Error states
  const [loading, setLoading] = useState(true); // Initial fetch loading
  const [updateLoading, setUpdateLoading] = useState(false); // Update submission loading
  const [error, setError] = useState<string | null>(null); // Error message

  // Form state to track changes and touch status for confirmation dialog
  const [isDirty, setIsDirty] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false); // State for the unsaved changes confirmation modal

  // State for content length (for TinyMCE)
  const [contentLength, setContentLength] = useState(0);

  // Refs for TinyMCE editor instance and title input focus
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Get authenticated user and their role from AuthContext
  const { user, loading: authLoading } = useAuth(); // Include authLoading

  // --- Constants and Environment Variables ---
  // Get API URL from environment variables
  const ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST;
  // Retrieve authentication token
  const token = localStorage.getItem("token"); // Consider more secure ways to handle tokens

  // --- Effects ---

  // Effect to check authentication and authorization on component mount
  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return;

    // Redirect if not authenticated or not an admin
    if (!user || user.role !== "ADMIN") {
      toast.error("You must be an admin to edit posts.");
      // Redirect to home or login page
      navigate("/"); // Or navigate('/login')
    }
  }, [user, authLoading, navigate]); // Dependencies: user, authLoading, navigate

  // Effect to fetch the post data for editing
  // Wrapped in useCallback to memoize the function
  const fetchPost = useCallback(async () => {
    // Only fetch if postId is available and user is authenticated/admin (after authLoading)
    if (!postId || authLoading || !user || user.role !== "ADMIN") {
      // If auth check fails, the effect above will handle redirection
      if (!postId) setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    try {
      // Fetch the specific post using the admin API endpoint
      console.log(`${ADMIN_POSTS_API}/${postId}`);
      const response = await axios.get<Post>(`${ADMIN_POSTS_API}/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const fetchedPost = response.data;
      setPost(fetchedPost); // Store the fetched post data

      // Pre-populate form states with fetched data
      setTitle(fetchedPost.title);
      setPublished(fetchedPost.published);
      // Convert tags array back to a comma-separated string for the input field
      setTagsInput(fetchedPost.tags?.join(", ") || "");

      // Set editor content if ref is available
      if (editorRef.current) {
        editorRef.current.setContent(fetchedPost.content || "");
        // Calculate initial content length
        const textContent = (fetchedPost.content || "").replace(/<[^>]*>/g, "");
        setContentLength(textContent.length);
      }

      // Reset dirty and touched states after loading the data
      setIsDirty(false);
      setFormTouched(false);
    } catch (err) {
      console.error("Error fetching post for editing:", err);
      const errorMessage =
        axios.isAxiosError(err) && err.response?.status === 404
          ? "The post was not found."
          : "Failed to load the post for editing.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [postId, ADMIN_POSTS_API, token, authLoading, user]); // Dependencies: postId, API, token, auth state

  // Effect to trigger fetching the post when the component mounts or fetchPost changes
  useEffect(() => {
    // Only fetch if not currently loading auth state
    if (!authLoading) {
      fetchPost();
    }
  }, [fetchPost, authLoading]); // Dependency array includes fetchPost and authLoading

  // Effect to focus on the title input after initial load if available
  useEffect(() => {
    if (!loading && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [loading]); // Dependency: runs after loading state changes

  // --- Handlers ---

  // Handle input changes (title, published, tagsInput)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;

    // Mark form as touched on any change
    if (!formTouched) {
      setFormTouched(true);
    }
    // Mark form as dirty on any change
    setIsDirty(true);

    if (name === "title") {
      setTitle(value);
    } else if (name === "published") {
      setPublished(checked);
    } else if (name === "tags") {
      setTagsInput(value);
    }
  };

  // Handle editor content change
  const handleEditorChange = () => {
    // Mark form as touched on editor change
    if (!formTouched) {
      setFormTouched(true);
    }
    // Mark form as dirty on editor change
    setIsDirty(true);

    if (editorRef.current) {
      // Get content length for character count
      const content = editorRef.current.getContent();
      // Strip HTML tags for a more accurate character count
      const textContent = content.replace(/<[^>]*>/g, "");
      setContentLength(textContent.length);
    }
  };

  // Handle form submission for updating the post
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Clear previous messages
    setError(null);
    // setSuccess(null); // We'll use toast for success

    const editorContent = editorRef.current
      ? editorRef.current.getContent()
      : "";

    // Enhanced validation
    if (!title.trim()) {
      setError("Please enter a title for your blog post.");
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
      return;
    }

    const isEditorContentEmpty =
      !editorContent.trim() || editorContent === "<p></p>";

    if (isEditorContentEmpty) {
      setError("Please add some content to your blog post.");
      if (editorRef.current) {
        editorRef.current.focus(false);
      }
      return;
    }

    // Process tags input: split by comma, trim whitespace, and filter out empty strings
    const processedTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    // Ensure token and postId are available
    if (!token || !postId) {
      setError("Authentication token or Post ID is missing.");
      toast.error("Authentication failed or Post ID is missing.");
      return;
    }

    // Sanitization Step for content
    const sanitizedContent = DOMPurify.sanitize(editorContent);

    // Data object to send for update
    const updateData = {
      title,
      content: sanitizedContent,
      published, // Send boolean directly
      tags: processedTags, // Include processed tags array
    };

    setUpdateLoading(true); // Start update loading indicator

    try {
      // Send PATCH request to update the post
      const response = await axios.patch(
        `${ADMIN_POSTS_API}/${postId}`, // Use the existing PATCH route
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Post updated successfully:", response.data);
      toast.success("Blog post updated successfully!");
      setIsDirty(false); // Reset dirty state after successful update

      // Navigate back to the post detail page
      navigate(`/posts/${postId}`);
    } catch (err) {
      console.error("Error updating post:", err);

      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          // Unauthorized or Forbidden
          setError(
            "You are not authorized to perform this action. Please log in as an admin."
          );
          toast.error(
            "Authorization failed. Please log in with admin privileges."
          );
        } else if (err.response.status === 404) {
          setError("The post you are trying to update was not found.");
          toast.error("Post not found.");
        } else {
          setError(
            err.response.data.message ||
              "Failed to update your blog post. Please try again."
          );
          toast.error(
            err.response.data.message || "Failed to update blog post."
          );
        }
      } else {
        setError(
          "There was a problem connecting to the server. Please check your internet connection and try again."
        );
        toast.error(
          "Network error or unexpected issue. Failed to update post."
        );
      }
    } finally {
      setUpdateLoading(false); // Stop update loading indicator
    }
  };

  // Handle Cancel button click - show confirmation if form is dirty
  const handleCancel = () => {
    if (isDirty && formTouched) {
      setShowConfirmDialog(true); // Show confirmation modal
    } else {
      navigate(`/posts/${postId}`); // No changes, navigate back directly
    }
  };

  // Confirm discarding changes and navigate back
  const confirmCancel = () => {
    setShowConfirmDialog(false); // Hide modal
    navigate(`/posts/${postId}`); // Navigate back
  };

  // Dismiss the confirmation dialog
  const dismissDialog = () => {
    setShowConfirmDialog(false); // Hide modal
  };

  // Dismiss alert messages
  const dismissAlert = () => {
    setError(null);
    // setSuccess(null); // Not using success state display, using toast
  };

  // --- Render Logic ---

  // Show loading spinner while fetching the post initially
  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-base-content/70">
            Loading post for editing...
          </p>
        </div>
      </div>
    );
  }

  // Show error message if fetching failed or user is not authorized/authenticated
  if (error || !user || user.role !== "ADMIN") {
    // If error is set during fetch, display it.
    // If auth check failed, the effect above handles redirection,
    // but this provides a fallback display if needed before redirect.
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl border border-error/20 rounded-lg">
          <div className="card-body items-center text-center">
            <LuCircleAlert className="w-16 h-16 text-error mb-4" />
            <h2 className="card-title text-error">Access Denied</h2>
            <p>{error || "You do not have permission to edit this post."}</p>
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
              The post you're trying to edit doesn't exist or has been removed.
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

  // --- Main Component Render ---
  return (
    <div className="container max-w-4xl mx-auto pb-12">
      <div className="px-4 sm:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm breadcrumbs mb-6">
          <ul className="flex flex-wrap items-center">
            <li className="flex items-center">
              <button
                onClick={() => navigate("/")}
                className="text-primary hover:underline flex items-center"
                aria-label="Go to Home"
              >
                <LuHouse className="h-4 w-4 mr-1" aria-hidden="true" />
                Home
              </button>
            </li>
            <li className="flex items-center">
              <button
                onClick={() => navigate("/posts")}
                className="text-primary hover:underline"
                aria-label="Go to Posts list"
              >
                Posts
              </button>
            </li>
            {/* Truncate long post titles in breadcrumbs for small screens */}
            <li className="text-base-content/50 truncate max-w-[150px] sm:max-w-none">
              <button
                onClick={() => navigate(`/posts/${postId}`)}
                className="text-primary hover:underline"
                aria-label={`Go to post detail for "${post.title}"`}
              >
                {post.title}
              </button>
            </li>
            <li>
              <span className="text-base-content/50">Edit</span>
            </li>
          </ul>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">Edit Blog Post</h1>
          <p className="text-base-content/50 mt-4">
            Modify the content and settings for your blog post.
          </p>
        </header>

        {/* Alert Messages */}
        {error && (
          <div
            className="alert alert-error mb-8 flex justify-between items-center"
            role="alert"
          >
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mr-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
            <button
              onClick={dismissAlert}
              className="btn btn-sm btn-circle"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success messages handled by react-toastify */}

        <div className="bg-base-200 rounded-lg shadow-sm border border-base-300">
          <form
            onSubmit={handleSubmit}
            className="p-6"
            aria-label="Edit blog post form"
          >
            {/* Post Title */}
            <div className="form-control w-full mb-6">
              <label className="label" htmlFor="title">
                <span className="label-text text-base font-medium">
                  Post Title
                </span>
                <span className="label-text-alt text-base-content/50">
                  {title.length}/100
                </span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                ref={titleInputRef}
                value={title}
                onChange={handleChange}
                placeholder="Enter a descriptive title for your post"
                className="input input-bordered w-full focus:input-primary"
                maxLength={100}
                required
                aria-required="true"
                aria-describedby="title-description"
              />
              <label className="label">
                <span
                  id="title-description"
                  className="label-text-alt text-xs text-base-content/50"
                >
                  A clear, engaging title helps readers find your content
                </span>
              </label>
            </div>

            {/* Post Tags */}
            <div className="form-control w-full mb-6">
              <label className="label" htmlFor="tags">
                <span className="label-text text-base font-medium">Tags</span>
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={tagsInput}
                onChange={handleChange}
                placeholder="Enter tags separated by commas (e.g., technology, web development)"
                className="input input-bordered w-full focus:input-primary"
                aria-describedby="tags-description"
              />
              <label className="label">
                <span
                  id="tags-description"
                  className="label-text-alt text-xs text-base-content/50"
                >
                  Add relevant tags to help categorize your post
                </span>
              </label>
            </div>

            {/* Post Content */}
            <div className="form-control w-full mb-6">
              <label className="label" htmlFor="content">
                <span className="label-text text-base font-medium">
                  Post Content
                </span>
                <span className="label-text-alt text-base-content/50">
                  {contentLength} characters
                </span>
              </label>
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                onInit={(_evt, editor) => {
                  editorRef.current = editor;
                  // Set initial content after editor is ready
                  if (post?.content) {
                    editor.setContent(post.content);
                    const textContent = (post.content || "").replace(
                      /<[^>]*>/g,
                      ""
                    );
                    setContentLength(textContent.length);
                  }
                  editor.on("keyup", handleEditorChange);
                  editor.on("change", handleEditorChange);
                  editor.on("undo", handleEditorChange); // Capture undo/redo
                  editor.on("redo", handleEditorChange);
                }}
                initialValue={post?.content || "<p></p>"} // Use fetched content or empty paragraph
                init={{
                  height: 500,
                  menubar: true,
                  plugins: [
                    "advlist",
                    "autolink",
                    "lists",
                    "link",
                    "image",
                    "charmap",
                    "preview",
                    "anchor",
                    "searchreplace",
                    "visualblocks",
                    "code",
                    "fullscreen",
                    "insertdatetime",
                    "media",
                    "table",
                    "help",
                    "wordcount",
                  ],
                  toolbar:
                    "undo redo | blocks | " +
                    "bold italic forecolor | alignleft aligncenter " +
                    "alignright alignjustify | bullist numlist outdent indent | " +
                    "link image media | removeformat | help",
                  content_style:
                    "body { font-family:Helvetica,Arial,sans-serif; font-size:16px; max-width:100%; }",
                  branding: false,
                  resize: true,
                  placeholder: "Start writing your amazing blog post here...",
                  toolbar_sticky: true,
                  toolbar_sticky_offset: 64,
                  a11y_advanced_options: true,
                  image_caption: true,
                  image_advtab: true,
                  automatic_uploads: true,
                  paste_data_images: true,
                }}
              />
              <label className="label">
                <span className="label-text-alt text-xs  text-base-content/50">
                  Use the rich text editor to format your content
                </span>
              </label>
            </div>

            {/* Publishing Options */}
            <div className=" rounded-lg p-4 mb-8">
              <h3 className="font-medium mb-4">Publishing Options</h3>
              <div className="form-control">
                <label className="cursor-pointer label justify-start gap-4">
                  <input
                    type="checkbox"
                    name="published"
                    checked={published}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                    aria-describedby="publish-description"
                  />
                  <div>
                    <span className="label-text font-medium">
                      Publish immediately
                    </span>
                    <p
                      id="publish-description"
                      className="text-xs text-base-content/50 "
                    >
                      When checked, your post will be visible to readers right
                      away. Otherwise, it will be saved as a draft.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                type="button"
                className="btn btn-outline order-2 sm:order-1 flex-1 sm:flex-none rounded-md"
                onClick={handleCancel}
                disabled={updateLoading} // Disable while updating
                aria-label="Cancel editing and return"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary order-1 sm:order-2 flex-1 rounded-md"
                disabled={updateLoading || (!formTouched && !isDirty)} // Disable if updating or no changes made
                aria-live="polite" // Indicate that the button's status might change
                aria-label={updateLoading ? "Updating post" : "Save changes"}
              >
                {updateLoading ? (
                  <>
                    <span
                      className="loading loading-spinner loading-sm mr-4"
                      aria-hidden="true"
                    ></span>
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog for unsaved changes */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-base-100 bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-base-200 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 id="confirm-dialog-title" className="text-lg font-bold mb-4">
              Discard changes?
            </h3>
            <p className="mb-6">
              You have unsaved changes that will be lost if you leave this page.
              Are you sure you want to discard your changes?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost rounded-md"
                onClick={dismissDialog}
              >
                Keep Editing
              </button>
              <button
                className="btn btn-error rounded-md"
                onClick={confirmCancel}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditPostPage;
