// Prisma ORM v7 split the connection URL out of schema.prisma's
// datasource block and into this file (schema.prisma just declares
// `provider` now - see prisma/schema.prisma's header comment). This
// project doesn't use Prisma Migrate (server/migrations/*.sql + 
// scripts/migrate.js is the real migration system - see the README),
// so this config exists purely so `npx prisma db pull`/`generate` can
// find the live database to introspect against.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
