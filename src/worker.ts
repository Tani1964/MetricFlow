import { NativeConnection, Worker } from "@temporalio/worker";
import path from "path";
import { fetchActivity } from "./activities/fetchActivity";
import * as save from "./activities/saveActivity";
import * as transform from "./activities/transformActivity";

export const runWorker = async () => {
  try {
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || "temporal:7233",
    });
    
    const worker = await Worker.create({
      workflowsPath: path.join(__dirname, "workflows"),
      activities: {
        fetchActivity,
        transformActivity: transform.transformActivity,
        saveActivity: save.saveActivity,
      },
      taskQueue: "demo-task-queue",
      connection,
    });
    
    console.log("Worker started and listening on demo-task-queue");
    await worker.run();
  } catch (err) {
    console.error("Worker failed:", err);
    throw err; 
  }
};
