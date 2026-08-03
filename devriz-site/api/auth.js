import { randomBytes } from "node:crypto";

/**
 * Step 1 of the Decap CMS GitHub login: send the writer to GitHub to approve
 * access, then GitHub sends them back to /api/callback.
 *
 * Scope is `public_repo` — enough for Open Authoring on a public repo (fork,
 * push to their own fork, open a pull request) and nothing more. It does not
 * grant any access to this repository's main branch.
 */
export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("GITHUB_CLIENT_ID is not set on this deployment.");
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const state = randomBytes(16).toString("hex");

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${proto}://${host}/api/callback`);
  url.searchParams.set("scope", "public_repo");
  url.searchParams.set("state", state);

  // state is echoed back by GitHub and checked in the callback (CSRF guard)
  res.setHeader(
    "Set-Cookie",
    `decap_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  res.writeHead(302, { Location: url.toString() });
  res.end();
}
