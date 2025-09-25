import { NativeConnection, Worker } from "@temporalio/worker";
import express from "express";
import path from "path";
import client from "prom-client";

import * as fetch from "./activities/fetchActivity";
import * as save from "./activities/saveActivity";
import * as transform from "./activities/transformActivity";

import {
  activeWorkflows,
  activityDuration,
  activityExecutions,
  activityRetries,
  apiCallsTotal,
  dataProcessedRecords,
  dataStorageOperations,
  workflowDuration,
  workflowExecutions,
  workflowRetries,
} from "./metrics";

// Health check state
let isWorkerReady = false;
let isWorkerHealthy = false;
let worker: Worker | null = null;

// 🔹 Start Prometheus metrics server for this worker
async function startMetricsServer() {
  const app = express();
  const port = parseInt(process.env.METRICS_PORT || '9464');

  // collect default Node.js process metrics (CPU, memory, event loop, etc.)
  client.collectDefaultMetrics({ register: client.register });

  // Health check endpoint for Kubernetes
  app.get("/health", (_req, res) => {
    if (isWorkerHealthy && isWorkerReady) {
      res.status(200).json({
        status: "healthy",
        worker: "running",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: "unhealthy",
        worker: isWorkerReady ? "starting" : "not ready",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Readiness check endpoint
  app.get("/ready", (_req, res) => {
    if (isWorkerReady) {
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint
  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Start server and return promise
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        console.log(`Worker metrics and health checks exposed at http://0.0.0.0:${port}`);
        resolve();
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      isWorkerHealthy = false;
      server.close(() => {
        if (worker) {
          worker.shutdown();
        }
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      isWorkerHealthy = false;
      server.close(() => {
        if (worker) {
          worker.shutdown();
        }
        process.exit(0);
      });
    });
  });
}

export const runWorker = async () => {
  try {
    // Temporal connection
    const temporalAddress = process.env.TEMPORAL_ADDRESS || "temporal:7233";
    console.log(`Connecting to Temporal at: ${temporalAddress}`);

    const connection = await NativeConnection.connect({ address: temporalAddress });
    console.log("Connected to Temporal server successfully");

    // Instrumented activities
    const instrumentedFetch = async () => {
      const start = Date.now();
      try {
        activityExecutions.inc({ activity_name: "fetchActivity", status: "started" });

        const result = await fetch.fetchActivity();

        activityExecutions.inc({ activity_name: "fetchActivity", status: "succeeded" });
        activityDuration.observe({ activity_name: "fetchActivity" }, (Date.now() - start) / 1000);
        apiCallsTotal.inc({ endpoint: "external_api", status: "success" });

        return result;
      } catch (error) {
        activityExecutions.inc({ activity_name: "fetchActivity", status: "failed" });
        activityRetries.inc({ activity_name: "fetchActivity" });
        apiCallsTotal.inc({ endpoint: "external_api", status: "failed" });
        throw error;
      }
    };

    const instrumentedTransform = async (input: any) => {
      const start = Date.now();
      try {
        activityExecutions.inc({ activity_name: "transformActivity", status: "started" });

        const result = await transform.transformActivity(input);

        activityExecutions.inc({ activity_name: "transformActivity", status: "succeeded" });
        activityDuration.observe({ activity_name: "transformActivity" }, (Date.now() - start) / 1000);

        return result;
      } catch (error) {
        activityExecutions.inc({ activity_name: "transformActivity", status: "failed" });
        activityRetries.inc({ activity_name: "transformActivity" });
        throw error;
      }
    };

    const instrumentedSave = async (data: any) => {
      const start = Date.now();
      try {
        activityExecutions.inc({ activity_name: "saveActivity", status: "started" });

        const result = await save.saveActivity(data);

        activityExecutions.inc({ activity_name: "saveActivity", status: "succeeded" });
        activityDuration.observe({ activity_name: "saveActivity" }, (Date.now() - start) / 1000);

        dataStorageOperations.inc({ operation: "insert", status: "success" });
        dataProcessedRecords.inc({ source: "fetchTransformSaveWorkflow", status: "processed" });

        return result;
      } catch (error) {
        activityExecutions.inc({ activity_name: "saveActivity", status: "failed" });
        activityRetries.inc({ activity_name: "saveActivity" });
        dataStorageOperations.inc({ operation: "insert", status: "failed" });
        throw error;
      }
    };

    // Worker setup
    worker = await Worker.create({
      connection,
      workflowsPath: path.join(__dirname, "workflows"),
      activities: {
        fetchActivity: instrumentedFetch,
        transformActivity: instrumentedTransform,
        saveActivity: instrumentedSave,
      },
      taskQueue: "demo-task-queue",
    });

    console.log("Temporal worker created successfully");
    
    // Mark as ready
    isWorkerReady = true;
    isWorkerHealthy = true;

    console.log("Temporal worker is starting...");

    // Workflow metrics when worker starts
    workflowExecutions.inc({ workflow_type: "fetchTransformSaveWorkflow", status: "started" });
    activeWorkflows.inc({ workflow_type: "fetchTransformSaveWorkflow" });

    const startWorkflowTime = Date.now();

    // This will run indefinitely
    await worker.run();

    // Worker completed (should rarely happen)
    workflowExecutions.inc({ workflow_type: "fetchTransformSaveWorkflow", status: "completed" });
    workflowDuration.observe({ workflow_type: "fetchTransformSaveWorkflow" }, (Date.now() - startWorkflowTime) / 1000);
    activeWorkflows.dec({ workflow_type: "fetchTransformSaveWorkflow" });
  } catch (error) {
    isWorkerHealthy = false;
    workflowExecutions.inc({ workflow_type: "fetchTransformSaveWorkflow", status: "failed" });
    workflowRetries.inc({ workflow_type: "fetchTransformSaveWorkflow", retry_reason: "worker_crash" });
    console.error("Worker error:", error);
    throw error;
  }
};

async function main() {
  try {
    // Start metrics server first (non-blocking)
    await startMetricsServer();
    
    // Start worker (this will block indefinitely)
    await runWorker();
  } catch (error) {
    console.error("Failed to start worker:", error);
    isWorkerHealthy = false;
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}