
import { Client, Connection } from "@temporalio/client";

async function run() {
  try {
    // Use NativeConnection like your worker
    const connection = await Connection.connect();
    
    const client = new Client({ connection });
    
    const handle = await client.workflow.start("fetchTransformSaveWorkflow", {
      taskQueue: "demo-task-queue",
      workflowId: "workflow-" + Date.now(),
    });
    
    console.log(`Started workflow ${handle.workflowId}`);
    
    // Don't forget to close the connection
    await connection.close();
  } catch (error) {
    console.error("Connection failed:", error);
    throw error;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});