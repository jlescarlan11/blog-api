import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuKeyRound, LuMail, LuUser } from "react-icons/lu";
// Assuming useAuth context is available for potential future use or consistency
import { useAuth } from "../context/AuthContext";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
}

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose }) => {
  const [search] = useSearchParams();
  // Initialize inviteCode from URL search params or empty string
  const inviteCode = search.get("invite") || "";
  const { login } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: inviteCode, // Set initial value from URL
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDialogElement>(null); // Ref for the modal element
  // const { login } = useAuth(); // Uncomment if you need to auto-login after signup

  // Effect to show/hide the modal using the dialog element's methods
  useEffect(() => {
    const modalElement = modalRef.current;
    if (modalElement) {
      if (isOpen) {
        // Use showModal() for a true modal that disables interaction outside
        modalElement.showModal();
      } else {
        modalElement.close();
      }
    }
  }, [isOpen]);

  // Handle closing the modal when clicking outside or pressing Escape
  useEffect(() => {
    const modalElement = modalRef.current;

    if (!modalElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the modal content box
      if (modalElement && !modalElement.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listeners only when the modal is open
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Add a slight delay before adding the click outside listener
      // to prevent the click that opened the modal from immediately closing it
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100); // Adjust delay if needed

      // Cleanup function to remove event listeners
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleClickOutside);
        clearTimeout(timer);
      };
    }
  }, [isOpen, onClose]); // Depend on isOpen and onClose

  // Update inviteCode state if the URL search param changes while modal is closed
  useEffect(() => {
    if (!isOpen) {
      const newInviteCode = search.get("invite") || "";
      if (newInviteCode !== formData.inviteCode) {
        setFormData((prev) => ({ ...prev, inviteCode: newInviteCode }));
      }
    }
  }, [search, isOpen, formData.inviteCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Basic validation for required fields (can be expanded)
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Replace with your actual signup API endpoint URL
      const signupUrl = import.meta.env.VITE_SIGNUP_URL;

      if (!signupUrl) {
        throw new Error("Missing VITE_SIGNUP_URL environment variable.");
      }

      // Simulate API call (replace with actual axios.post)
      console.log("Attempting signup with data:", formData);
      const res = await axios.post(signupUrl, formData);
      login(res.data.token);
      onClose();
      navigate("/");

      // Simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
      console.log("Signup successful (simulated).");

      // If signup is successful, you might want to:
      // 1. Auto-login the user: login(res.data.token);
      // 2. Close the modal: onClose();
      // 3. Navigate to a different page: navigate("/");

      // For now, just close the modal and navigate on simulated success
      onClose();
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      // Handle different error types from API if needed
      if (axios.isAxiosError(err) && err.response) {
        // Handle specific API error responses (e.g., email already exists)
        setError(
          err.response.data.message || "Signup failed. Please try again."
        );
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // DaisyUI modal structure using <dialog> element
  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box relative">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex flex-col items-center bg-base-100 py-8 px-4">
          <form
            onSubmit={handleSubmit}
            className="card w-full max-w-md bg-base-100"
          >
            <div className="card-body px-0">
              <div className="flex flex-col justify-center mb-4 items-center">
                <h2 className="card-title font-semibold text-2xl">
                  Create New Account
                </h2>
                <p className="text-xs font-medium">It's quick and easy</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div role="alert" className="alert alert-error mb-4">
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

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col">
                  <label className="input input-bordered flex items-center gap-2 w-full">
                    <LuUser className="opacity-50" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      required
                      className="grow"
                      // pattern="[A-Za-z][A-Za-z ]*" // Add back if needed, with appropriate hint
                      minLength={3}
                      maxLength={30}
                    />
                  </label>
                  {/* <p className="validator-hint hidden w-full">Hint for first name</p> */}
                </div>

                <div className="flex flex-col">
                  <label className="input input-bordered flex items-center gap-2 w-full">
                    <LuUser className="opacity-50" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      required
                      className="grow"
                      // pattern="[A-Za-z][A-Za-z ]*" // Add back if needed, with appropriate hint
                      minLength={3}
                      maxLength={30}
                    />
                  </label>
                  {/* <p className="validator-hint hidden w-full">Hint for last name</p> */}
                </div>
              </div>

              {/* Email Field */}
              <label className="input input-bordered flex items-center gap-2 mb-4 w-full">
                <LuMail className="opacity-50" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="mail@site.com"
                  required
                  className="grow"
                />
              </label>

              {/* Password Field */}
              <div className="mb-4">
                <label className="input input-bordered flex items-center gap-2 w-full">
                  <LuKeyRound className="opacity-50" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    minLength={8}
                    className="grow"
                    // pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" // Add back if needed, with appropriate hint
                  />
                </label>
                {/* <p className="validator-hint hidden w-full">Hint for password complexity</p> */}
              </div>

              {/* Confirm Password Field */}
              <label className="input input-bordered flex items-center gap-2 mb-8 w-full">
                <LuKeyRound className="opacity-50" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  required
                  className="grow"
                />
              </label>

              {/* Hidden Invite Code Field */}
              {/* This field is populated from the URL search param */}
              <input
                type="hidden"
                name="inviteCode"
                value={formData.inviteCode}
              />

              {/* Signup Button */}
              <button
                type="submit"
                className={`btn btn-primary w-full ${
                  isSubmitting ? "btn-disabled" : ""
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </button>

              {/* Divider and Login Link */}
              <div className="divider my-8">OR</div>

              <div className="text-center">
                <p className="text-sm">
                  Already have an account?{" "}
                  {/* Replace with your actual login route or handler */}
                  <a href="/login" className="link link-primary font-semibold">
                    Login here
                  </a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* This form method dialog button acts as the modal backdrop, clicking it closes the modal */}
      {/* It's a standard way to close <dialog> when clicking outside */}
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button> {/* This button is hidden */}
      </form>
    </dialog>
  );
};

export default SignupModal;
