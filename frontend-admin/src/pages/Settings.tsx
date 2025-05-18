// settings.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { getToken } from "../auth";
import axios from "axios";
import {
  ArrowLeft,
  Check,
  Loader2,
  User,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser, login } = useAuth();

  // User information state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameUpdateLoading, setNameUpdateLoading] = useState(false);
  const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(
    null
  );
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const initial = user?.firstName?.charAt(0).toUpperCase() ?? "?";
  const userEmail = user?.email ?? "";
  const userFullname = `${firstName} ${lastName}`;

  // Update local state when user context changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  // Check password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (newPassword.length >= 8) strength += 1;
    if (/[A-Z]/.test(newPassword)) strength += 1;
    if (/[a-z]/.test(newPassword)) strength += 1;
    if (/[0-9]/.test(newPassword)) strength += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;

    setPasswordStrength(strength);
  }, [newPassword]);

  // Check if passwords match
  useEffect(() => {
    if (!confirmNewPassword || !newPassword) {
      setPasswordsMatch(true);
      return;
    }

    setPasswordsMatch(confirmNewPassword === newPassword);
  }, [confirmNewPassword, newPassword]);

  // Handle name update
  const handleNameUpdate = async () => {
    setNameUpdateLoading(true);
    setNameUpdateError(null);
    setNameUpdateSuccess(false);

    const token = getToken();
    if (!token) {
      setNameUpdateError(
        "Authentication token not found. Please log in again."
      );
      setNameUpdateLoading(false);
      return;
    }

    const updateNameUrl = import.meta.env.VITE_UPDATE_USER_NAME_URL;

    try {
      const response = await axios.put(
        updateNameUrl,
        { firstName, lastName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Handle response
      if (response.data && response.data.token) {
        login(response.data.token);
        setNameUpdateSuccess(true);
        setIsEditingName(false);
      } else if (response.data && response.data.user) {
        updateUser(response.data.user);
        setNameUpdateSuccess(true);
        setIsEditingName(false);
      } else {
        setNameUpdateError(
          "Name update successful, but could not refresh user data."
        );
        setNameUpdateSuccess(true);
        setIsEditingName(false);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setNameUpdateError(
          error.response.data.message ||
            error.message ||
            "Failed to update name."
        );
      } else {
        setNameUpdateError("An unexpected error occurred during name update.");
      }
      console.error("Name update error:", error);
    } finally {
      setNameUpdateLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    setPasswordChangeLoading(true);
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError("New passwords do not match.");
      setPasswordChangeLoading(false);
      return;
    }

    if (passwordStrength < 3) {
      setPasswordChangeError(
        "Password is not strong enough. Include a mix of uppercase, lowercase, numbers, and special characters."
      );
      setPasswordChangeLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setPasswordChangeError(
        "Authentication token not found. Please log in again."
      );
      setPasswordChangeLoading(false);
      return;
    }

    const changePasswordUrl = import.meta.env.VITE_UPDATE_USER_PASSWORD_URL;

    try {
      await axios.put(
        changePasswordUrl,
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPasswordChangeSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setPasswordChangeError(
          error.response.data.message ||
            error.message ||
            "Failed to change password."
        );
      } else {
        setPasswordChangeError(
          "An unexpected error occurred during password change."
        );
      }
      console.error("Password change error:", error);
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Reset success messages after a few seconds
  useEffect(() => {
    if (nameUpdateSuccess) {
      const timer = setTimeout(() => setNameUpdateSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    if (passwordChangeSuccess) {
      const timer = setTimeout(() => setPasswordChangeSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [nameUpdateSuccess, passwordChangeSuccess]);

  // Cancel name editing
  const handleCancelNameEdit = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setIsEditingName(false);
    setNameUpdateError(null);
  };

  return (
    <div className="bg-base-100 min-h-screen">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-sm mb-4 hover:underline"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Home
          </button>

          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-base-content/60">
            Manage your account preferences and security
          </p>
        </div>

        <div className="space-y-8">
          {/* Account Information Section */}
          <section
            className="card bg-base-200 shadow-sm"
            aria-labelledby="account-heading"
          >
            <div className="card-body">
              <h2 id="account-heading" className="card-title text-xl">
                Profile Information
              </h2>

              <div className="flex flex-col md:flex-row md:items-center gap-6 py-2">
                <div className="avatar">
                  <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
                    {initial ? (
                      <span className="text-xl font-medium">{initial}</span>
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  {isEditingName ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="firstName"
                            className="block text-sm font-medium mb-1"
                          >
                            First Name
                          </label>
                          <input
                            id="firstName"
                            type="text"
                            className="input w-full"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            aria-required="true"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="lastName"
                            className="block text-sm font-medium mb-1"
                          >
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            type="text"
                            className="input w-full"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            aria-required="true"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`btn btn-primary ${
                            nameUpdateLoading ? "loading" : ""
                          }`}
                          onClick={handleNameUpdate}
                          disabled={
                            nameUpdateLoading || !firstName || !lastName
                          }
                          aria-busy={nameUpdateLoading}
                        >
                          {nameUpdateLoading ? (
                            <>
                              <Loader2
                                size={16}
                                className="animate-spin mr-2"
                              />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={handleCancelNameEdit}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">
                        {userFullname || "Add your name"}
                      </h3>
                      <p className="text-base-content/70">{userEmail}</p>
                      <button
                        className="btn btn-outline btn-sm mt-2"
                        onClick={() => setIsEditingName(true)}
                      >
                        Edit Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {nameUpdateError && (
                <div className="alert alert-error text-sm mt-4 flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {nameUpdateError}
                </div>
              )}

              {nameUpdateSuccess && (
                <div className="alert alert-success text-sm mt-4 flex items-center">
                  <Check size={16} className="mr-2" />
                  Profile updated successfully!
                </div>
              )}
            </div>
          </section>

          {/* Change Password Section */}
          <section
            className="card bg-base-200 shadow-sm"
            aria-labelledby="password-heading"
          >
            <div className="card-body">
              <h2 id="password-heading" className="card-title text-xl">
                Security
              </h2>
              <p className="text-base-content/60 mb-4">
                Update your password to keep your account secure
              </p>

              <div className="space-y-4">
                <div className="form-control">
                  <label htmlFor="current-password" className="label">
                    <span className="label-text">Current Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      className="input w-full pr-10"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      aria-required="true"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      aria-label={
                        showCurrentPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-control">
                  <label htmlFor="new-password" className="label">
                    <span className="label-text">New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      className="input w-full pr-10"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      aria-required="true"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center">
                        <div className="text-xs mb-1">Password strength:</div>
                        <div className="ml-2 text-xs">
                          {passwordStrength < 3
                            ? "Weak"
                            : passwordStrength < 5
                            ? "Medium"
                            : "Strong"}
                        </div>
                      </div>
                      <div className="flex w-full h-1 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            passwordStrength < 3
                              ? "bg-error"
                              : passwordStrength < 5
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                      <ul className="text-xs mt-2 text-base-content/70 space-y-1">
                        <li
                          className={
                            newPassword.length >= 8 ? "text-success" : ""
                          }
                        >
                          • At least 8 characters
                        </li>
                        <li
                          className={
                            /[A-Z]/.test(newPassword) ? "text-success" : ""
                          }
                        >
                          • At least one uppercase letter
                        </li>
                        <li
                          className={
                            /[a-z]/.test(newPassword) ? "text-success" : ""
                          }
                        >
                          • At least one lowercase letter
                        </li>
                        <li
                          className={
                            /[0-9]/.test(newPassword) ? "text-success" : ""
                          }
                        >
                          • At least one number
                        </li>
                        <li
                          className={
                            /[^A-Za-z0-9]/.test(newPassword)
                              ? "text-success"
                              : ""
                          }
                        >
                          • At least one special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label htmlFor="confirm-password" className="label">
                    <span className="label-text">Confirm New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`input w-full pr-10 ${
                        !passwordsMatch && confirmNewPassword
                          ? "input-error"
                          : ""
                      }`}
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      aria-required="true"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {!passwordsMatch && confirmNewPassword && (
                    <div className="text-error text-xs mt-1">
                      Passwords do not match
                    </div>
                  )}
                </div>

                <button
                  className={`btn btn-primary ${
                    passwordChangeLoading ? "loading" : ""
                  }`}
                  onClick={handlePasswordChange}
                  disabled={
                    passwordChangeLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmNewPassword ||
                    !passwordsMatch ||
                    passwordStrength < 3
                  }
                  aria-busy={passwordChangeLoading}
                >
                  {passwordChangeLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>

                {passwordChangeError && (
                  <div className="alert alert-error text-sm flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    {passwordChangeError}
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="alert alert-success text-sm flex items-center">
                    <Check size={16} className="mr-2" />
                    Password changed successfully!
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Theme Section */}
          <section
            className="card bg-base-200 shadow-sm"
            aria-labelledby="theme-heading"
          >
            <div className="card-body">
              <h2 id="theme-heading" className="card-title text-xl">
                Appearance
              </h2>
              <p className="text-base-content/60 mb-4">
                Customize how the application looks for you
              </p>

              <div className="flex items-center space-x-4">
                <ThemeSwitcher />
                <span className="text-base-content">Dark Mode</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
