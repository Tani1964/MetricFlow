import express from "express";
import client from "prom-client";
import {
  dataProcessedRecords,
  dataStorageOperations,
  shardDistribution,
  shardRequestCount,
} from "./metrics";

const app = express();
const port = 3000;
app.use(express.json());

// Default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

async function main() {
  try {
    // Health + Info
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

    // Prometheus scrape endpoint
    app.get("/metrics", async (req, res) => {
      res.setHeader("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    });

    // Sharded Data Service
    app.post("/store", async (req, res) => {
      try {
        const { userId, data } = req.body;
        if (!userId || !data) {
          return res
            .status(400)
            .json({ error: "Missing userId or data in request body" });
        }

        // Example sharding: 4 shards
        const shardId = userId % 4;
        console.log(`Storing data for user ${userId} in shard ${shardId}`);

        // 🔹 Update metrics
        shardRequestCount.inc({ shard_id: String(shardId), status: "success" });
        shardDistribution.set({ shard_id: String(shardId) }, userId); // simplistic example

        dataStorageOperations.inc({ operation: "insert", status: "success" });
        dataProcessedRecords.inc({ source: "store-api", status: "processed" });

        res.status(200).json({
          message: "Data stored successfully",
          shardId: shardId,
        });
      } catch (error) {
        console.error("Error in /store endpoint:", error);

        // 🔹 Error metrics
        shardRequestCount.inc({ shard_id: "unknown", status: "failed" });
        dataStorageOperations.inc({ operation: "insert", status: "failed" });

        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Start server
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

main();
