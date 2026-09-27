import { createApp } from "./app.js";

const app = await createApp({ webDir: process.env.WEB_DIR });
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);
console.log(`email-qa API listening on http://localhost:${port}/api`);
