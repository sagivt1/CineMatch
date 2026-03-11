import { app } from './app';
import { env } from './config/env';
import { ensureAvatarBucketExists } from './services/S3Service';

async function startServer() {
  await ensureAvatarBucketExists();

  app.listen(env.PORT, () => {
    console.log(`Gateway running on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start gateway:", error);
  process.exit(1);
});
