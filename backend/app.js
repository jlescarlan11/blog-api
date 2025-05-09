// Load environment variables
require("dotenv").config(); // converted from import "dotenv/config"

// Core dependencies
const express = require("express"); // converted from import express from "express" :contentReference[oaicite:0]{index=0}
const helmet = require("helmet"); // converted from import helmet from "helmet" :contentReference[oaicite:1]{index=1}
const morgan = require("morgan"); // converted from import morgan from "morgan" :contentReference[oaicite:2]{index=2}
const cors = require("cors"); // converted from import cors from "cors" :contentReference[oaicite:3]{index=3}

// Your router (make sure router.js exports via module.exports)
const router = require("./routes/router");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", router);

// Start server
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
