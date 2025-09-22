import { NativeConnection, Worker } from "@temporalio/worker";

import path from "path";
import * as activities from "./activities/fetchActivity";
import * as save from "./activities/saveActivity";
import * as transform from "./activities/transformActivity";

export const runWorker = async () => {
  try {
    const connection = await NativeConnection.connect();
    const worker = await Worker.create({
      workflowsPath: path.join(__dirname, "workflows"),
      activities: {
        fetchActivity: async () => {
          try {
            return await (
              await import("./activities/fetchActivity")
            ).fetchActivity();
          } catch (error) {
            throw error;
          }
        },
        transformActivity: transform.transformActivity,
        saveActivity: save.saveActivity,
      },

      taskQueue: "demo-task-queue",
    });
    await worker.run();
  } catch (error) {}
};
