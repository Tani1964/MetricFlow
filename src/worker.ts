import { NativeConnection, Worker } from "@temporalio/worker";
import path from "path";
import * as activities from "./activities/fetchActivity";
import * as save from "./activities/saveActivity";
import * as transform from "./activities/transformActivity";
import { activeWorkflows, workflowExecutions, workflowRetries } from "./metrics";

export const runWorker = async () => {
  try {
    // Use temporal:7233 when running in Docker, localhost:7233 when running locally
    // const temporalAddress = process.env.TEMPORAL_ADDRESS || "temporal:7233";
    const temporalAddress = "localhost:7233";
    console.log(`Connecting to Temporal at: ${temporalAddress}`);
    
    const connection = await NativeConnection.connect({
      address: temporalAddress,
    });
    
    const worker = await Worker.create({
      connection,
      workflowsPath: path.join(__dirname, "workflows"),
      activities: {
        fetchActivity: async () => {
          try {
            return await (
              await import("./activities/fetchActivity")
            ).fetchActivity();
          } catch (error) {
            workflowRetries.inc({ 
              workflow_type: 'fetchTransformSaveWorkflow', 
              retry_reason: 'activity_failed' 
            });
            throw error;
          }
        },
        transformActivity: transform.transformActivity,
        saveActivity: save.saveActivity,
      },
      taskQueue: "demo-task-queue",
    });

    console.log("Temporal worker is starting...");
    console.log("Worker connected successfully to Temporal server");
    
    activeWorkflows.inc({ workflow_type: 'fetchTransformSaveWorkflow' });
    await worker.run();
  } catch (error) {
    workflowExecutions.inc({ 
      workflow_type: 'fetchTransformSaveWorkflow', 
      status: 'failed' 
    });
    console.error("Worker error:", error);
    throw error;
  }
};

async function main() {
  try {
    await runWorker();
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}