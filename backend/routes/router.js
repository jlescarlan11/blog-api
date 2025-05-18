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

module.exports = router;
