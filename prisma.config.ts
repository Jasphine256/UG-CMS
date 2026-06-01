import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

export default defineConfig({
  migrations: {
    seed: "bun ./prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
