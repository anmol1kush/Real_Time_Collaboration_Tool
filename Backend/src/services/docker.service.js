import Docker from "dockerode";
import http from "http";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
import { prisma } from "../utils/prisma.js";

const execPromise = util.promisify(exec);
const docker = new Docker(); // Windows docker pipe

// In-memory map: projectId → assigned host port
// In production, persist this in Redis so it survives restarts
export const codespacePorts = new Map();

/**
 * Starts a VS Code server (code-server) container for a project.
 * Handles three cases:
 *   1. Already tracked in memory → return cached port
 *   2. Container does not exist → create + start fresh
 *   3. Container exists but stopped (409 conflict) → start it and re-populate port map
 */
export async function startCodespace(projectId) {
    // 1. Already running and tracked
    if (codespacePorts.has(projectId)) {
        return { port: codespacePorts.get(projectId) };
    }

    try {
        // Fetch project to check if a GitHub repo is linked
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { githubRepo: true }
        });

        // Ensure workspace directory exists
        const workspaceDir = `${process.cwd()}/workspace/${projectId}`;
        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
        }

        // If directory is empty and we have a githubRepo, clone it
        if (project?.githubRepo) {
            const files = fs.readdirSync(workspaceDir);
            if (files.length === 0) {
                console.log(`Cloning repository ${project.githubRepo} into ${workspaceDir}...`);
                try {
                    await execPromise(`git clone ${project.githubRepo} .`, { cwd: workspaceDir });
                    console.log(`Successfully cloned ${project.githubRepo}`);
                } catch (cloneErr) {
                    console.error("Failed to clone repository:", cloneErr);
                    // Continue even if clone fails, they'll get an empty space
                }
            }
        }

        // 2. Create fresh container
        const container = await docker.createContainer({
            Image: "codercom/code-server:latest",
            name: `codespace_${projectId}`,
            HostConfig: {
                PortBindings: {
                    "8080/tcp": [{ HostIp: "127.0.0.1", HostPort: "0" }]
                },
                Binds: [
                    `${process.cwd()}/workspace/${projectId}:/home/coder/workspace`
                ]
            },
            Env: [
                "PASSWORD=rtct_workspace",
                "DISABLE_TELEMETRY=true",
                `VSCODE_PROXY_URI=http://localhost:3000/codespace/${projectId}/{{port}}`
            ],
            // We tell code-server to open a specific directory instead of trying to 
            // restore a broken previous session which causes ENOPRO errors.
            // --base-path is REQUIRED for the UI to function correctly behind our proxy.
          Cmd: [
            "--auth", "none",
            "--bind-addr", "0.0.0.0:8080",
            "/home/coder/workspace"
          ]
        });

        await container.start();
        return await _inspectAndTrack(container, projectId);

    } catch (error) {
        if (error.statusCode === 409) {
            // 3. Container already exists — start it if stopped, then re-read port
            try {
                const container = docker.getContainer(`codespace_${projectId}`);
                const info = await container.inspect();

                if (!info.State.Running) {
                    await container.start();
                }

                return await _inspectAndTrack(container, projectId);
            } catch (innerErr) {
                console.error("Docker recovery error:", innerErr);
                throw innerErr;
            }
        }
        console.error("Docker start error:", error);
        throw error;
    }
}

/**
 * Inspects the container, reads the assigned host port, stores in map,
 * and polls until the internal HTTP server actually responds.
 */
async function _inspectAndTrack(container, projectId) {
    const data = await container.inspect();
    const assignedPort = data.NetworkSettings.Ports["8080/tcp"][0].HostPort;
    codespacePorts.set(projectId, assignedPort);

    // Poll the port until code-server responds (avoids 504 Gateway Timeout in proxy)
    await waitForPortReady(assignedPort, 20); // wait up to 20 seconds

    return { port: assignedPort };
}

/**
 * Polls localhost:port using a raw TCP socket until it connects.
 */
function waitForPortReady(port, maxRetries = 20) {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const check = () => {
            const req = http.get({
                hostname: "127.0.0.1",
                port: port,
                path: "/",
                timeout: 1000
            }, (res) => {
                // code-server usually returns 200, 302, or 401 when ready
                if (res.statusCode === 200 || res.statusCode === 302) {
                    resolve(true);
                } else {
                    retry();
                }
                res.resume();
            });

            req.on("error", retry);
            req.setTimeout(1000, () => {
                req.destroy();
                retry();
            });
        };

        const retry = () => {
            retries++;

            if (retries >= maxRetries) {
                reject(new Error(`code-server on port ${port} did not start in time.`));
            } else {
                setTimeout(check, 1000);
            }
        };

        check();
    });
}

/**
 * Stops and removes a project's codespace container.
 */
export async function stopCodespace(projectId) {
    try {
        const container = docker.getContainer(`codespace_${projectId}`);
        await container.stop();
        await container.remove();
    } catch (err) {
        // If container already stopped/removed, silently continue
        if (err.statusCode !== 404 && err.statusCode !== 304) {
            console.error("Docker stop error:", err);
        }
    } finally {
        codespacePorts.delete(projectId);
    }
}
