import { prisma } from "../utils/prisma.js";
import { verifyToken } from "../utils/jwt.js";

const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL         = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL          = process.env.BACKEND_URL  || "http://localhost:3000";

/* ─────────────────────────────────────────────
   1. Redirect user to GitHub OAuth consent page
   GET /api/github/connect?token=<jwt>
───────────────────────────────────────────── */
export async function connectGitHub(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Missing token query param" });
  }

  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ message: "GITHUB_CLIENT_ID not configured" });
  }

  // We pass the user's JWT in the OAuth `state` parameter so we can
  // identify the user in the callback without needing a session/cookie.
  const params = new URLSearchParams({
    client_id:    GITHUB_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/api/github/callback`,
    scope:        "repo",          // needed for push access
    state:        token,           // JWT to identify user
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

/* ─────────────────────────────────────────────
   2. GitHub redirects here after user authorises
   GET /api/github/callback?code=...&state=<jwt>
───────────────────────────────────────────── */
export async function githubCallback(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/dashboard?github=error&reason=missing_params`);
  }

  try {
    // ── Verify the JWT in state to identify the user ──
    const decoded = verifyToken(state);
    const userId  = decoded.userId;

    // ── Exchange the code for an access token ──
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id:     GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("[githubCallback] Token exchange failed:", tokenData);
      return res.redirect(`${FRONTEND_URL}/dashboard?github=error&reason=token_exchange`);
    }

    const accessToken = tokenData.access_token;

    // ── Save the token to the user record ──
    await prisma.user.update({
      where: { id: userId },
      data:  { githubToken: accessToken },
    });

    console.log(`[githubCallback] GitHub token saved for user ${userId}`);

    // ── Redirect back to the frontend with success indicator ──
    res.redirect(`${FRONTEND_URL}/dashboard?github=connected`);

  } catch (err) {
    console.error("[githubCallback] Error:", err);
    res.redirect(`${FRONTEND_URL}/dashboard?github=error&reason=server_error`);
  }
}

/* ─────────────────────────────────────────────
   3. Check if current user has GitHub connected
   GET /api/github/status  (auth required)
───────────────────────────────────────────── */
export async function githubStatus(req, res) {
  try {
    const user = req.user;

    if (!user.githubToken) {
      return res.json({ connected: false });
    }

    // Optionally fetch the GitHub username to show in UI
    try {
      const ghRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${user.githubToken}`,
          Accept: "application/json",
        },
      });

      if (ghRes.ok) {
        const ghUser = await ghRes.json();
        return res.json({
          connected: true,
          username:  ghUser.login,
          avatar:    ghUser.avatar_url,
        });
      }
    } catch {
      // Token might be revoked — still report as connected but without username
    }

    return res.json({ connected: true });

  } catch (err) {
    console.error("[githubStatus] Error:", err);
    res.status(500).json({ message: "Failed to check GitHub status" });
  }
}

/* ─────────────────────────────────────────────
   4. Disconnect GitHub
   POST /api/github/disconnect  (auth required)
───────────────────────────────────────────── */
export async function disconnectGitHub(req, res) {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data:  { githubToken: null },
    });

    res.json({ message: "GitHub disconnected" });
  } catch (err) {
    console.error("[disconnectGitHub] Error:", err);
    res.status(500).json({ message: "Failed to disconnect GitHub" });
  }
}
