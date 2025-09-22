import { FetchResult } from "./types";

export const transformActivity = (input: FetchResult) => {
  try {
    const transformedValue = {
      ...input.value,
      transformedAt: Date.now(),
      transformedProp: "New (" + JSON.stringify(input.value) + ")",
    };

    return Promise.resolve({ ...input, value: transformedValue });
  } catch (error) {
    console.log("Error transforming data...");
    throw error;
  }
};
