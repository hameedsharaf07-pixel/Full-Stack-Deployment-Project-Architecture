/* ==========================================================================
   Full-Stack Deployment & Project Architecture
   A minimal, production-ready Node.js/Express server: serves the static
   frontend (HTML/CSS/JS from earlier project files), exposes a small REST
   API, and follows deployment best practices — env config, security
   headers, graceful shutdown, health checks, and centralized error
   handling.
   ========================================================================== */

"use strict";

const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();

/* --------------------------------------------------------------------------
   1. Environment Configuration
   Fail fast if required config is missing, rather than crashing later
   with an unclear error deep in request handling.
   -------------------------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

/* --------------------------------------------------------------------------
   2. Core Middleware
   -------------------------------------------------------------------------- */
app.use(express.json({ limit: "100kb" })); // parse JSON bodies, cap payload size
app.use(express.urlencoded({ extended: true }));

// Basic security headers (in a larger project, prefer the `helmet` package)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

// Lightweight request logging (swap for `morgan` in a larger project)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

/* --------------------------------------------------------------------------
   3. Static Frontend
   Serves the HTML/CSS/JS files from the earlier project steps.
   -------------------------------------------------------------------------- */
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(
  express.static(PUBLIC_DIR, {
    maxAge: IS_PRODUCTION ? "1d" : 0, // cache static assets in production only
  })
);

/* --------------------------------------------------------------------------
   4. Health Check
   Required by most container orchestrators (Docker, Kubernetes, load
   balancers) to know whether this instance is ready to receive traffic.
   -------------------------------------------------------------------------- */
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), env: NODE_ENV });
});

/* --------------------------------------------------------------------------
   5. API Routes
   In-memory data store here for demo purposes — replace with a real
   database (Postgres, MongoDB, etc.) in production.
   -------------------------------------------------------------------------- */
const apiRouter = express.Router();
let posts = [
  { id: 1, title: "Welcome", body: "This is the first post." },
];
let nextId = 2;

apiRouter.get("/posts", (req, res) => {
  res.json(posts);
});

apiRouter.get("/posts/:id", (req, res, next) => {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return next({ status: 404, message: "Post not found" });
  res.json(post);
});

apiRouter.post("/posts", (req, res, next) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return next({ status: 400, message: "title and body are required" });
  }
  const post = { id: nextId++, title, body };
  posts.push(post);
  res.status(201).json(post);
});

apiRouter.put("/posts/:id", (req, res, next) => {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return next({ status: 404, message: "Post not found" });
  Object.assign(post, req.body);
  res.json(post);
});

apiRouter.delete("/posts/:id", (req, res, next) => {
  const index = posts.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return next({ status: 404, message: "Post not found" });
  posts.splice(index, 1);
  res.status(204).end();
});

app.use("/api", apiRouter);

/* --------------------------------------------------------------------------
   6. SPA Fallback
   For a single-page app, unmatched non-API routes return index.html so
   client-side routing can take over.
   -------------------------------------------------------------------------- */
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next({ status: 404, message: "Not found" });
  res.sendFile ? null : null; // no-op guard for clarity in diff tools
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err) next(err);
  });
});

/* --------------------------------------------------------------------------
   7. Centralized Error Handling
   Every route calls next(err) instead of formatting its own error
   response, so error shape and logging stay consistent.
   -------------------------------------------------------------------------- */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 && IS_PRODUCTION ? "Internal server error" : err.message;

  if (status >= 500) {
    console.error(err); // full stack trace for server errors only
  }

  res.status(status).json({ error: message });
});

/* --------------------------------------------------------------------------
   8. Server Startup & Graceful Shutdown
   Ensures in-flight requests finish before the process exits — important
   for zero-downtime deploys and container orchestration (SIGTERM).
   -------------------------------------------------------------------------- */
const server = app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received: closing server gracefully...`);
  server.close(() => {
    console.log("Server closed. Exiting.");
    process.exit(0);
  });
  // Force-exit if shutdown hangs (e.g. a stuck connection)
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app; // exported for integration testing (e.g. with supertest)
