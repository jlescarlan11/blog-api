import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import { LuHouse } from "react-icons/lu"; // Added LuCirclePlus
import { toast } from "react-toastify"; // Import toast

const NewPostPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false); // Renamed to loading for clarity
  const [error, setError] = useState<string | null>(null);
  // const [success, setSuccess] = useState<string | null>(null); // Using toast for success
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [contentLength, setContentLength] = useState(0);
  // State for managing tags input
  const [tagsInput, setTagsInput] = useState("");

  const editorRef = useRef<TinyMCEEditor | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Get the API URL from environment variables
  const ADMIN_POSTS_API = import.meta.env.VITE_ADMIN_POST;

  // Focus on title input when component mounts
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;

    if (!formTouched) {
      setFormTouched(true);
    }

    if (name === "title") {
      setTitle(value);
      setIsDirty(true);
    } else if (name === "published") {
      setPublished(checked);
      setIsDirty(true);
    } else if (name === "tags") {
      // Handle tags input change
      setTagsInput(value);
      setIsDirty(true);
    }
  };

  // Handle editor content change
  const handleEditorChange = () => {
    if (!formTouched) {
      setFormTouched(true);
    }

    setIsDirty(true);

    if (editorRef.current) {
      // Get content length for character count
      const content = editorRef.current.getContent();
      // Strip HTML tags for a more accurate character count
      const textContent = content.replace(/<[^>]*>/g, "");
      setContentLength(textContent.length);
    }
  };

  // Handle form submission
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Clear previous error message (using toast for success)
    setError(null);

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

    // Check if the editor content is empty or contains only the initial placeholder
    const isEditorContentEmpty =
      !editorContent.trim() || editorContent === "<p></p>"; // Updated check for initial empty state

    if (isEditorContentEmpty) {
      setError("Please add some content to your blog post.");
      if (editorRef.current) {
        // Focus the editor without selecting content
        editorRef.current.focus(false); // Pass false to prevent content selection on focus
      }
      return;
    }

    // Process tags input: split by comma, trim whitespace, and filter out empty strings
    const processedTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    const token = localStorage.getItem("token");
    if (!token) {
      setError(
        "You need to be logged in to create a post. Please log in and try again."
      );
      toast.error("Authentication required. Please log in.");
      return;
    }

    // Sanitization Step
    const sanitizedContent = DOMPurify.sanitize(editorContent);

    const submissionData = {
      title,
      content: sanitizedContent,
      published, // Send boolean directly
      tags: processedTags, // Include processed tags in the submission data
    };

    setLoading(true); // Start loading indicator

    try {
      console.log("Submitting new post to:", ADMIN_POSTS_API); // Log API endpoint
      const response = await axios.post(ADMIN_POSTS_API, submissionData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Post created successfully:", response.data);
      toast.success("Your blog post has been created successfully!"); // Use toast for success
      setIsDirty(false); // Reset dirty state after successful submission

      // Clear form
      setTitle("");
      setPublished(false);
      setTagsInput(""); // Clear tags input after successful submission
      if (editorRef.current) {
        editorRef.current.setContent("<p></p>"); // Reset to initial empty paragraph
        setContentLength(0); // Reset content length
      }

      // Show success state and redirect
      setTimeout(() => {
        navigate("/posts"); // Navigate to the posts list
      }, 1500); // Redirect after a short delay
    } catch (err) {
      console.error("Error creating post:", err);

      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          // Unauthorized or Forbidden
          setError(
            "You are not authorized to perform this action. Please log in as an admin."
          );
          toast.error(
            "Authorization failed. Please log in with admin privileges."
          );
        } else {
          setError(
            err.response.data.message ||
              "Failed to create your blog post. Please try again."
          );
          toast.error(
            err.response.data.message || "Failed to create blog post."
          );
        }
      } else {
        setError(
          "There was a problem connecting to the server. Please check your internet connection and try again."
        );
        toast.error(
          "Network error or unexpected issue. Failed to create post."
        );
      }
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  // Handle Cancel button click - show confirmation if form is dirty
  const handleCancel = () => {
    if (isDirty && formTouched) {
      setShowConfirmDialog(true); // Show confirmation modal
    } else {
      navigate("/posts"); // No changes, navigate back directly
    }
  };

  // Confirm discarding changes and navigate back
  const confirmCancel = () => {
    setShowConfirmDialog(false); // Hide modal
    navigate("/posts"); // Navigate back to the posts list
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
            <li>
              <span className="text-base-content/50">New Post</span>
            </li>
          </ul>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">Create New Blog Post</h1>
          <p className="text-base-content/50 mt-4">
            Share your thoughts with the world. Fill out the form below to
            create a new blog post.
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
                aria-hidden="true"
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
            aria-label="Create blog post form"
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
                className="input input-bordered w-full focus:input-primary rounded-md" // Added rounded-md
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
                className="input input-bordered w-full focus:input-primary rounded-md" // Added rounded-md
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
                  editor.on("keyup", handleEditorChange);
                  editor.on("change", handleEditorChange);
                  editor.on("undo", handleEditorChange); // Capture undo/redo
                  editor.on("redo", handleEditorChange);
                }}
                initialValue="<p></p>" // Set a minimal initial value
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
                className="btn btn-outline order-2 sm:order-1 flex-1 sm:flex-none rounded-md" // Added rounded-md
                onClick={handleCancel}
                disabled={loading} // Disable while submitting
                aria-label="Cancel creating new post"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary order-1 sm:order-2 flex-1 rounded-md" // Added rounded-md
                disabled={loading || (!formTouched && !isDirty)} // Disable if submitting or no changes made
                aria-live="polite" // Indicate that the button's status might change
                aria-label={
                  loading
                    ? "Creating post"
                    : published
                    ? "Publish post"
                    : "Save as draft"
                }
              >
                {loading ? (
                  <>
                    <span
                      className="loading loading-spinner loading-sm mr-4"
                      aria-hidden="true"
                    ></span>
                    Creating...
                  </>
                ) : published ? (
                  "Publish Post"
                ) : (
                  "Save as Draft"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-base-100 bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-base-200 rounded-lg shadow-xl max-w-md w-full p-6">
            {" "}
            {/* Adjusted padding */}
            <h3 id="confirm-dialog-title" className="text-lg font-bold mb-4">
              Discard changes?
            </h3>
            <p className="mb-6">
              {" "}
              {/* Adjusted margin */}
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

export default NewPostPage;
