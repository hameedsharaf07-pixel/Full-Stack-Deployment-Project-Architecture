# Full-Stack Deployment & Project Architecture

A minimal, production-ready Node.js/Express backend plus the deployment tooling (Docker, Compose, deploy script) needed to ship it. Serves the earlier HTML/CSS/JS project files as a static frontend and exposes a small REST API backed by an in-memory store.

## Project structure

```
fullstack-project/
├── public/                     # static frontend (move earlier project files here)
│   ├── index.html
│   ├── advanced-responsive.css
│   ├── app-logic.js
│   └── api-client.js
├── server.js                   # Express server + REST API + deployment concerns
├── package.json
├── .env.example                 # copy to .env locally, never commit .env
├── Dockerfile
├── docker-compose.yml
├── deploy.sh
└── .gitignore
```

## Files

| File | Purpose |
|---|---|
| `server.js` | Express server: static file serving, `/api/posts` CRUD, health check, error handling, graceful shutdown |
| `package.json` | Dependencies (`express`, `dotenv`) and npm scripts |
| `.env.example` | Template for environment variables — copy to `.env` |
| `Dockerfile` | Container build: non-root user, production install, built-in health check |
| `docker-compose.yml` | Local orchestration; includes a commented-out Postgres service |
| `deploy.sh` | Builds an image, health-checks it before promoting it, rolls back on failure |
| `.gitignore` | Excludes `node_modules`, `.env`, logs, build output |

## Architecture decisions

- **Centralized error handling** — every route calls `next(err)` instead of formatting its own response, so error shape and logging stay consistent across the whole API
- **Fail-fast config** — environment variables are read once at startup (`PORT`, `NODE_ENV`) rather than scattered through request handlers
- **Health check endpoint (`/healthz`)** — required by load balancers and container orchestrators to know when an instance is ready for traffic; wired into both the `Dockerfile` `HEALTHCHECK` and `deploy.sh`
- **Graceful shutdown** — listens for `SIGTERM`/`SIGINT` and lets in-flight requests finish before exiting, important for zero-downtime deploys
- **Non-root container user** — the Dockerfile creates and switches to an unprivileged user, reducing the container's attack surface
- **SPA fallback route** — unmatched non-API routes serve `index.html`, so client-side routing (if added later) keeps working on refresh/deep links

## Getting started (local)

```bash
npm install
cp .env.example .env
npm run dev      # auto-restarts on file changes (Node 18+)
# or
npm start
```

Visit `http://localhost:3000` for the frontend and `http://localhost:3000/healthz` for the health check.

## Getting started (Docker)

```bash
docker compose up --build
```

This builds the image, starts the container, and runs the health check defined in `docker-compose.yml`.

## Deploying

```bash
chmod +x deploy.sh
./deploy.sh
```

The script builds a new image, runs it on a side port (`3001`) for a health check, and only promotes it to the production port (`3000`) if the check passes — otherwise it rolls back automatically and leaves the old container running.

## Extending this setup

- **Database** — uncomment the `db` service in `docker-compose.yml` and replace the in-memory `posts` array in `server.js` with real queries
- **CI/CD** — wrap `deploy.sh`'s steps in a GitHub Actions / GitLab CI pipeline that runs on merge to `main`
- **Reverse proxy / TLS** — put Nginx or Caddy in front of this container in production, or use a managed platform (Render, Fly.io, Railway) that handles TLS for you
- **Security hardening** — swap the hand-rolled security headers for the `helmet` package as the app grows

## Related

- `api-client.js` — the frontend fetch layer that talks to this server's `/api/posts` routes
- `app-logic.js` — state management and form handling
- `advanced-responsive.css` / `semantic-accessibility-demo.html` — frontend structure and styling
