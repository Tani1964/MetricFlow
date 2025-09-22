import { FetchResult, SaveActivity } from "./types";

const store = new Map<string, any>();

export const saveActivity = (input: FetchResult) => {
  try {
    const key = `item:${Date.now()}`;
    store.set(key, input.value);
    localStorage.setItem("storeDB", JSON.stringify(Object.fromEntries(store)));
  } catch (error) {
    console.log("Error saving data...");
    throw error;
  }
};
