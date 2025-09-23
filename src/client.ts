import { Client, Connection } from "@temporalio/client";
import express from "express";

// Import metrics with error handling
interface MetricCounter {
  inc: (labels?: Record<string, string>) => void;
  dec: (labels?: Record<string, string>) => void;
}

interface MetricHistogram {
  observe: (labels?: Record<string, string>, value?: number) => void;
}

let workflowExecutions: MetricCounter, workflowDuration: MetricHistogram, activeWorkflows: MetricCounter;
try {
  const metrics = require("./metrics");
  workflowExecutions = metrics.workflowExecutions;
  workflowDuration = metrics.workflowDuration;
  activeWorkflows = metrics.activeWorkflows;
  console.log("Metrics imported successfully");
} catch (error) {
  console.error("Failed to import metrics:", error);
  // Create dummy metrics to prevent crashes
  workflowExecutions = { inc: () => {}, dec: () => {} };
  workflowDuration = { observe: () => {} };
  activeWorkflows = { inc: () => {}, dec: () => {} };
}

const app = express();
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const port = process.env.CLIENT_PORT || 3002;

let temporalAvailable = false;

async function testTemporalConnection(): Promise<boolean> {
  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    });
    await connection.close();
    return true;
  } catch (error) {
    console.error("Temporal connection test failed:", error);
    return false;
  }
}

async function startWorkflow() {
  console.log("Starting workflow function called");
  
  if (!temporalAvailable) {
    console.log("Temporal not available, throwing error");
    throw new Error("Temporal service not available");
  }

  let connection;
  try {
    console.log("Connecting to Temporal...");
    const startTime = Date.now();
    
    connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
    });
    console.log("Connected to Temporal successfully");
    
    const client = new Client({ connection });
    console.log("Client created successfully");

    console.log("Incrementing workflow metrics...");
    workflowExecutions.inc({ 
      workflow_type: 'fetchTransformSaveWorkflow', 
      status: 'started' 
    });
    activeWorkflows.inc({ workflow_type: 'fetchTransformSaveWorkflow' });

    console.log("Starting workflow execution...");
    const handle = await client.workflow.start(
      "fetchTransformSaveWorkflow",
      {
        taskQueue: "demo-task-queue",
        workflowId: "workflow-" + Date.now(),
      }
    );

    console.log(`Workflow started successfully: ${handle.workflowId}`);
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Workflow start took ${duration} seconds`);
    
    workflowDuration.observe({ workflow_type: 'fetchTransformSaveWorkflow' }, duration);
    workflowExecutions.inc({ 
      workflow_type: 'fetchTransformSaveWorkflow', 
      status: 'succeeded' 
    });

    return handle.workflowId;
    
  } catch (error) {
    console.error("Error in startWorkflow:", error);
    console.error("Error stack:", error);
    
    // Make sure we clean up metrics on error
    try {
      activeWorkflows.dec({ workflow_type: 'fetchTransformSaveWorkflow' });
    } catch (metricsError) {
      console.error("Error updating metrics:", metricsError);
    }
    
    throw error;
  } finally {
    if (connection) {
      try {
        console.log("Closing Temporal connection...");
        await connection.close();
        console.log("Connection closed successfully");
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
}

async function main() {
  try {
    // Test Temporal connection on startup
    temporalAvailable = await testTemporalConnection();
    console.log(`Temporal connection: ${temporalAvailable ? "available" : "unavailable"}`);

    app.get("/", (req, res) => {
      res.json({
        message: "MetricFlow Client is running",
        temporalAvailable: temporalAvailable,
      });
    });

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "metricflow-client",
        temporalWorker: temporalAvailable ? "connected" : "disconnected",
      });
    });

    app.get("/start-workflow", async (req, res) => {
      try {
        const workflowId = await startWorkflow();
        res.json({
          message: "Workflow started",
          workflowId: workflowId,
        });
      } catch (error) {
        workflowExecutions.inc({ 
          workflow_type: 'fetchTransformSaveWorkflow', 
          status: 'failed' 
        });
        activeWorkflows.dec({ workflow_type: 'fetchTransformSaveWorkflow' });
        console.error("Failed to start workflow:", error);
        
        if (error instanceof Error && error.message.includes("not available")) {
          res.status(503).json({
            error: "Temporal service not available. Worker may not be connected.",
          });
        } else {
          res.status(500).json({ error: "Failed to start workflow" });
        }
      }
    });

    app.get("/test-connection", async (req, res) => {
      temporalAvailable = await testTemporalConnection();
      res.json({
        temporalAvailable: temporalAvailable,
        timestamp: new Date().toISOString(),
      });
    });

    app.listen(port, () => {
      console.log(`Client server running on all interfaces at port ${port}`);
      console.log(`Try these URLs:`);
      console.log(`  - http://localhost:${port}/health`);
      console.log(`  - http://127.0.0.1:${port}/health`);
      console.log(`  - http://0.0.0.0:${port}/health`);
    });
  } catch (error) {
    console.error("Client failed to start:", error);
    process.exit(1);
  }
}

main();