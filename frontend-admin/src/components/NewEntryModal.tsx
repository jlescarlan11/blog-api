import React, { useState, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { useNavigate } from "react-router-dom";

const NewPostPage: React.FC = () => {
  const navigate = useNavigate();
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    const submissionData = {
      title,
      content: editorRef.current ? editorRef.current.getContent() : "",
      published,
    };

    console.log("Form Submitted:", submissionData);
    navigate("/posts");
  };

  const handleCancel = () => {
    navigate("/posts");
  };

  // Properly typed AI request handler
  const handleAIRequest = (
    request: any, // You can define a proper type here if needed
    respondWith: (handler: (query: string) => Promise<never>) => void
  ) => {
    respondWith.string(() =>
      Promise.reject("See docs to implement AI Assistant")
    );
  };

  return (
    <div className="container max-w-3xl mx-auto pb-12 bg-transparent">
      <div className="px-4 py-8 bg-transparent">
        <div className="text-sm breadcrumbs">
          <ul>
            <li>
              <button className="hover:underline" onClick={() => navigate("/")}>
                Home
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("/posts")}
                className="hover:underline"
              >
                Posts
              </button>
            </li>
            <li>
              <span>New Post</span>
            </li>
          </ul>
        </div>

        <h1 className="text-2xl font-bold mb-8">Create New Blog Post</h1>

        <div className="flex flex-col flex-1 items-center bg-transparent">
          <form onSubmit={handleSubmit} className="card w-full bg-transparent">
            <div className="card-body px-0">
              <label className="form-control w-full mb-4">
                <div className="label">
                  <span className="label-text">Title</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post Title"
                  className="input input-bordered w-full bg-base-100"
                  required
                />
              </label>

              <label className="form-control w-full mb-4">
                <div className="label">
                  <span className="label-text">Content</span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    onInit={(_evt, editor) => (editorRef.current = editor)}
                    initialValue="<p>Write your post content here...</p>"
                    init={{
                      height: 500,
                      skin: window.matchMedia("(prefers-color-scheme: dark)")
                        .matches
                        ? "oxide-dark"
                        : "oxide",
                      content_css: window.matchMedia(
                        "(prefers-color-scheme: dark)"
                      ).matches
                        ? "dark"
                        : "default",
                      plugins: [
                        "anchor",
                        "autolink",
                        "charmap",
                        "codesample",
                        "emoticons",
                        "image",
                        "link",
                        "lists",
                        "media",
                        "searchreplace",
                        "table",
                        "visualblocks",
                        "wordcount",
                        "checklist",
                        "mediaembed",
                        "casechange",
                        "formatpainter",
                        "pageembed",
                        "a11ychecker",
                        "tinymcespellchecker",
                        "permanentpen",
                        "powerpaste",
                        "advtable",
                        "advcode",
                        "editimage",
                        "advtemplate",
                        "ai",
                        "mentions",
                        "tinycomments",
                        "tableofcontents",
                        "footnotes",
                        "mergetags",
                        "autocorrect",
                        "typography",
                        "inlinecss",
                        "markdown",
                        "importword",
                        "exportword",
                        "exportpdf",
                      ],
                      toolbar:
                        "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat",
                      tinycomments_mode: "embedded",
                      tinycomments_author: "Author name",
                      mergetags_list: [
                        { value: "First.Name", title: "First Name" },
                        { value: "Email", title: "Email" },
                      ],
                      ai_request: handleAIRequest,
                      content_style: `
                        body {
                          font-family:Helvetica,Arial,sans-serif; 
                          font-size:14px;
                          background-color: base-100 !important;
                        }
                        .tox-tinymce {
                          background-color: base-100 !important;
                          border-color: hsl(var(--bc) !important;
                        }
                        .tox-editor-container {
                          background-color: transparent !important;
                        }
                        .tox-toolbar__primary {
                          background-color: hsl(var(--b1)) !important;
                          border-bottom-color: hsl(var(--bc)) !important;
                        }
                        .tox-tbtn {
                          color: hsl(var(--bc)) !important;
                        }
                        .tox-tbtn:hover {
                          background-color: hsl(var(--b3)) !important;
                        }
                      `,
                    }}
                  />
                </div>
              </label>

              <div className="form-control mb-6">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Publish Post</span>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-grow">
                  Create Post
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewPostPage;
