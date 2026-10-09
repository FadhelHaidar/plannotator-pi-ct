import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("Pi AI runtime", () => {
	test("registers only the Pi SDK provider", async () => {
		if (process.platform === "win32") return;

		const dir = mkdtempSync(join(tmpdir(), "plannotator-pi-runtime-"));
		tempDirs.push(dir);
		const pi = join(dir, "pi");
		writeFileSync(pi, `#!${process.execPath}\nconsole.log('{}');\n`);
		chmodSync(pi, 0o755);

		const runner = join(dir, "runner.ts");
		const runtimeUrl = pathToFileURL(join(import.meta.dir, "ai-runtime.ts")).href;
		writeFileSync(runner, `
			import { createPiAIRuntime } from ${JSON.stringify(runtimeUrl)};
			const runtime = await createPiAIRuntime({ cwd: ${JSON.stringify(dir)} });
			if (!runtime) throw new Error("Pi AI runtime unavailable");
			const response = await runtime.endpoints["/api/ai/capabilities"](
				new Request("http://localhost/api/ai/capabilities"),
			);
			const data = await response.json();
			console.log(JSON.stringify(data.providers.map((provider) => provider.id)));
			runtime.dispose();
		`);

		const proc = Bun.spawn([process.execPath, runner], {
			cwd: join(import.meta.dir, ".."),
			env: { ...process.env, PATH: `${dir}:/usr/bin:/bin` },
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		expect(exitCode, stderr).toBe(0);
		expect(JSON.parse(stdout.trim())).toEqual(["pi-sdk"]);
	}, 15_000);
});
