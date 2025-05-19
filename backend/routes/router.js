const express = require("express");
const { controller } = require("../controllers/controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get(
  "/api/admin/posts/:postId",
  authenticate,
  authorize("ADMIN"),
  controller.getBlogPostById
);
router.get("/api/posts/:postId", authenticate, controller.getBlogPostById);

router.get("/", (req, res) => {
  res.json("hello from backend");
});
router.post("/api/auth/signup", controller.signup);
router.post("/api/auth/login", controller.login);

router.get("/api/posts", authenticate, controller.getBlogPosts);

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

router.get(
  "/api/admin/posts",
  authenticate,
  authorize("ADMIN"),
  controller.getBlogPosts
);

// router.patch(
//   "/api/admin/posts/:id",
//   authenticate,
//   authorize("ADMIN"),
//   controller.updateBlogPost
// );

router.post(
  "/api/admin/posts",
  authenticate,
  authorize("ADMIN"),
  controller.createBlogPost
);

router.patch(
  "/api/admin/posts/:postId/status",
  authenticate,
  authorize("ADMIN"),
  controller.updateBlogPostStatus
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

router.patch(
  "/api/admin/posts/:postId",
  authenticate,
  authorize("ADMIN"),
  controller.updateBlogPost
);

module.exports = router;
