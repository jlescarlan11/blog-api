const express = require("express");
const { controller } = require("../controllers/controller");

const router = express.Router();

router.get("/", (req, res) => {
  res.json("hello from backend");
});
router.post("/signup", controller.signup);
router.post("/login", controller.login);

module.exports = router;
