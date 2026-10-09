import { expect, test } from "bun:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createAgentJobHandler } from "./agent-jobs.ts";

test("capabilities expose each Pi-only provider once", async () => {
  const handler = createAgentJobHandler({
    mode: "plan",
    getCwd: () => process.cwd(),
    getServerUrl: () => "http://127.0.0.1",
  });
  const server = createServer((req, res) => {
    void handler.handle(req, res, new URL(req.url!, "http://127.0.0.1")).catch((error) => {
      res.writeHead(500);
      res.end(String(error));
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/agents/capabilities`);
    expect(response.status).toBe(200);
    const capabilities = await response.json();
    expect(capabilities.providers.map((provider: { id: string }) => provider.id).sort()).toEqual(["guide", "pi", "tour"]);
    expect(capabilities.available).toBe(false);
    const removed = await fetch(`${base}/api/agents/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "claude", command: ["claude"] }),
    });
    expect(removed.status).toBe(400);
    expect((await removed.json()).error).toBe("Unknown or unavailable provider: claude");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
