import { defineConfig } from "@trigger.dev/sdk";
import { aptGet, syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_oeniovgjdjmalhpsigaa",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
  build: {
    // FFmpeg via apt (시스템 패키지) - johnvansickle static build의 TLS 버그 회피
    extensions: [
      aptGet({ packages: ["ffmpeg"] }),
      // Sync environment variables to Trigger.dev
      syncEnvVars(async (ctx) => {
        // Required environment variables for video analysis
        return [
          // Supabase
          {
            name: "NEXT_PUBLIC_SUPABASE_URL",
            value: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          },
          {
            name: "SUPABASE_SERVICE_ROLE_KEY",
            value: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          },
          // GCS / Vertex AI
          {
            name: "GCS_PROJECT_ID",
            value: process.env.GCS_PROJECT_ID || "",
          },
          {
            name: "GCS_BUCKET_NAME",
            value: process.env.GCS_BUCKET_NAME || "",
          },
          {
            name: "VERTEX_AI_LOCATION",
            value: process.env.VERTEX_AI_LOCATION || "asia-northeast3",
          },
          {
            name: "GCS_CLIENT_EMAIL",
            value: process.env.GCS_CLIENT_EMAIL || "",
          },
          {
            name: "GCS_PRIVATE_KEY",
            value: process.env.GCS_PRIVATE_KEY || "",
          },
          // Legacy (YouTube download - deprecated)
          {
            name: "GOOGLE_API_KEY",
            value: process.env.GOOGLE_API_KEY || "",
          },
          {
            name: "YTDL_COOKIE",
            value: process.env.YTDL_COOKIE || "",
          },
          {
            name: "YTDL_USER_AGENT",
            value: process.env.YTDL_USER_AGENT || "",
          },
          {
            name: "YTDL_ACCEPT_LANGUAGE",
            value: process.env.YTDL_ACCEPT_LANGUAGE || "",
          },
        ];
      }),
    ],
  },
});
