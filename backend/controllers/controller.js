const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const query = require("../utils/query");
const cache = require("../utils/cache"); // Import the tailored cache module
const { CACHE_KEYS } = require("../utils/cache"); // Import cache keys

// Helper to sign a JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2d",
    }
  );
}

const controller = {
  signup: async (req, res) => {
    const { firstName, lastName, email, password, inviteCode } = req.body;

    try {
      if (await query.user.getByEmail(email)) {
        return res.status(409).json({ message: "Email already exists." });
      }

      const isAdmin = inviteCode === process.env.ADMIN_INVITE_CODE;

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await query.user.create(
        firstName,
        lastName,
        email,
        hashedPassword,
        isAdmin
      );

      // Generate token with updated user information
      const token = generateToken(newUser);

      // Invalidate user-related caches after a new user is created
      cache.invalidateAllUserCaches();

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Server error during signup process." });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await query.user.getByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token with user information
      const token = generateToken(user);
      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        token,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },

  adminLogin: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await query.user.getByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Additional admin role check
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token with admin user information
      const token = generateToken(user);
      res.status(200).json({
        message: "Admin login successful",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (err) {
      console.error("Admin login error:", err);
      res.status(500).json({ error: "Server error during admin login" });
    }
  },

  dashboard: (req, res) => {
    try {
      const user = req.user; // make sure you attach the user in your auth middleware
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      // If dashboard data were being fetched here, you would add caching logic:
      // const cacheKey = CACHE_KEYS.DASHBOARD_DATA(user.id, ...date range if applicable...);
      // const cachedData = cache.get(cacheKey);
      // if (cachedData) return res.json(cachedData);
      // ... fetch data ...
      // cache.set(cacheKey, fetchedData);
      // res.json(fetchedData);

      res.json({ user }); // Current basic implementation
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Controller function to update user name
  updateUserName: async (req, res) => {
    console.log("Received request to update user name.");
    const userId = req.user.id; // Get user ID from the authenticated user
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required." });
    }

    try {
      const updatedUser = await query.user.updateName(
        userId,
        firstName,
        lastName
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found." });
      }

      // Generate a new token with updated name
      const token = generateToken(updatedUser);

      // Invalidate user-related caches after name update
      cache.invalidateAllUserCaches();

      res.status(200).json({
        message: "User name updated successfully.",
        user: {
          // Include the updated user object
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
        },
        token, // Include the new token
      });
    } catch (err) {
      console.error("Update user name error:", err);
      res.status(500).json({ error: "Server error during name update." });
    }
  },

  // Controller function to change user password
  changeUserPassword: async (req, res) => {
    const userId = req.user.id; // Get user ID from the authenticated user
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required." });
    }

    try {
      const user = await query.user.getById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid current password." });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await query.user.updatePassword(userId, hashedNewPassword);

      // Invalidate user-related caches after password change
      cache.invalidateAllUserCaches();

      res.status(200).json({ message: "Password changed successfully." });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Server error during password change." });
    }
  },

  // Placeholder for deleteUser - Invalidate cache if implemented
  deleteUser: async (req, res) => {
    const { userId } = req.params;
    try {
      // await query.user.deleteUser(userId); // Uncomment and implement in query.js
      // Invalidate user-related caches after user deletion
      cache.invalidateAllUserCaches();
      res.status(200).json({
        message: "User deletion logic here. User deleted successfully.",
      }); // Replace with actual response
    } catch (error) {
      console.error("Error in controller deleting user:", error);
      // Handle errors appropriately
      res
        .status(500)
        .json({ error: "An error occurred while deleting the user." });
    }
  },

  // Placeholder for getUsers - Add caching if implemented
  getUsers: async (req, res) => {
    const { search, page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    // Generate cache key based on query parameters
    const cacheKey = CACHE_KEYS.ADMIN_USERS_LIST(search, pageNum, limitNum);
    const cachedUsers = cache.get(cacheKey);

    if (cachedUsers) {
      console.log("Serving users from cache.");
      return res.status(200).json(cachedUsers);
    }

    try {
      // const { users, totalUsers } = await query.user.getUsers(search, pageNum, limitNum); // Uncomment and implement in query.js
      const users = []; // Placeholder
      const totalUsers = 0; // Placeholder

      const result = { users, totalUsers };
      // Cache the users list
      cache.set(cacheKey, result);

      console.log("Fetched users and cached.");
      res.status(200).json(result); // Replace with actual response
    } catch (error) {
      console.error("Error in controller fetching users:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching users." });
    }
  },

  // Placeholder for blog post controllers - Add caching and invalidation as needed
  createBlogPost: async (req, res) => {
    // ... logic to create blog post ...
    // Invalidate blog post related caches after creation
    cache.invalidateAllBlogCaches();
    res.status(201).json({ message: "Blog post creation logic here." }); // Replace
  },

  getBlogPosts: async (req, res) => {
    const { filter, sort, page, limit } = req.query;
    const cacheKey = CACHE_KEYS.BLOG_POSTS_LIST(filter, sort, page, limit);
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) return res.status(200).json(cachedPosts);

    // ... logic to fetch blog posts ...
    const posts = []; // Placeholder
    const totalPosts = 0; // Placeholder
    const result = { posts, totalPosts };

    cache.set(cacheKey, result);
    res.status(200).json(result); // Replace
  },

  getBlogPostById: async (req, res) => {
    const { postId } = req.params;
    const cacheKey = CACHE_KEYS.BLOG_POST_DETAIL(postId);
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) return res.status(200).json(cachedPost);

    // ... logic to fetch single blog post ...
    const post = { id: postId, title: "Example Post", content: "..." }; // Placeholder

    cache.set(cacheKey, post);
    res.status(200).json(post); // Replace
  },

  updateBlogPost: async (req, res) => {
    const { postId } = req.params;
    // ... logic to update blog post ...
    // Invalidate blog post related caches after update
    cache.invalidateAllBlogCaches();
    // Also invalidate the specific post detail cache
    cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
    res.status(200).json({ message: `Blog post ${postId} update logic here.` }); // Replace
  },

  deleteBlogPost: async (req, res) => {
    const { postId } = req.params;
    // ... logic to delete blog post ...
    // Invalidate blog post related caches after deletion
    cache.invalidateAllBlogCaches();
    // Also invalidate the specific post detail cache
    cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
    res
      .status(200)
      .json({ message: `Blog post ${postId} deletion logic here.` }); // Replace
  },
};

module.exports = { controller };
