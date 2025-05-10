const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const query = require("../utils/query");

// Helper to sign a JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
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

      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

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
      res.json({ user });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = { controller };
