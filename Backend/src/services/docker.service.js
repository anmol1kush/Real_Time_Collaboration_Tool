import Docker from "dockerode";
import http from "http";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
import { prisma } from "../utils/prisma.js";

const execPromise = util.promisify(exec);
const docker = new Docker(); // Windows docker pipe

// In-memory map: projectId → assigned URL (host:port)
export const codespaceUrls = new Map();

/**
 * Starts a VS Code server (code-server) container for a project.
 * Handles three cases:
 *   1. Already tracked in memory → return cached port
 *   2. Container does not exist → create + start fresh
 *   3. Container exists but stopped (409 conflict) → start it and re-populate port map
 */
export async function startCodespace(projectId, user = null) {
    // Extract token if present
    const githubToken = user?.githubToken || null;

    // 1. Already running and tracked
    if (codespaceUrls.has(projectId)) {
        return { url: codespaceUrls.get(projectId) };
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

        // Build clone URL — inject token for authentication if available
        let repoUrl = project?.githubRepo || "";
        let authRepoUrl = repoUrl;
        if (githubToken && repoUrl) {
            // Convert https://github.com/user/repo.git → https://<token>@github.com/user/repo.git
            authRepoUrl = repoUrl.replace(
                /^https:\/\//,
                `https://${githubToken}@`
            );
        }

        // If directory is empty and we have a githubRepo, clone it
        if (repoUrl) {
            const files = fs.readdirSync(workspaceDir);
            if (files.length === 0) {
                const cloneUrl = authRepoUrl || repoUrl;
                console.log(`Cloning repository into ${workspaceDir}...`);
                try {
                    await execPromise(`git clone ${cloneUrl} .`, { cwd: workspaceDir });
                    await execPromise(`git config core.filemode false`, { cwd: workspaceDir });
                    console.log(`Successfully cloned repository`);
                } catch (cloneErr) {
                    console.error("Failed to clone repository:", cloneErr);
                    // Continue even if clone fails, they'll get an empty space
                }
            } else if (githubToken) {
                // Directory already has files — update remote URL with token for push access
                try {
                    await execPromise(`git remote set-url origin ${authRepoUrl}`, { cwd: workspaceDir });
                    console.log(`Updated git remote with authenticated URL`);
                } catch {
                    // Not a git repo or remote doesn't exist — ignore
                }
            }
        }

        // Fix permissions so the non-root code-server user can read/write
        // and fix git dubious ownership (code-server runs as UID 1000)
        try {
            await execPromise(`chmod -R 777 ${workspaceDir}`);
            await execPromise(`chown -R 1000:1000 ${workspaceDir}`);
        } catch (chmodErr) {
            console.error("Failed to set permissions:", chmodErr);
        }

        const isDocker = process.env.RUNNING_IN_DOCKER === "true";
        // 2. Create fresh container
        const container = await docker.createContainer({
            Image: "codercom/code-server:latest",
            name: `codespace_${projectId}`,
            HostConfig: {
                NetworkMode: isDocker ? "rtct_net" : "default",
                PortBindings: isDocker ? {} : {
                    "8080/tcp": [{ HostIp: "127.0.0.1", HostPort: "0" }]
                },
                Binds: [
                    isDocker 
                      ? `rtct_workspace_data:/home/coder/project_volume` 
                      : `${process.cwd()}/workspace/${projectId}:/home/coder/workspace`
                ]
            },
            Env: [
                "PASSWORD=rtct_workspace",
                "DISABLE_TELEMETRY=true",
                `VSCODE_PROXY_URI=http://localhost:3000/codespace/${projectId}/{{port}}`,
                ...(githubToken ? [`GIT_AUTH_TOKEN=${githubToken}`] : []),
                ...(user?.name ? [
                    `GIT_AUTHOR_NAME=${user.name}`,
                    `GIT_COMMITTER_NAME=${user.name}`
                ] : []),
                ...(user?.email ? [
                    `GIT_AUTHOR_EMAIL=${user.email}`,
                    `GIT_COMMITTER_EMAIL=${user.email}`
                ] : []),
            ],
            Cmd: [
                "--auth", "none",
                "--bind-addr", "0.0.0.0:8080",
                isDocker ? `/home/coder/project_volume/${projectId}` : "/home/coder/workspace"
            ]
        });

        await container.start();

        // Fix Git safe.directory inside the container (critical for Windows hosts where chown fails)
        try {
            const execCmd = await container.exec({
                Cmd: ['git', 'config', '--global', '--add', 'safe.directory', '*'],
                AttachStdout: true,
                AttachStderr: true
            });
            await execCmd.start({});
        } catch (err) {
            console.error("Failed to add Git safe.directory:", err);
        }

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

async function _inspectAndTrack(container, projectId) {
    const data = await container.inspect();
    const isDocker = process.env.RUNNING_IN_DOCKER === "true";
    
    let targetHost, targetPort;
    if (isDocker) {
        targetHost = `codespace_${projectId}`;
        targetPort = 8080;
    } else {
        targetHost = "127.0.0.1";
        targetPort = data.NetworkSettings.Ports["8080/tcp"][0].HostPort;
    }
    
    const url = `http://${targetHost}:${targetPort}`;
    codespaceUrls.set(projectId, url);

    await waitForPortReady(targetHost, targetPort, 20);

    return { url };
}

/**
 * Polls host:port using a raw TCP socket until it connects.
 */
function waitForPortReady(host, port, maxRetries = 20) {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const check = () => {
            const req = http.get({
                hostname: host,
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
        codespaceUrls.delete(projectId);
    }
}
