ALTER TABLE "users"
ADD COLUMN "avatarUpdatedAt" TIMESTAMP;

UPDATE "users"
SET "avatarUrl" = REGEXP_REPLACE("avatarUrl", '^https?://[^/]+/cinematch-avatars/', '')
WHERE "avatarUrl" LIKE 'http%/cinematch-avatars/%';

UPDATE "users"
SET "avatarUpdatedAt" = NOW()
WHERE "avatarUrl" IS NOT NULL
  AND "avatarUpdatedAt" IS NULL;
