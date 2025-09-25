import express from "express";
// import { client } from "./metrics";
import client from "prom-client";

const app = express();
const port = 3000;
app.use(express.json());

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

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
      res.setHeader("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    });

    // Sharded Data Service
    app.post("/store", async (req, res) => {
      try {
        console.log(req.body);
        const { userId, data } = req.body;
        if (!userId || !data) {
          return res
            .status(400)
            .json({ error: "Missing userId or data in request body" });
        }

        // Simulate sharding logic
        const shardId = userId % 4; // Example: 4 shards
        console.log(`Storing data for user ${userId} in shard ${shardId}`);

        // Add this response
        res.status(200).json({
          message: "Data stored successfully",
          shardId: shardId,
        });
      } catch (error) {
        console.error("Error in /store endpoint:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
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
