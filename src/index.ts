import { Client, Connection } from "@temporalio/client";
import express from "express";
import { runWorker } from "./worker";

const app = express();
const port = 3000;

let temporalAvailable = false;

async function main() {
  try {
    if (process.env.DISABLE_WORKER !== "true") {
      runWorker()
        .then(() => {
          temporalAvailable = true;
          console.log("Worker started successfully");
        })
        .catch(err => {
          console.error("Worker error (continuing without Temporal):", err);
          temporalAvailable = false;
        });
    } else {
      console.log("Worker disabled via DISABLE_WORKER environment variable");
    }

    app.get("/", (req, res) => {
      res.json({ 
        message: "MetricFlow API is running",
        temporalAvailable: temporalAvailable
      });
    });

    app.get("/health", (req, res) => {
      res.json({ 
        status: "healthy", 
        service: "metricflow",
        temporalWorker: temporalAvailable ? "connected" : "disconnected"
      });
    });

    app.post("/start-workflow", async (req, res) => {
      if (!temporalAvailable) {
        return res.status(503).json({ 
          error: "Temporal service not available. Worker is not connected." 
        });
      }

      try {
        const connection = await Connection.connect({
          address: process.env.TEMPORAL_ADDRESS || "temporal:7233",
        });
        const client = new Client({ connection });
        const handle = await client.workflow.start("fetchTransformSaveWorkflow", {
          taskQueue: "demo-task-queue",
          workflowId: "workflow-" + Date.now(),
        });
        console.log(`Started workflow ${handle.workflowId}`);
        await connection.close();
        res.json({ message: "Workflow started", workflowId: handle.workflowId });
      } catch (error) {
        console.error("Failed to start workflow:", error);
        res.status(500).json({ error: "Failed to start workflow" });
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
