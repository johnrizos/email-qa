import "reflect-metadata";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";

export interface AppOptions {
  /** Built web UI to serve next to the API (single container in production). */
  webDir?: string;
  logger?: false;
}

export async function createApp(options: AppOptions = {}) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: options.logger,
  });

  // Templates near Gmail's 102 KB clipping limit are the interesting ones,
  // so the default 100 KB JSON limit is too small.
  app.useBodyParser("json", { limit: "1.5mb" });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const webDir = options.webDir && resolve(options.webDir);
  if (webDir && existsSync(join(webDir, "index.html"))) {
    app.useStaticAssets(webDir);
    // Anything that isn't an API call or a static file gets the SPA shell.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next();
      res.sendFile(join(webDir, "index.html"));
    });
  }

  return app;
}
