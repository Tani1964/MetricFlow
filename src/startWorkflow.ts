import { Client, Connection } from "@temporalio/client";

async function run() {
  let connection: Connection | undefined;
  
  try {
    connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    });

    console.log("Connected to Temporal server");

    const client = new Client({ connection });

    console.log("Starting workflow...");
    const handle = await client.workflow.start("fetchTransformSaveWorkflow", {
      taskQueue: "demo-task-queue",
      workflowId: "workflow-" + Date.now(),
    });

    console.log(`Started workflow ${handle.workflowId}`);
    console.log("Waiting for workflow to complete...");

    // Wait for the workflow to complete and get the result
    const result = await handle.result();
    console.log("Workflow completed successfully!");
    console.log("Result:", result);

  } catch (error) {
    console.error("Workflow error:", error);
    
    // If it's a workflow failure, you can get more details
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }
    
    process.exit(1);
  } finally {
    // Always close the connection in the finally block
    if (connection) {
      await connection.close();
      console.log("Connection closed");
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

run().catch((error) => {
  console.error("Failed to run client:", error);
  process.exit(1);
});