import express, { Request, Response } from "express";
import { runWorker } from "./worker";

const app = express();
const port = 3000;

const run = async () => {
  try {
    runWorker();

    app.get("/", (req: Request, res: Response) => {
      res.send("MetricFlow API is running");
    });
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();