const express = require("express");
const { controller } = require("../controllers/controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Route to get a single post by ID (accessible to authenticated users)
// This route will now be used for both viewing and fetching for editing
router.get("/api/posts/:postId", controller.getBlogPostById);
router.get(
  "/api/admin/posts/:postId",
  authenticate,
  authorize("ADMIN"),
  controller.getBlogPostById
);

router.get("/api/posts", controller.getAllPost);

//localhost:3000/api/admin/posts/c652dd3f-de6c-41ec-90ee-80179dda54c7

// --- NEW ROUTES FOR VIEWS AND LIKES ---

// Route to register a view for a post (requires authentication)
router.post("/api/posts/:postId/view", authenticate, controller.registerView);

// Route to like a post (requires authentication)
router.post("/api/posts/:postId/like", authenticate, controller.likePost);

// --- END NEW ROUTES ---

// Admin route to get a single post by ID (requires ADMIN role) - Kept for potential admin-specific data if needed, but public route is sufficient for post data
// router.get(
//   "/api/admin/posts/:postId",
//   authenticate,
//   authorize("ADMIN"),
//   controller.getBlogPostById // Reusing the same controller function
// );

router.get("/", (req, res) => {
  res.json("hello from backend");
});
router.post("/api/auth/signup", controller.signup);
router.post("/api/auth/login", controller.login);

// --- NEW ROUTE TO GET ALL BLOG POSTS (for frontend client-side handling) ---
router.get(
  "/api/admin/all-posts",
  authenticate,
  authorize("ADMIN"),
  controller.getAllBlogPosts
);
// --- END OF NEW ROUTE ---

// New route to update user name - Protected
router.put("/api/user/update-name", authenticate, controller.updateUserName);
// New route to change user password - Protected
router.put(
  "/api/user/change-password",
  authenticate,
  controller.changeUserPassword
);

router.post("/api/admin/login", controller.adminLogin);
router.get(
  "/api/admin/data",
  authenticate,
  authorize("ADMIN"),
  controller.dashboard
);

// Route for creating a new post (Admin only)
router.post(
  "/api/admin/posts",
  authenticate,
  authorize("ADMIN"),
  controller.createBlogPost
);

// Route for updating an individual post (Admin only)
// This route will now handle full post updates (title, content, published, tags)
// The previous /status route is removed and consolidated here.
router.patch(
  "/api/admin/posts/:postId",
  authenticate,
  authorize("ADMIN"),
  controller.updateBlogPost // Use the consolidated update function
);

router.delete(
  "/api/admin/posts/:postId",
  authenticate,
  authorize("ADMIN"),
  controller.deleteBlogPost
);

router.post(
  "/api/admin/posts/bulk-delete",
  authenticate,
  authorize("ADMIN"),
  controller.deleteAllBlogPosts
);

// --- COMMENT ROUTES ---

// Route to get comments for a specific post
router.get(
  "/api/posts/:postId/comments",
  authenticate, // Assuming comments require authentication to view
  controller.getCommentsForPost
);

// Route to create a new comment for a specific post
router.post(
  "/api/posts/:postId/comments",
  authenticate, // Assuming comments require authentication to create
  controller.createComment
);

router.delete(
  "/api/comments/:commentId",
  authenticate,
  authorize("ADMIN"), // Ensure only admins can delete comments
  controller.deleteComment
);

router.patch(
  "/api/:postId/comments/:commentId",
  authenticate,
  controller.updateComment
);

// --- END OF COMMENT ROUTES ---

module.exports = router;
