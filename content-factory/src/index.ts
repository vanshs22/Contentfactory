import { startServer } from "./api/server.js";
import { logger } from "./utils/logger.js";
import { hasLLM } from "./services/llm.js";
import { hasBuffer } from "./services/buffer.js";

logger.info(
  {
    llm: hasLLM(),
    buffer: hasBuffer(),
  },
  "Starting AI Content & Digital Asset Factory"
);

startServer();
