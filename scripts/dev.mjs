import net from "node:net";
import { spawn } from "node:child_process";

const HOST = "0.0.0.0";
const CANDIDATE_PORTS = [3003, 3004, 3010];

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, HOST);
  });
}

async function getAvailablePort() {
  for (const port of CANDIDATE_PORTS) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No free dev port found in ${CANDIDATE_PORTS.join(", ")}`);
}

const port = await getAvailablePort();

console.log(
  `[dev] Starting Next.js with webpack on http://localhost:${port}`
);

const command =
  process.platform === "win32"
    ? `npx.cmd next dev --webpack -p ${port} -H ${HOST}`
    : `npx next dev --webpack -p ${port} -H ${HOST}`;

const child = spawn(command, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
