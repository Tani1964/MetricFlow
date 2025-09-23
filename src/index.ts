import express from "express";
import { register } from "./metrics";

const app = express();
const port = 3000;

async function main() {
  try {
    app.get("/", (req, res) => {
      res.json({
        message: "MetricFlow API is running",
        service: "server",
      });
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "metricflow-server",
        timestamp: new Date().toISOString(),
      });
    });

    app.get("/metrics", async (req, res) => {
      res.setHeader("Content-Type", register.contentType);
      res.end(await register.metrics());
    });

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

main();