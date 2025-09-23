import { FetchResult } from "./types";

export const transformActivity = (input: FetchResult) => {
  try {
    const transformedValue = {
      ...input.value.name && { name: "Temi", ...input.value },
      transformedAt: Date.now(),
      transformedProp: "New (" + JSON.stringify(input.value) + ")",
    };
     setTimeout(() => {
      console.log("Simulating async transform operation...");
    }, 4000);

    return Promise.resolve({ ...input, value: {transformedValue} });
  } catch (error) {
    console.log("Error transforming data...");
    throw error;
  }
};
