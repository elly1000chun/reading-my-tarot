import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT || 54173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  reporter: [
    ["list"],
    ["html", { open: "never" }]
  ],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry"
  },
  webServer: {
    command: `npx http-server . -p ${port} -c-1`,
    url: baseURL,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] }
    }
  ]
});
