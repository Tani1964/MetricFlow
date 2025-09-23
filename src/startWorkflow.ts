import { Client, Connection } from "@temporalio/client";

async function run() {
  try {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    });

    const client = new Client({ connection });

    const handle = await client.workflow.start("fetchTransformSaveWorkflow", {
      taskQueue: "demo-task-queue",
      workflowId: "workflow-" + Date.now(),
    });

    console.log(`Started workflow ${handle.workflowId}`);

    await connection.close();
  } catch (error) {
    console.error(" Connection failed:", error);
    process.exit(1);
  }
}

run();
