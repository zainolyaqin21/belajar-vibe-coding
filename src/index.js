import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { testDbConnection } from "./db/index.js";
import { usersRoute, userRoute } from "./routes/users-route.js";
import { plantsRoute } from "./routes/plants-route.js";
import { plantLogsRoute, plantLogsCrudRoute } from "./routes/plant-logs-route.js";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .use(
    staticPlugin({
      assets: "public",
      prefix: "",
      alwaysStatic: false,
    })
  )
  .get("/", () => Bun.file("public/index.html"))
  .get("/index.html", () => Bun.file("public/index.html"))
  .get("/register.html", () => Bun.file("public/register.html"))
  .get("/dashboard.html", () => Bun.file("public/dashboard.html"))
  .get("/api/info", () => ({
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
  .use(userRoute)
  .use(plantsRoute)
  .use(plantLogsCrudRoute)
  .use(plantLogsRoute)
  .listen(port);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export default app;
