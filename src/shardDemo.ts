import axios, { AxiosError } from "axios";

interface StoreRequest {
  userId: number;
  data: Record<string, unknown>;
}

interface StoreResponse {
  error?: string;
  message?: string;
  shardId?: number;
}

async function demoClient(): Promise<void> {
  const payload: StoreRequest = {
    userId: Math.floor(Math.random() * 1000) + 1,
    data: { 
      name: "Alice", 
      score: Math.floor(Math.random() * 100) + 1 
    },
  };

  const serverHost = process.env.SERVER_HOST ?? "localhost";
  const url = `http://${serverHost}/store`;

  try {
    console.log("Sending data to server:", payload);
    console.log(`POST ${url}`);

    const response = await axios.post<StoreResponse>(url, payload, {
      timeout: 3000, // avoid hanging forever
    });

    console.log("✅ Server response:", response.data);
  } catch (err) {
    const error = err as AxiosError<StoreResponse>;

    if (error.response) {
      console.error("Error response:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("No response from server (timeout or network issue).");
    } else {
      console.error("Request failed:", error.message);
    }
  }
}

// Run once if executed directly
if (require.main === module) {
  demoClient();
}

export default demoClient;
