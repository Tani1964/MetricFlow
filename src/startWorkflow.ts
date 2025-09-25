import { Client, Connection } from "@temporalio/client";
import express from "express";
import clientMetrics from "prom-client"; // Prometheus metrics for client

async function run() {
  let connection: Connection | undefined;

  // Prometheus registry
  const register = new clientMetrics.Registry();
  clientMetrics.collectDefaultMetrics({ register });

  const workflowStarted = new clientMetrics.Counter({
    name: "temporal_client_workflows_started_total",
    help: "Number of workflows started by this client",
  });
  const workflowSucceeded = new clientMetrics.Counter({
    name: "temporal_client_workflows_succeeded_total",
    help: "Number of workflows that completed successfully",
  });
  const workflowFailed = new clientMetrics.Counter({
    name: "temporal_client_workflows_failed_total",
    help: "Number of workflows that failed",
  });

  // Start a small Express server to expose metrics
  const app = express();
  const metricsPort = 3001; // unique port for client
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  app.listen(metricsPort, () => {
    console.log(`Client metrics server running on http://localhost:${metricsPort}/metrics`);
  });

  try {
    connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    });

    console.log("Connected to Temporal server");

    const client = new Client({ connection });

    console.log("Starting workflow...");
    workflowStarted.inc();

    const handle = await client.workflow.start("fetchTransformSaveWorkflow", {
      taskQueue: "demo-task-queue",
      workflowId: "workflow-" + Date.now(),
    });

    console.log(`Started workflow ${handle.workflowId}`);
    console.log("Waiting for workflow to complete...");

    const result = await handle.result();
    workflowSucceeded.inc();

    console.log("Workflow completed successfully!");
    console.log("Result:", result);

  } catch (error) {
    console.error("Workflow error:", error);

    workflowFailed.inc();

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }

    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.close();
      console.log("Connection closed");
    }
  }
}

// Graceful shutdown
function setupSignalHandlers() {
  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      process.exit(0);
    });
  });
}

setupSignalHandlers();

run().catch((error) => {
  console.error("Failed to run client:", error);
  process.exit(1);
});
