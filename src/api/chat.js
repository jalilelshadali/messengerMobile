import client from "./client";

export function fetchConversations() {
  return client.get("/chat/conversations/");
}

export function fetchConversation(conversationId) {
  return client.get(`/chat/conversations/${conversationId}/`);
}

export function startDirectConversation(userId) {
  return client.post("/chat/conversations/direct/", { user_id: userId });
}

export function createGroupConversation(name, memberIds) {
  return client.post("/chat/conversations/group/", { name, member_ids: memberIds });
}

export function fetchMessages(conversationId, afterId) {
  const params = afterId ? { after: afterId } : {};
  return client.get(`/chat/conversations/${conversationId}/messages/`, { params });
}

export function sendGroupMessage(conversationId, text) {
  return client.post(`/chat/conversations/${conversationId}/messages/`, { text });
}

export function sendEncryptedMessage(conversationId, ciphertext, nonce) {
  return client.post(`/chat/conversations/${conversationId}/messages/`, { ciphertext, nonce });
}

export function renameConversation(conversationId, name) {
  return client.patch(`/chat/conversations/${conversationId}/rename/`, { name });
}

export function addMembers(conversationId, memberIds) {
  return client.post(`/chat/conversations/${conversationId}/members/`, { member_ids: memberIds });
}

export function removeMember(conversationId, userId) {
  return client.delete(`/chat/conversations/${conversationId}/members/${userId}/`);
}

export function setConversationAdmin(conversationId, userId, isAdmin) {
  return client.patch(`/chat/conversations/${conversationId}/members/${userId}/admin/`, { is_admin: isAdmin });
}

export function leaveConversation(conversationId) {
  return client.post(`/chat/conversations/${conversationId}/leave/`);
}

export function markConversationRead(conversationId) {
  return client.post(`/chat/conversations/${conversationId}/read/`);
}
