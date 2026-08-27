/**
 * One place that talks to /api/admin.
 *
 * Every error surfaces as a plain sentence, because the person reading it is a
 * writer, not a developer: no status codes, no stack traces, and never a bare
 * "Failed to fetch". The server's own messages are already written that way, so
 * they are passed through untouched.
 */
const request = async (method, path, body) => {
  let res;
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new Error(
      "Could not reach the website. Check your internet connection and try again."
    );
  }

  if (res.status === 401) {
    const err = new Error("Your session expired. Please sign in again.");
    err.signedOut = true;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* an empty or non-JSON body is handled by the status check below */
  }

  if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
  return data;
};

export const api = {
  me: () => request("GET", "/me"),
  login: (password) => request("POST", "/login", { password }),
  logout: () => request("POST", "/logout"),

  posts: () => request("GET", "/posts"),
  post: (slug) => request("GET", `/posts/${encodeURIComponent(slug)}`),
  savePost: (slug, post) => request("PUT", `/posts/${encodeURIComponent(slug || "_new")}`, post),
  deletePost: (slug) => request("DELETE", `/posts/${encodeURIComponent(slug)}`),

  trash: () => request("GET", "/trash"),
  restore: (slug) => request("POST", `/trash/${encodeURIComponent(slug)}/restore`),
  purge: (slug) => request("DELETE", `/trash/${encodeURIComponent(slug)}`),

  media: () => request("GET", "/media"),
  upload: (payload) => request("POST", "/media", payload),
  deleteMedia: (name) => request("DELETE", `/media/${encodeURIComponent(name)}`),

  repairPreview: () => request("GET", "/repair"),
  repair: () => request("POST", "/repair"),
  republish: () => request("POST", "/republish"),
};
