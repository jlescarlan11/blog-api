const jwt = require("jsonwebtoken"); // <-- Add this line

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.error("JWT Error:", err.message); // Log the error details
    res.status(401).json({ error: "Invalid token" });
  }
};
