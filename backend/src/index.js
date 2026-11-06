import fs from "fs";
import path from "path";
import { createApp } from "./app.js";
import { initializeDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap() {
  const uploadsRoot = path.resolve(process.cwd(), env.uploadsDir);
  fs.mkdirSync(uploadsRoot, { recursive: true });

  await initializeDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
