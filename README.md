# FrameFlow API

[![NestJS](https://img.shields.io/badge/NestJS-12-e0234e?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Web Repo](https://img.shields.io/badge/Web-frameflow--web-181717?style=flat-square&logo=github)](https://github.com/ahmedzzabdalla0/frameflow-web)
[![Portfolio](https://img.shields.io/badge/Portfolio-frameflow-000000?style=flat-square&logo=vercel&logoColor=white)](https://portfolio-ahmedabdelsalam.vercel.app/projects/frameflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-e44444?style=flat-square)](./LICENSE)

A production-ready **NestJS 12 + PostgreSQL + Prisma 7** backend for the FrameFlow media player. Scans a local video library, manages metadata and categories, generates thumbnails via `ffmpeg`, and streams video files — all behind a JWT-authenticated REST API with interactive **Swagger/OpenAPI** documentation.

---

## 1. Project Overview

FrameFlow API is a pure JSON + media-streaming backend built on NestJS's modular architecture. It scans a folder of video files and stores metadata (title, duration, size, rating, categories, thumbnail seek time) in a PostgreSQL database via Prisma 7 ORM. Thumbnails are generated on demand with `ffmpeg`. The Next.js frontend — **[frameflow-web](https://github.com/ahmedzzabdalla0/frameflow-web)** — is the only client; this service exposes no server-rendered views. This project is also featured on the **[author's portfolio](https://portfolio-ahmedabdelsalam.vercel.app/projects/frameflow)**.

Key design decisions:

- **PostgreSQL 16** accessed through **Prisma 7 ORM** with `@prisma/adapter-pg` driver adapter via `pg.Pool`, giving end-to-end type safety and real schema migrations.
- **Fully normalized relational schema** — explicit join tables, a `position` column for category ordering, and dedicated settings tables instead of loosely-typed JSON blobs.
- **JWT-based authentication and authorization** (via `@nestjs/passport` + `@nestjs/jwt`). All read-only/player-facing endpoints are public; all administrative operations (category management, video deletion, library scanning, thumbnail configuration, player defaults) require an authenticated `ADMIN` user.
- **`tsx`** as the TypeScript execution engine for scripts and seeds, ensuring full compatibility with Node.js v24+.
- **TypeScript 5.x** (`~5.7.0`) pinned for compatibility with NestJS CLI build engines.
- **NestJS modular architecture**: Controllers handle HTTP concerns only, Services own business logic, DTOs validate every request body/query, and cross-cutting concerns (auth, error formatting, logging, rate limiting) live in guards/filters/interceptors.
- **Swagger / OpenAPI docs** (`@nestjs/swagger`) generated directly from controller and DTO decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) and served as an interactive UI at `/api/docs`, including a "Bearer" auth button for trying admin-only routes.

---

## 2. PostgreSQL Schema

Defined in `prisma/schema.prisma`. All tables use `snake_case` column names via Prisma `@map`/`@@map` while the Prisma Client exposes idiomatic `camelCase` in TypeScript.

| Table                                 | Purpose                                                              | Key columns                                                                                                      | Constraints / Indexes                                                                         |
| ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `users`                               | Admin accounts for JWT auth                                          | `id` (uuid, PK), `email`, `password_hash`, `role` (enum `ADMIN`)                                                 | `email` unique                                                                                |
| `videos`                              | One row per scanned video file                                       | `id` (PK), `rel_path`, `title`, `added_at`, `duration_seconds`, `size_bytes` (bigint), `rating` (nullable float) | `rel_path` unique; indexes on `title`, `added_at`, `rating`, `duration_seconds`, `size_bytes` |
| `categories`                          | Tag/category definitions, including the reserved `dislikes` category | `id` (PK), `name`, `color`, `position` (nullable int), `is_reserved` (bool)                                      | `name` unique; index on `position`                                                            |
| `video_categories`                    | **N:M** join between videos and categories                           | `video_id` (FK → videos, cascade), `category_id` (FK → categories, cascade)                                      | composite PK `(video_id, category_id)`; index on `category_id`                                |
| `thumb_seeks`                         | **1:1** with `videos` — the manually-chosen thumbnail timestamp      | `id` (PK), `video_id` (FK, unique), `seek_time`                                                                  | `video_id` unique (enforces 1:1)                                                              |
| `player_settings`                     | Singleton row of default player behaviour                            | `id` (PK), `default_pure_only`, `default_intersection_only`                                                      | single row by convention                                                                      |
| `player_settings_included_categories` | **N:M** join: categories included by default in the player           | `settings_id` (FK), `category_id` (FK)                                                                           | composite PK                                                                                  |
| `player_settings_excluded_categories` | **N:M** join: categories excluded by default in the player           | `settings_id` (FK), `category_id` (FK)                                                                           | composite PK                                                                                  |

Relational mappings at a glance:

- **1:1** — `videos.id` ↔ `thumb_seeks.video_id`
- **1:N** — a `category` has many `video_categories` rows (and vice versa, forming the N:M below)
- **N:M** — `videos` ↔ `categories` via `video_categories`; `player_settings` ↔ `categories` via two separate join tables (included/excluded), since a category can independently be a default-include and never a default-exclude (or both, or neither)

Design notes:

- **Prisma 7 Driver Adapter Integration:** Database connections use `@prisma/adapter-pg` backed by a native `pg.Pool` connection pool, initialized directly inside `PrismaService` and `prisma/seed.ts`.
- Category display order is stored as a real `position` integer column on `categories`, with the reserved `dislikes` category always pinned last.
- The `is_reserved` flag on `categories` is the single source of truth for reserved categories. `CategoriesService.ensureDislikesCategory()` creates/normalizes it on startup.
- `size_bytes` is `BigInt` at the database level and is converted to a plain `number` at the API boundary, keeping the JSON response compatible with the frontend.

---

## 3. System Architecture

```
src/
  main.ts                     Bootstrap: Helmet, CORS, global "/api" prefix (media streaming excluded)
  app.module.ts               Root module: Custom Joi environment validation function,
                              global ValidationPipe, exception filter, logging interceptor,
                              rate limiting, and JWT/roles guards
  config/                     Typed configuration + Joi environment validation schema
  prisma/                     Global PrismaService/PrismaModule with Prisma 7 @prisma/adapter-pg Driver Adapter
  common/
    decorators/               @Public(), @Roles(), @CurrentUser()
    guards/                   JwtAuthGuard (respects @Public), RolesGuard (RBAC)
    filters/                  GlobalExceptionFilter — consistent { ok:false, error, ... } errors
    interceptors/             LoggingInterceptor
    constants/                Reserved category name constants
  modules/
    auth/                     Login + JWT issuance (bcrypt password check)
    users/                    User lookups for the auth layer
    videos/                   Listing, filtering, sorting, pagination (up to 10k per page), rating, dislike toggle,
                              bulk category assignment, deletion, library scan, metadata refresh
    categories/               CRUD, reordering, the reserved "dislikes" category, category→video map
    thumbnails/               On-demand thumbnail generation/caching, seek-time configuration
    settings/                 Singleton player defaults (included/excluded categories, pure/intersection flags)
    media/                    Range-request video streaming with ETag/Last-Modified support
    scanner/                  Filesystem scan for new video files
    ffmpeg/                   Shared ffprobe/ffmpeg wrapper (duration probing, thumbnail extraction)
```

**Layering.** Every feature module follows the same shape: `*.controller.ts` (HTTP + guards only) → `*.service.ts` (business logic, the only layer that talks to Prisma) → `dto/*.ts` (class-validator input contracts). Controllers never touch `PrismaService` directly.

**Cross-cutting concerns.**

- **NestJS 12 `ConfigModule` Validation:** Uses a direct `validate` wrapper function around Joi inside `ConfigModule.forRoot` to bypass `StandardSchemaV1` type mismatches introduced in NestJS 12 while maintaining runtime schema safety.
- `JwtAuthGuard` and `RolesGuard` are registered globally in `AppModule`, so every route is authenticated-by-default; routes are opted **out** of auth with `@Public()`, and opted **into** a role requirement with `@Roles('ADMIN')`.
- `GlobalExceptionFilter` normalizes every thrown `HttpException` (validation errors, `NotFoundException`, `ForbiddenException`, etc.) into one consistent JSON error shape.
- `ThrottlerGuard` (`@nestjs/throttler`) applies a global rate limit, configurable via environment variables.
- `class-validator`/`class-transformer` DTOs validate and coerce every request body and query string; unknown properties are rejected (`forbidNonWhitelisted`).

---

## 4. Setup & Installation

### Prerequisites

- Node.js 20+ (Node.js v24 supported)
- TypeScript 5.x (`~5.7.0`)
- PostgreSQL 16
- `ffmpeg` and `ffprobe` available on the `PATH` (used for duration probing and thumbnail generation)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, UPLOADS_DIR, THUMBS_DIR

# 3. Generate the Prisma client
npm run prisma:generate

# 4. Run migrations against your PostgreSQL database
npm run prisma:migrate:dev --name init

# 5. Seed the initial admin user and default player settings row
npm run prisma:seed

# 6. Start the server
npm run start:dev       # development, with watch mode
npm run start:prod      # after `npm run build`, for production
```

The API listens on `PORT` (default `3568`) with the global prefix `/api`, except for the media-streaming route `GET /video/:filename`, which is intentionally left unprefixed to match a simple CDN/reverse-proxy rule if needed.

Once the server is running, interactive Swagger/OpenAPI documentation is available at **`/api/docs`** — every endpoint, DTO, and response shape is documented there, and admin-only routes can be tried out directly by authorizing with a `Bearer` token obtained from `POST /api/auth/login`.

To pick up existing video files, drop them into `UPLOADS_DIR` and call `POST /api/videos/scan` as an authenticated admin, or point `UPLOADS_DIR` at your existing media folder — no file moves required, only a scan.

---

## 5. Environment Variables

| Variable               | Description                                         | Example                                                                   |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`             | Runtime environment                                 | `development`                                                             |
| `PORT`                 | HTTP port the server listens on                     | `3568`                                                                    |
| `DATABASE_URL`         | PostgreSQL connection string used by Prisma         | `postgresql://frameflow:frameflow@localhost:5433/frameflow?schema=public` |
| `JWT_SECRET`           | Secret used to sign/verify JWTs (min 16 chars)      | a long random string                                                      |
| `JWT_EXPIRES_IN`       | Access token lifetime                               | `1d`                                                                      |
| `ADMIN_EMAIL`          | Email for the seeded admin account                  | `admin@example.com`                                                       |
| `ADMIN_PASSWORD`       | Password for the seeded admin account (min 8 chars) | a strong password                                                         |
| `UPLOADS_DIR`          | Directory scanned for video files and streamed from | `./storage/uploads`                                                       |
| `THUMBS_DIR`           | Directory used to cache generated thumbnails        | `./storage/thumbs`                                                        |
| `VIDEO_EXTENSIONS`     | Comma-separated list of accepted video extensions   | `.mp4,.mov,.webm,.m4v,.mkv`                                               |
| `CORS_ORIGIN`          | Allowed CORS origin for the frontend                | `*` or `https://your-frontend.example.com`                                |
| `THROTTLE_TTL_SECONDS` | Rate-limit window size                              | `60`                                                                      |
| `THROTTLE_LIMIT`       | Max requests per window per client                  | `120`                                                                     |

---

## 6. API Documentation

> **Interactive docs:** the full OpenAPI spec is served as a Swagger UI at **`/api/docs`** once the server is running — it reflects the exact DTOs and response shapes below and lets you authorize with a Bearer token to try admin-only routes directly in the browser. The table here is a quick-reference summary.

All routes below are prefixed with `/api` except `GET /video/:filename`. Routes marked **Admin** require `Authorization: Bearer <token>` for a user with role `ADMIN`; everything else is public.

| Method | Route                      | Auth      | DTO (body/query)                                                                                                                   | Sample response                                                                                                                                                                                  |
| ------ | -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/login`              | Public    | `LoginDto { email, password }`                                                                                                     | `{"accessToken":"...","expiresIn":"1d","user":{"id":"...","email":"admin@example.com","role":"ADMIN"}}`                                                                                          |
| GET    | `/videos`                  | Public    | `QueryVideosDto { category?, q?, page?, per_page?, sort?, order? }` (query string, `per_page` up to 10000)                         | `{"videos":[{"id":1,"rel_path":"clip.mp4","title":"clip","added_at":"2026-01-01T00:00:00.000Z","duration_seconds":124.5,"size_bytes":10485760,"rating":4.5,"categories":["travel"]}],"total":1}` |
| GET    | `/videos/stats`            | Public    | —                                                                                                                                  | `{"total_videos":42,"total_size_bytes":5368709120}`                                                                                                                                              |
| PUT    | `/videos/bulk-categories`  | **Admin** | `BulkUpdateCategoriesDto { ids: number[], categories: string[] }`                                                                  | `{"ok":true,"updated":3}`                                                                                                                                                                        |
| PUT    | `/videos/:id`              | **Admin** | `UpdateVideoDto { title?, categories?, rating? }`                                                                                  | `{"ok":true,"video":{"id":1,"title":"New title", "...":"..."}}`                                                                                                                                  |
| POST   | `/videos/dislike`          | Public    | `ToggleDislikeDto { video, disliked? }`                                                                                            | `{"ok":true,"disliked":true,"video":{"...":"..."}}`                                                                                                                                              |
| POST   | `/videos/rating`           | Public    | `SetRatingDto { video, rating }`                                                                                                   | `{"ok":true,"rating":4.5}`                                                                                                                                                                       |
| DELETE | `/videos/:id`              | **Admin** | —                                                                                                                                  | `{"ok":true}`                                                                                                                                                                                    |
| POST   | `/videos/scan`             | **Admin** | —                                                                                                                                  | `{"ok":true,"added":3}`                                                                                                                                                                          |
| POST   | `/videos/refresh-metadata` | **Admin** | `RefreshMetadataDto { ids?: number[] }`                                                                                            | `{"ok":true,"refreshed":42}`                                                                                                                                                                     |
| GET    | `/categories`              | Public    | —                                                                                                                                  | `{"travel":["clip.mp4"],"__uncategorized__":["other.mp4"],"dislikes":[]}`                                                                                                                        |
| GET    | `/categories/list`         | Public    | —                                                                                                                                  | `[{"id":1,"name":"travel","color":"#e44","count":12},{"id":0,"name":"__uncategorized__","color":"#777","count":2},{"id":2,"name":"dislikes","color":"#e44444","count":0}]`                       |
| POST   | `/categories/reorder`      | **Admin** | `ReorderCategoriesDto { ids: number[] }`                                                                                           | `{"ok":true,"ids":[3,1,2,4]}`                                                                                                                                                                    |
| POST   | `/categories`              | **Admin** | `CreateCategoryDto { name, color? }`                                                                                               | `{"ok":true,"category":{"id":5,"name":"music","color":"#e44"}}`                                                                                                                                  |
| PUT    | `/categories/:id`          | **Admin** | `UpdateCategoryDto { name?, color? }`                                                                                              | `{"ok":true,"category":{"id":5,"name":"music-videos","color":"#00aacc"}}`                                                                                                                        |
| DELETE | `/categories/:id`          | **Admin** | —                                                                                                                                  | `{"ok":true}`                                                                                                                                                                                    |
| GET    | `/settings`                | Public    | —                                                                                                                                  | `{"default_included_categories":["travel"],"default_excluded_categories":[],"default_pure_only":false,"default_intersection_only":false}`                                                        |
| POST   | `/settings`                | **Admin** | `UpdateSettingsDto { default_included_categories?, default_excluded_categories?, default_pure_only?, default_intersection_only? }` | `{"ok":true}`                                                                                                                                                                                    |
| GET    | `/thumb/:relPath`          | Public    | —                                                                                                                                  | binary JPEG (or a placeholder SVG if generation fails)                                                                                                                                           |
| POST   | `/set-thumb-seek`          | **Admin** | `SetThumbSeekDto { video, seek }` (`seek` as `HH:MM:SS[.ms]`)                                                                      | `{"ok":true}`                                                                                                                                                                                    |
| POST   | `/clear-thumbs`            | **Admin** | —                                                                                                                                  | `{"ok":true,"deleted":17}`                                                                                                                                                                       |
| GET    | `/video/:filename`         | Public    | —                                                                                                                                  | binary video stream, HTTP range/206 support, `ETag`/`Last-Modified`                                                                                                                              |

### Error shape

Every error response (validation failure, 401/403/404, uncaught exception) is normalized by `GlobalExceptionFilter` to:

```json
{
  "ok": false,
  "statusCode": 404,
  "error": "Video 42 was not found",
  "path": "/api/videos/42",
  "timestamp": "2026-09-11T12:00:00.000Z"
}
```

---

## 7. Docker & Local Orchestration

The service ships with a multi-stage `Dockerfile` and a `docker-compose.yml` that runs the API alongside PostgreSQL 16. Docker exposes the database externally on port **`5433`** to avoid conflicts with any local PostgreSQL instance on `5432`.

**Run everything locally:**

```bash
cp .env.example .env
docker compose up --build
```

This starts two services:

- `db` — PostgreSQL 16 Alpine, exposed externally on `5433:5432` with a health check (`pg_isready`) gating the app's startup.
- `app` — builds the runtime container, waits for `db` healthiness, executes `npx prisma migrate deploy`, and boots NestJS.

Useful follow-up commands:

```bash
docker compose logs -f app
docker compose exec app npm run prisma:seed
docker compose down
docker compose down -v
```

To rebuild after dependency changes:

```bash
docker compose up --build --force-recreate
```

---

## 8. Continuous Integration (`.github/workflows/ci.yml`)

Every `push` and `pull_request` targeting `main` or `develop` triggers the CI workflow:

1. Check out repository and set up Node.js 20 with npm caching.
2. `npm ci` — install dependencies.
3. `npm run lint` — enforce strict ESLint/TypeScript rules.
4. `npm run prisma:generate` — generate the Prisma Client.
5. `npm run prisma:migrate:deploy` — apply migrations against an ephemeral PostgreSQL service container.
6. `npm run build` — verify compilation via Nest builder.
7. `npm run test` — execute unit tests.
8. `npm run test:e2e` — run full integration tests.

---

## 9. Continuous Deployment (`.github/workflows/cd.yml`)

A manual-only (`workflow_dispatch`) deployment pipeline for GitHub Actions. When ready to deploy to a live server, configure these secrets in GitHub Settings:

| Secret            | Description                             |
| ----------------- | --------------------------------------- |
| `SERVER_HOST`     | Target server IP or hostname            |
| `SERVER_USER`     | SSH username with Docker privileges     |
| `SSH_PRIVATE_KEY` | Private key for SSH authentication      |
| `DATABASE_URL`    | Production PostgreSQL connection string |
| `JWT_SECRET`      | Production JWT signing key              |
| `ADMIN_EMAIL`     | Admin email for initial seeding         |
| `ADMIN_PASSWORD`  | Admin password for initial seeding      |

---

## 10. Author & Attribution

**FrameFlow API** is designed and developed by **Ahmed Mohamed Abdelsalam**.

If you use, modify, or distribute this project or any part of its code, please maintain proper attribution by including a reference to the original author and a link back to this repository.

- **GitHub:** [@ahmedzzabdalla0](https://github.com/ahmedzzabdalla0)
- **LinkedIn:** [Ahmed Mohamed Abdelsalam](https://www.linkedin.com/in/ahmedabdelsalam0)
- **Portfolio:** [portfolio-ahmedabdelsalam.vercel.app](https://portfolio-ahmedabdelsalam.vercel.app)

---

## 11. License

This project is licensed under the [MIT License](./LICENSE).
