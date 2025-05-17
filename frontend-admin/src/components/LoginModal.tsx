import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { login } from "../auth"; // Assuming this exists and handles token storage
import { useNavigate } from "react-router-dom"; // Removed Link import
import { LuKeyRound, LuMail } from "react-icons/lu";

interface FormData {
  email: string;
  password: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDialogElement>(null); // Ref for the modal element

  // Effect to show/hide the modal using the dialog element's methods
  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        modalRef.current.showModal();
      } else {
        modalRef.current.close();
      }
    }
  }, [isOpen]);

  // Handle closing the modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Add a slight delay before adding the click outside listener
      // to prevent the click that opened the modal from immediately closing it
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100); // Adjust delay if needed

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleClickOutside);
        clearTimeout(timer);
      };
    }
  }, [isOpen, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      const loginUrl = import.meta.env.VITE_ADMIN_LOGIN_URL;

      if (!loginUrl) {
        throw new Error("Missing LOGIN_URL");
      }

      const res = await axios.post(loginUrl, formData);
      login(res.data.token);
      onClose(); // Close modal on successful login
      navigate("/"); // Navigate to home page
    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // DaisyUI modal structure
  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box relative">
        {" "}
        {/* Added relative for close button positioning */}
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="flex flex-col flex-1 items-center bg-base-100 py-8 px-4">
          <form
            onSubmit={handleSubmit}
            className="card w-full max-w-md bg-base-100"
          >
            {" "}
            {/* Removed shadow and bg-base-200 from card as it's inside modal-box */}
            <div className="card-body px-0">
              {" "}
              {/* Adjusted padding */}
              <div className="flex flex-col justify-center mb-4 items-center">
                <h2 className="card-title font-semibold text-2xl">
                  Welcome Back
                </h2>
                <p className="text-xs font-medium">Continue to your account</p>
              </div>
              {error && (
                <div className="alert alert-error">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
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
                  <span>{error}</span>
                </div>
              )}
              <label className="input input-bordered flex items-center gap-2 mb-4 w-full">
                {" "}
                {/* Added input-bordered and flex items-center gap-2 for DaisyUI input style */}
                <LuMail className="opacity-50" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="mail@site.com"
                  required
                  className="grow" // Added grow to make input fill available space
                />
              </label>
              <label className="input input-bordered flex items-center gap-2 mb-8 w-full">
                {" "}
                {/* Added input-bordered and flex items-center gap-2 for DaisyUI input style */}
                <LuKeyRound className="opacity-50" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  minLength={8}
                  className="grow" // Added grow to make input fill available space
                />
              </label>
              <button
                type="submit"
                className={`btn btn-primary ${
                  isSubmitting ? "btn-disabled" : ""
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Logging In...
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* This div acts as the modal backdrop, clicking it closes the modal */}
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>{" "}
        {/* This button is hidden but needed for the form method */}
      </form>
    </dialog>
  );
};

export default LoginModal;
