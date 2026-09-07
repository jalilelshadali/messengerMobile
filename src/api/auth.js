import client from "./client";

export function login({ username, password }) {
  return client.post("/accounts/login/", { username, password });
}

export function refreshAccessToken(refresh) {
  return client.post("/accounts/login/refresh/", { refresh });
}

export function fetchMe() {
  return client.get("/accounts/me/");
}

export function searchUsers(search) {
  return client.get("/accounts/users/", { params: { search } });
}

export function setPublicKey(publicKey) {
  return client.patch("/accounts/me/public-key/", { public_key: publicKey });
}
