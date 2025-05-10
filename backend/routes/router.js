const express = require("express");
const { controller } = require("../controllers/controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get("/", (req, res) => {
  res.json("hello from backend");
});
router.post("/api/auth/signup", controller.signup);
router.post("/api/auth/login", controller.login);
// router.get("/post", controller.getAllPost);
// router.post("/post", authenticate, authorize("ADMIN"), controller.createPost);
// router.put("/post:id", authenticate, authorize("ADMIN"), controller.updatePost);
// router.delete(
//   "/post/:id",
//   authenticate,
//   authorize("ADMIN"),
//   controller.deletePost
// );

module.exports = router;
