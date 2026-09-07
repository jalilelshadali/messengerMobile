import client from "./client";

export function fetchAllUsers() {
  return client.get("/accounts/admin/users/");
}

export function createUser({ username, password, firstName, lastName, degree }) {
  return client.post("/accounts/admin/users/create/", {
    username,
    password,
    first_name: firstName,
    last_name: lastName,
    degree,
  });
}

export function updateUserDegree(userId, degree) {
  return client.patch(`/accounts/admin/users/${userId}/degree/`, { degree });
}

export function assignUserSection(userId, sectionId) {
  return client.patch(`/accounts/admin/users/${userId}/section/`, { section_id: sectionId });
}

export function fetchAllDocuments() {
  return client.get("/library/admin/");
}

export function uploadDocument({ title, minDegree, file }) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("min_degree", String(minDegree));
  if (file.file instanceof Blob) {
    // Web: expo-document-picker gives a real File/Blob via `.file`.
    formData.append("file", file.file, file.name || "sened.pdf");
  } else {
    // Native (iOS/Android): React Native's fetch understands this {uri, name, type} shape.
    formData.append("file", {
      uri: file.uri,
      name: file.name || "sened.pdf",
      type: "application/pdf",
    });
  }
  return client.post("/library/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
