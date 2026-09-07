import client from "./client";

export function fetchDocuments() {
  return client.get("/library/");
}
