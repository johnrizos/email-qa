import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

// packages/api/dist -> packages/web/dist, unless WEB_DIR says otherwise.
const webDir = process.env.WEB_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");

const app = await createApp({ webDir });
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);
console.log(`email-qa listening on http://localhost:${port}`);
