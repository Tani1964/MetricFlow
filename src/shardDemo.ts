import axios, { AxiosError } from "axios";

interface StoreRequest {
  userId: number;
  data: Record<string, unknown>;
}

interface StoreResponse {
  error?: string;
  message?: string;
}

async function demoClient(): Promise<void> {
  try {
   const payload: StoreRequest = {
  userId: Math.floor(Math.random() * 1000) + 1,
  data: { 
    name: "Alice", 
    score: Math.floor(Math.random() * 100) + 1 
  },
};

    console.log("Sending data to server:", payload);
    console.log(`POST ${process.env.SERVER_HOST }`);

    const response = await axios.post<StoreResponse>(
    `http://${process.env.SERVER_HOST ?? "localhost"}:3000/store`,
      payload
    );

    console.log("Server response:", response.data);
  } catch (err) {
    const error = err as AxiosError<StoreResponse>;

    if (error.response) {
      console.error("Error response:", error.response.data);
    } else {
      console.error("Request failed:", error.message);
    }
  }
}

demoClient();
