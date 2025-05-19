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
      // Enhanced logging
      console.error("Signup error:", err);
      res.status(500).json({
        error: "Server error during signup process.",
        details: err.message,
      });
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
      // Enhanced logging
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error", details: err.message });
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
      // Enhanced logging
      console.error("Admin login error:", err);
      res.status(500).json({
        error: "Server error during admin login",
        details: err.message,
      });
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
      // Enhanced logging
      console.error("Dashboard error:", err);
      res.status(500).json({ error: "Server error", details: err.message });
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
      // Enhanced logging
      console.error("Update user name error:", err);
      res.status(500).json({
        error: "Server error during name update.",
        details: err.message,
      });
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
      // Enhanced logging
      console.error("Change password error:", err);
      res.status(500).json({
        error: "Server error during password change.",
        details: err.message,
      });
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
      // Enhanced logging
      console.error("Error in controller deleting user:", error);
      // Handle errors appropriately
      res.status(500).json({
        error: "An error occurred while deleting the user.",
        details: error.message,
      });
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
      // Enhanced logging
      console.error("Error in controller fetching users:", error);
      res.status(500).json({
        error: "An error occurred while fetching users.",
        details: error.message,
      });
    }
  },
  createBlogPost: async (req, res) => {
    const { content, title, published, tags } = req.body; // Add tags to destructuring
    const authorId = req.user.id; // Assumes req.user is populated by auth middleware
    try {
      const isPublished = published === true || published === "true"; // Handle boolean or string "true"
      // Validate tags: ensure it's an array of strings
      if (
        tags !== undefined &&
        (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))
      ) {
        return res
          .status(400)
          .json({ message: "Tags must be an array of strings." });
      }
      const newPost = await query.post.create(
        title,
        content,
        isPublished,
        authorId,
        tags // Pass tags to the query function
      );
      // Invalidate the cache for all blog posts after creation
      cache.del(CACHE_KEYS.ALL_BLOG_POSTS());
      res.status(201).json({
        post: {
          id: newPost.id,
          title: newPost.title,
          content: newPost.content,
          published: newPost.published,
          authorId: newPost.authorId,
          tags: newPost.tags, // Include tags in the response
          views: newPost.views, // Include views in the response
          likes: newPost.likes, // Include likes in the response
        },
        message: "Blog post created successfully.",
      });
    } catch (err) {
      // Enhanced logging
      console.error("Create posts error: ", err);
      res
        .status(500)
        .json({ error: "Failed to create blog post.", details: err.message });
    }
  },
  // --- NEW FUNCTION TO GET ALL BLOG POSTS ---
  getAllBlogPosts: async (req, res) => {
    const cacheKey = CACHE_KEYS.ALL_BLOG_POSTS();
    const cachedPosts = cache.get(cacheKey);
    if (cachedPosts) {
      console.log(`Serving ALL blog posts from cache for key: ${cacheKey}`);
      return res.status(200).json(cachedPosts);
    }
    try {
      // Fetch all posts from the database, including author information
      const allPosts = await query.post.getAll(); // Assuming query.post.getAll exists
      // Cache the fetched result
      cache.set(cacheKey, allPosts);
      console.log(`Fetched and cached ALL blog posts for key: ${cacheKey}`);
      res.status(200).json(allPosts);
    } catch (err) {
      // Enhanced logging
      console.error("Error fetching all blog posts:", err);
      res.status(500).json({
        error: "Server error fetching all blog posts.",
        details: err.message,
      });
    }
  },
  getAllPost: async (req, res) => {
    const cacheKey = CACHE_KEYS.ALL_BLOG_POSTS();
    const cachedPosts = cache.get(cacheKey);

    if (cachedPosts) {
      console.log(`Serving ALL blog posts from cache for key: ${cacheKey}`);
      return res.status(200).json(cachedPosts);
    }

    try {
      const allPosts = await query.post.getAllPost();
      cache.set(cacheKey, allPosts);
      console.log(`Fetched and cached ALL blog posts for key: ${cacheKey}`);
      res.status(200).json(allPosts);
    } catch (err) {
      // Enhanced logging
      console.error("Error fetching all blog posts:", err);
      res.status(500).json({
        error: "Server error fetching all blog posts.",
        details: err.message,
      });
    }
  },
  // --- END OF NEW FUNCTION ---
  getBlogPostById: async (req, res) => {
    const { postId } = req.params;
    // We need the user ID to check if they liked the post.
    // Assumes req.user is populated by the `authenticate` middleware.
    const userId = req.user ? req.user.id : null; // Get user ID if authenticated

    // Note: Caching post details including user-specific like status is tricky.
    // If you cache the post *with* the liked status, different users will get
    // the wrong liked status from the cache.
    // A better approach is to cache the *post data without user-specific info*
    // and fetch the user's like status separately on the frontend, or
    // fetch the post data and then check the like status using the new query
    // *before* sending the response.
    // For simplicity here, we'll fetch the post and then check the like status.
    // If you need more advanced caching, consider strategies like
    // caching public post data and fetching user-specific data separately.

    try {
      // Fetch the post details
      const post = await query.post.getById(postId);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found." });
      }

      let hasLiked = false;
      if (userId) {
        // Check if the authenticated user has liked this post
        hasLiked = await query.post.hasUserLikedPost(userId, postId);
      }

      // Combine post data with user's like status
      const postWithLikedStatus = {
        ...post,
        hasLiked: hasLiked, // Add the hasLiked status to the response
      };

      // Note: We are not caching the postWithLikedStatus directly because it's user-specific.
      // If you want to cache the base post data, you would do it before adding hasLiked.
      // cache.set(cacheKey, post); // Cache the base post data if needed

      res.status(200).json(postWithLikedStatus); // Send the combined data
    } catch (err) {
      // Enhanced logging
      console.error("Error fetching blog post by ID:", err);
      res.status(500).json({
        error: "Server error fetching blog post details.",
        details: err.message,
      });
    }
  },

  // Consolidated Controller function to update blog post (handles status and full updates)
  updateBlogPost: async (req, res) => {
    const { postId } = req.params;
    // Extract all potential update fields from the request body
    const { title, content, published, tags } = req.body;

    try {
      const updateData = {}; // Object to hold fields to update

      // Add fields to updateData only if they are present in the request body
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      // Convert published to boolean if present
      if (published !== undefined)
        updateData.published = published === true || published === "true";

      if (tags !== undefined) {
        // Validate tags: ensure it's an array of strings if provided
        if (
          !Array.isArray(tags) ||
          !tags.every((tag) => typeof tag === "string")
        ) {
          return res
            .status(400)
            .json({ message: "Tags must be an array of strings if provided." });
        }
        updateData.tags = tags; // Add tags array to update data
      }

      // If no fields are provided in the body, return a bad request
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
      }

      // Assumes query.post.update exists and can handle partial updates
      const updatedPost = await query.post.update(postId, updateData);

      if (!updatedPost) {
        return res.status(404).json({ message: "Blog post not found." });
      }
      // Invalidate blog post related caches after update
      cache.invalidateAllBlogCaches(postId); // Pass postId to invalidate specific caches
      console.log(`Invalidated caches for blog post ${postId}`);
      res.status(200).json({
        message: `Blog post ${postId} updated successfully.`,
        post: updatedPost, // Return the updated post including new fields
      });
    } catch (err) {
      // Enhanced logging
      console.error("Error updating blog post:", err);
      // Handle specific errors, e.g., Prisma errors
      if (err.code === "P2025") {
        // Prisma error code for record not found
        return res.status(404).json({ message: "Blog post not found." });
      }
      res.status(500).json({
        error: "Server error during blog post update.",
        details: err.message,
      });
    }
  },

  // Removed the separate updateBlogPostStatus function as it's consolidated
  // updateBlogPostStatus: async (req, res) => { ... }

  deleteBlogPost: async (req, res) => {
    const { postId } = req.params;
    try {
      console.log("hello");
      // Assumes query.post.delete exists
      const deletedPost = await query.post.delete(postId);
      if (!deletedPost) {
        return res.status(404).json({ message: "Blog post not found." });
      }
      // Invalidate blog post related caches after deletion
      cache.invalidateAllBlogCaches(postId); // Pass postId to invalidate specific caches
      console.log(`Invalidated caches for deleted blog post ${postId}`);
      res
        .status(200)
        .json({ message: `Blog post ${postId} deleted successfully.` });
    } catch (err) {
      // Enhanced logging
      console.error("Error deleting blog post:", err);
      if (err.code === "P2025") {
        // Prisma error code for record not found
        return res.status(404).json({ message: "Blog post not found." });
      }
      res.status(500).json({
        error: "Server error during blog post deletion.",
        details: err.message,
      });
    }
  },
  deleteAllBlogPosts: async (req, res) => {
    try {
      // Note: This deletes ALL posts. Invalidate all blog caches.
      // Assuming the request body for bulk-delete contains { postIds: [...] }
      const { postIds } = req.body;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Array of postIds is required for bulk delete." });
      }

      // Use deleteMany with an 'in' filter
      const deletedPosts = await query.post.deleteMany({
        id: {
          in: postIds,
        },
      });

      // We don't have specific post IDs here from deleteMany result,
      // so invalidate all blog post related caches.
      cache.invalidateAllBlogCaches();
      console.log(`Invalidated caches after bulk deletion`);
      res.status(200).json({
        message: `${deletedPosts.count} blog posts deleted successfully.`,
      });
    } catch (err) {
      // Enhanced logging
      console.error("Error bulk deleting blog posts:", err);
      res.status(500).json({
        error: "Server error during bulk blog posts deletion.",
        details: err.message,
      });
    }
  },
  /**
   * Registers a view for a specific post.
   * Requires authentication.
   * @param {object} req - Express request object (expects postId in params).
   * @param {object} res - Express response object.
   */
  registerView: async (req, res) => {
    const { postId } = req.params;
    // Optional: Add logic here to prevent multiple views from the same user/IP within a time frame
    // For simplicity, we'll just increment the view count for every authenticated request.
    try {
      await query.post.incrementViews(postId);
      // Invalidate the cache for this specific post detail as views have changed
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      // Note: We don't necessarily need to return the updated post, just confirm success
      res.status(200).json({ message: "View registered successfully." });
    } catch (err) {
      // Enhanced logging
      console.error(`Error registering view for post ${postId}:`, err);
      // Handle specific errors, e.g., post not found
      if (err.message && err.message.includes("Record to update not found")) {
        // Check if err.message exists
        return res.status(404).json({ error: "Post not found." });
      }
      res
        .status(500)
        .json({ error: "Failed to register view.", details: err.message });
    }
  },

  /**
   * Increments the like count for a specific post.
   * Requires authentication.
   * @param {object} req - Express request object (expects postId in params).
   * @param {object} res - Express response object.
   */
  likePost: async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id; // Get the authenticated user's ID

    try {
      // Call the new toggleLike query function
      const { post: updatedPost, liked } = await query.post.toggleLike(
        postId,
        userId
      );

      // Invalidate the cache for this specific post detail as likes have changed
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));

      res.status(200).json({
        message: liked
          ? "Post liked successfully."
          : "Post unliked successfully.",
        likes: updatedPost.likes, // Return the new total like count
        liked: liked, // Return the new like status for this user
      });
    } catch (err) {
      // Enhanced logging
      console.error(
        `Error toggling like for post ${postId} by user ${userId}:`,
        err
      );
      // Handle specific errors, e.g., post not found
      if (err.message && err.message.includes("Record to update not found")) {
        // Check if err.message exists
        return res.status(404).json({ error: "Post not found." });
      }
      res
        .status(500)
        .json({ error: "Failed to toggle like status.", details: err.message });
    }
  },

  // --- COMMENT CONTROLLERS ---
  /**
   * Fetches comments for a specific blog post.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  getCommentsForPost: async (req, res) => {
    const { postId } = req.params;
    const cacheKey = CACHE_KEYS.POST_COMMENTS(postId);
    const cachedComments = cache.get(cacheKey);
    if (cachedComments) {
      console.log(`Serving comments from cache for post ${postId}`);
      return res.status(200).json(cachedComments);
    }
    try {
      const comments = await query.comment.getByPostId(postId);
      // Map the comments to match the frontend's expected structure
      const formattedComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          firstName: comment.user.firstName,
          lastName: comment.user.lastName,
        },
      }));
      cache.set(cacheKey, formattedComments); // Cache the formatted comments
      console.log(`Fetched, formatted, and cached comments for post ${postId}`);
      res.status(200).json(formattedComments); // Send the formatted comments
    } catch (err) {
      // Enhanced logging
      console.error(`Error fetching comments for post ${postId}:`, err);
      res
        .status(500)
        .json({ error: "Failed to fetch comments.", details: err.message });
    }
  },
  /**
   * Creates a new comment for a blog post.
   * Requires authentication.
   * @param {object} req - Express request object (expects postId in params, content in body).
   * @param {object} res - Express response object.
   */
  createComment: async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Assuming user is attached by authentication middleware
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ message: "Comment content cannot be empty." });
    }
    try {
      const newComment = await query.comment.create(postId, userId, content);
      // Invalidate the cache for comments on this specific post
      cache.del(CACHE_KEYS.POST_COMMENTS(postId));
      cache.del(CACHE_KEYS.ALL_BLOG_POSTS(postId));
      // Optionally, invalidate the post detail cache if it includes comment count
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      // Return the newly created comment, including author details
      res.status(201).json({
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.createdAt,
        author: {
          firstName: newComment.user.firstName,
          lastName: newComment.user.lastName,
        },
      });
    } catch (err) {
      // Enhanced logging
      console.error(`Error creating comment for post ${postId}:`, err);
      res
        .status(500)
        .json({ error: "Failed to create comment.", details: err.message });
    }
  },
  updateComment: async (req, res) => {
    const { postId, commentId } = req.params;

    console.log(req.body);

    try {
      const updatedComment = await query.comment.update(commentId, req.body);

      cache.del(CACHE_KEYS.POST_COMMENTS(postId));
      cache.del(CACHE_KEYS.ALL_BLOG_POSTS(postId));
      // Optionally, invalidate the post detail cache if it includes comment count
      cache.del(CACHE_KEYS.BLOG_POST_DETAIL(postId));
      // Return the newly created comment, including author details

      res.status(200).json(updatedComment);
    } catch (err) {
      // Enhanced logging
      console.error(`Error updating comment ${commentId}:`, err);
      res
        .status(500)
        .json({ error: "Failed to update comment.", details: err.message });
    }
  },
  /**
   * Deletes a comment by its ID.
   * Requires ADMIN role.
   * @param {object} req - Express request object (expects commentId in params).
   * @param {object} res - Express response object.
   */
  deleteComment: async (req, res) => {
    const { commentId } = req.params;
    try {
      // Call the query function to delete the comment
      const deletedComment = await query.comment.delete(commentId);
      // Invalidate the cache for comments on the post this comment belonged to
      // We need to get the postId from the deleted comment object
      if (deletedComment && deletedComment.postId) {
        cache.del(CACHE_KEYS.POST_COMMENTS(deletedComment.postId));
        // Optionally, invalidate the post detail cache if it includes comment count
        cache.del(CACHE_KEYS.BLOG_POST_DETAIL(deletedComment.postId));
      }
      res.status(200).json({ message: "Comment deleted successfully." });
    } catch (err) {
      // Enhanced logging
      console.error(`Error deleting comment ${commentId}:`, err);
      // Handle the specific error if the comment was not found
      if (err.message && err.message.includes("Comment with ID")) {
        // Check if err.message exists
        return res.status(404).json({ error: err.message });
      }
      res
        .status(500)
        .json({ error: "Failed to delete comment.", details: err.message });
    }
  },
  // --- END OF COMMENT CONTROLLERS ---
};

module.exports = { controller };
