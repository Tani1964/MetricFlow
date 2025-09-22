import axios from "axios";
import { FetchResult } from "./types";

let failOnceTestFlag = true;

export const fetchActivity = (): Promise<FetchResult> => {
  try {
    if (failOnceTestFlag) {
      failOnceTestFlag = false;
      const error: any = new Error("Simulated transient API failure");
      error.transient = true;
      throw error;
    }
    return Promise.resolve({source:'simulated api', value: {name: 'Tani', timestamp: Date.now()}})
  } catch (error) {
    console.log("Error fetching data...");
    throw error; 
  }
};
