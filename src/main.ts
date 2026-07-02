import "dotenv/config";
import { createUplbToolsRuntime } from "./runtime.js";

const runtime = createUplbToolsRuntime();

runtime.start().catch((err) => {
  console.error(err);
  process.exit(1);
});
