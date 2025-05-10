import React, { useState } from "react";
import axios from "axios";
import { login } from "../auth";
import { useNavigate, Link } from "react-router-dom";
import { LuKeyRound, LuMail, LuNewspaper } from "react-icons/lu";

interface FormData {
  email: string;
  password: string;
}

const LogIn: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
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

    try {
      setIsSubmitting(true);
      const loginUrl = import.meta.env.VITE_LOGIN_URL;

      if (!loginUrl) {
        throw new Error("Missing LOGIN_URL");
      }

      const res = await axios.post(loginUrl, formData);
      login(res.data.token);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      // Modified error handling
      if (axios.isAxiosError(err)) {
        // Server responded with 4xx/5xx status
        setError(err.response?.data?.error || "An unexpected error occurred");
      } else if (err instanceof Error) {
        // Other errors
        setError(err.message);
      } else {
        // Unknown errors
        setError("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-base-100 py-8 px-4">
      <div className="text-4xl flex items-center mb-8 gap-4">
        <LuNewspaper className="" />
        <h1 className="font-bold">Sutta's Blog</h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md shadow-lg bg-base-200"
      >
        <div className="card-body">
          <div className="flex flex-col justify-center mb-4 items-center">
            <h2 className="card-title font-semibold text-2xl">Welcome Back</h2>
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

          <label className="input validator mb-8 w-full">
            <LuKeyRound className="opacity-50" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              minLength={8}
            />
          </label>

          <button
            type="submit"
            className={`btn btn-primary ${isSubmitting ? "btn-disabled" : ""}`}
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

          <div className="divider my-8"></div>

          <div className="text-center">
            <p className="text-sm">
              Admin access only. Regular users should use the{" "}
              <Link to="/signup" className="link link-primary font-semibold">
                main site login
              </Link>
              {""}.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LogIn;
