-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "rel_path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_seconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#e44',
    "position" INTEGER,
    "is_reserved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_categories" (
    "video_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "video_categories_pkey" PRIMARY KEY ("video_id","category_id")
);

-- CreateTable
CREATE TABLE "thumb_seeks" (
    "id" SERIAL NOT NULL,
    "video_id" INTEGER NOT NULL,
    "seek_time" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thumb_seeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_settings" (
    "id" SERIAL NOT NULL,
    "default_pure_only" BOOLEAN NOT NULL DEFAULT false,
    "default_intersection_only" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_settings_included_categories" (
    "settings_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "player_settings_included_categories_pkey" PRIMARY KEY ("settings_id","category_id")
);

-- CreateTable
CREATE TABLE "player_settings_excluded_categories" (
    "settings_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "player_settings_excluded_categories_pkey" PRIMARY KEY ("settings_id","category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "videos_rel_path_key" ON "videos"("rel_path");

-- CreateIndex
CREATE INDEX "videos_title_idx" ON "videos"("title");

-- CreateIndex
CREATE INDEX "videos_added_at_idx" ON "videos"("added_at");

-- CreateIndex
CREATE INDEX "videos_rating_idx" ON "videos"("rating");

-- CreateIndex
CREATE INDEX "videos_duration_seconds_idx" ON "videos"("duration_seconds");

-- CreateIndex
CREATE INDEX "videos_size_bytes_idx" ON "videos"("size_bytes");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_position_idx" ON "categories"("position");

-- CreateIndex
CREATE INDEX "video_categories_category_id_idx" ON "video_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "thumb_seeks_video_id_key" ON "thumb_seeks"("video_id");

-- AddForeignKey
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thumb_seeks" ADD CONSTRAINT "thumb_seeks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_settings_included_categories" ADD CONSTRAINT "player_settings_included_categories_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "player_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_settings_included_categories" ADD CONSTRAINT "player_settings_included_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_settings_excluded_categories" ADD CONSTRAINT "player_settings_excluded_categories_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "player_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_settings_excluded_categories" ADD CONSTRAINT "player_settings_excluded_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
