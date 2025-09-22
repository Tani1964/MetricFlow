import {
    proxyActivities,
} from "@temporalio/workflow";
import type * as activities from "../activities/types";

export interface ActivityInterface {
  fetchActivity: () => Promise<activities.FetchResult>;
  transformActivity: (
    input: activities.FetchResult
  ) => Promise<activities.FetchResult>;
  saveActivity: (input: activities.FetchResult) => Promise<void>;
}

const { fetchActivity, transformActivity, saveActivity } =
  proxyActivities<ActivityInterface>({
    startToCloseTimeout: "1 minute",
    retry: {
      maximumAttempts: 3,
      initialInterval: "2s",
      backoffCoefficient: 2,
      maximumInterval: "30s",
    },
  });

export const fetchTransformSaveWorkflow = async () => {
  const data = await fetchActivity();
  const transformedData = await transformActivity(data);
  await saveActivity(transformedData);
  return "done";
};
