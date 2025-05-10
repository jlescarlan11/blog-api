import React, { useState } from "react";
import axios from "axios";
import { login } from "../auth";
import { useNavigate } from "react-router-dom";
import { LuKeyRound, LuMail, LuNewspaper, LuUser } from "react-icons/lu";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Signup: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      const signupUrl = import.meta.env.VITE_SIGNUP_URL;

      console.log("I am here");
      if (!signupUrl) {
        throw new Error("Missing SIGNUP_URL");
      }

      const res = await axios.post(signupUrl, formData);
      login(res.data.token);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 p-4">
      <div className="text-4xl flex items-center mb-8 gap-4">
        <LuNewspaper className="" />
        <h1 className=" font-bold ">Sutta's Blog</h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md shadow-lg bg-base-200"
      >
        <div className="card-body">
          <div className="flex flex-col justify-center mb-4 items-center">
            <h2 className="card-title font-semibold text-2xl">
              Create New Account
            </h2>
            <p className="text-xs font-medium">It's quick and easy</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col">
              <label className="input validator w-full">
                <LuUser className="opacity-50" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  required
                  pattern="[A-Za-z][A-Za-z ]*"
                  minLength={3}
                  maxLength={30}
                />
              </label>
              <p className="validator-hint hidden w-full">
                Must be 3 to 30 characters containing only letters or spaces
              </p>
            </div>

            <div className="flex flex-col">
              <label className="input validator w-full">
                <LuUser className="opacity-50" />

                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  required
                  pattern="[A-Za-z][A-Za-z ]*"
                  minLength={3}
                  maxLength={30}
                />
              </label>
              <p className="validator-hint hidden w-full">
                Must be 3 to 30 characters containing only letters or spaces
              </p>
            </div>
          </div>

          <label className="input validator mb-4 w-full">
            <LuMail className="opacity-50" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="mail@site.com"
              required
            />
          </label>

          <div className="mb-4">
            <label className="input validator  w-full">
              <LuKeyRound className="opacity-50" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                minLength={8}
                pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              />
            </label>
            <p className="validator-hint hidden w-full">
              Must be more than 8 characters, including At least one number At
              least one lowercase letter At least one uppercase letter
            </p>
          </div>

          <label className="input validator mb-8 w-full">
            <LuKeyRound className="opacity-50" />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              required
            />
          </label>

          <button
            type="submit"
            className={`btn btn-primary  ${isSubmitting ? "btn-disabled" : ""}`}
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

          <div className="divider my-8">OR</div>

          <div className="text-center">
            <p className="text-sm">
              Already have an account?{" "}
              <a href="/login" className="link link-primary font-semibold">
                Login here
              </a>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Signup;
