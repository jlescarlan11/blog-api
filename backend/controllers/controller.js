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
      // Assuming query.user has a getPaginated function similar to the blog posts one
      // const { users, totalUsers } = await query.user.getPaginated(search, pageNum, limitNum); // Uncomment and implement in query.js
      const users = []; // Placeholder
      const totalUsers = 0; // Placeholder

      const result = { users, totalUsers, page: pageNum, limit: limitNum };
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

  createBlogPost: async (req, res) => {
    const { content, title, published } = req.body;
    const authorId = req.user.id;

    try {
      const isPublished = published === "true"; // Convert to boolean

      const newPost = await query.post.create(
        title,
        content,
        isPublished,
        authorId
      );

      cache.invalidateAllBlogCaches();

      res.status(201).json({
        post: {
          id: newPost.id,
          title: newPost.title,
          content: newPost.content,
          published: newPost.published,
          authorId: newPost.authorId,
        },
        message: "Blog post created successfully.",
      });
    } catch (err) {
      console.error("Create posts error: ", err);
      res.status(500).json({ error: "Failed to create blog post." });
    }
  },

  // --- MODIFIED getBlogPosts FUNCTION ---
  getBlogPosts: async (req, res) => {
    // Extract pagination, filtering, and sorting parameters
    const { filter, sort, page, limit, search } = req.query; // Added search
    const pageNum = parseInt(page) || 1; // Default to page 1
    const limitNum = parseInt(limit) || 10; // Default to 10 items per page
    const skip = (pageNum - 1) * limitNum; // Calculate how many records to skip

    // Generate cache key based on ALL relevant parameters (including pagination)
    const cacheKey = CACHE_KEYS.BLOG_POSTS_LIST(
      search, // Include search in key
      filter,
      sort,
      pageNum, // Use parsed page number
      limitNum // Use parsed limit number
    );
    const cachedPosts = cache.get(cacheKey);

    if (cachedPosts) {
      console.log(`Serving blog posts from cache for key: ${cacheKey}`);
      return res.status(200).json(cachedPosts);
    }

    try {
      // --- Call the query function with pagination parameters ---
      // ASSUMPTION: query.post.getPaginated exists and takes skip, take, search, filter, sort
      // It should return an object like { posts: [...], totalPosts: number }
      const { posts, totalPosts } = await query.post.getPaginated(
        skip,
        limitNum,
        search, // Pass search down to query layer
        filter, // Pass filter down to query layer
        sort // Pass sort down to query layer
      );

      console.log("sort:", sort);

      // Structure the result with pagination metadata
      const result = {
        posts,
        totalPosts,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalPosts / limitNum),
      };

      // Cache the fetched result
      cache.set(cacheKey, result);
      console.log(`Workspaceed and cached blog posts for key: ${cacheKey}`);

      res.status(200).json(result);
    } catch (err) {
      console.error("Error fetching blog posts:", err);
      res.status(500).json({ error: "Server error fetching blog posts." });
    }
  },
  // --- END OF MODIFIED getBlogPosts FUNCTION ---

  getBlogPostById: async (req, res) => {
    const { postId } = req.params;
    const cacheKey = CACHE_KEYS.BLOG_POST_DETAIL(postId);
    const cachedPost = cache.get(cacheKey);
    if (cachedPost) return res.status(200).json(cachedPost);

    console.log("here");

    try {
      // Assumes query.post.getById exists
      const post = await query.post.getById(postId);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found." });
      }

      cache.set(cacheKey, post);
      res.status(200).json(post);
    } catch (err) {
      console.error("Error fetching blog post by ID:", err);
      res
        .status(500)
        .json({ error: "Server error fetching blog post details." });
    }
  },

  updateBlogPost: async (req, res) => {
    const { postId } = req.params;
    const { title, content, published } = req.body;

    try {
      // Assumes query.post.update exists
      const updatedPost = await query.post.update(postId, {
        title,
        content,
        published: published !== undefined ? published === "true" : undefined, // Convert to boolean if provided
      });

      if (!updatedPost) {
        return res.status(404).json({ message: "Blog post not found." });
      }

      // Invalidate blog post related caches after update
      cache.invalidateAllBlogCaches();
      // Also invalidate the specific post detail cache
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      console.log(`Invalidated caches for blog post ${postId}`);

      res.status(200).json({
        message: `Blog post ${postId} updated successfully.`,
        post: updatedPost,
      });
    } catch (err) {
      console.error("Error updating blog post:", err);
      res.status(500).json({ error: "Server error during blog post update." });
    }
  },
  updateBlogPostStatus: async (req, res) => {
    const { postId } = req.params;
    const { published } = req.body;

    console.log(postId);
    try {
      console.log("is", published);
      // Assumes query.post.update exists
      const updatedPost = await query.post.update(postId, {
        published: published,
      });

      if (!updatedPost) {
        return res.status(404).json({ message: "Blog post not found." });
      }

      // Invalidate blog post related caches after update
      cache.invalidateAllBlogCaches();
      // Also invalidate the specific post detail cache
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      console.log(`Invalidated caches for blog post ${postId}`);

      console.log(updatedPost);
      console.log("here");
      res.status(200).json({
        message: `Blog post ${postId} updated successfully.`,
        post: updatedPost,
      });
    } catch (err) {
      console.error("Error updating blog post:", err);
      res.status(500).json({ error: "Server error during blog post update." });
    }
  },
  deleteBlogPost: async (req, res) => {
    const { postId } = req.params;

    try {
      // Assumes query.post.delete exists
      const deletedPost = await query.post.delete(postId);

      if (!deletedPost) {
        return res.status(404).json({ message: "Blog post not found." });
      }

      // Invalidate blog post related caches after deletion
      cache.invalidateAllBlogCaches();
      // Also invalidate the specific post detail cache
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      console.log(`Invalidated caches for deleted blog post ${postId}`);

      res
        .status(200)
        .json({ message: `Blog post ${postId} deleted successfully.` });
    } catch (err) {
      console.error("Error deleting blog post:", err);
      res
        .status(500)
        .json({ error: "Server error during blog post deletion." });
    }
  },
  deleteAllBlogPosts: async (req, res) => {
    try {
      const deletedPosts = await query.post.deleteAll();

      if (!deletedPosts) {
        return res.status(404).json({ message: "Blog posts not found." });
      }

      // Invalidate blog post related caches after deletion
      cache.invalidateAllBlogCaches();
      console.log(`Invalidated caches for deleted blog posts`);

      res.status(200).json({ message: `Blog posts deleted successfully.` });
    } catch (err) {
      console.error("Error deleting blog posts:", err);
      res
        .status(500)
        .json({ error: "Server error during blog posts deletion." });
    }
  },
};

module.exports = { controller };
