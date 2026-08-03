/**
 * Step 2 of the Decap CMS GitHub login: swap the one-time code GitHub sent
 * for an access token, then hand it to the CMS window.
 *
 * Decap's popup handshake: the popup announces itself with "authorizing:github",
 * the CMS replies, and only then do we post the token back — to the exact
 * origin the CMS replied from, never to "*".
 */
const page = (status, payload) => `<!doctype html>
<html><body><p>Completing sign-in…</p><script>
(function () {
  var message = 'authorization:github:${status}:' + ${JSON.stringify(
    JSON.stringify(payload)
  )};
  function receive(e) {
    if (!e.origin || e.origin !== window.location.origin) return;
    window.opener.postMessage(message, e.origin);
    window.removeEventListener('message', receive, false);
    window.close();
  }
  window.addEventListener('message', receive, false);
  if (window.opener) {
    window.opener.postMessage('authorizing:github', window.location.origin);
  } else {
    document.body.textContent = 'Open the editor at /admin and sign in from there.';
  }
})();
</script></body></html>`;

const readCookie = (header, name) =>
  (header || "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const { code, state, error: oauthError } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const fail = (message) => res.status(200).send(page("error", { message }));

  if (oauthError) return fail(String(oauthError));
  if (!clientId || !clientSecret) {
    return fail("GitHub OAuth credentials are not set on this deployment.");
  }
  if (!code) return fail("GitHub did not return an authorization code.");

  // clear the one-time state cookie whatever happens next
  res.setHeader(
    "Set-Cookie",
    "decap_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  if (!state || state !== readCookie(req.headers.cookie, "decap_state")) {
    return fail("Sign-in expired or was tampered with. Please try again.");
  }

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );
    const data = await tokenRes.json();
    if (!data.access_token) {
      return fail(data.error_description || "GitHub refused the sign-in.");
    }
    return res
      .status(200)
      .send(page("success", { token: data.access_token, provider: "github" }));
  } catch {
    return fail("Could not reach GitHub. Please try again.");
  }
}
