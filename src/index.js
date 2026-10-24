import { Elysia } from "elysia";
import { testDbConnection } from "./db/index.js";
import { usersRoute } from "./routes/users-route.js";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    message: "Belajar Vibe Coding API is running!",
    timestamp: new Date().toISOString(),
  }))
  .get("/health", async () => {
    const dbStatus = await testDbConnection();
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  })
  .use(usersRoute)
  .listen(port);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export default app;
