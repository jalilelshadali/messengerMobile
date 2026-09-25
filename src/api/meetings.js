import client from "./client";

export function fetchMeetings() {
  return client.get("/meetings/");
}

// reason: "gələ bilmərəm" cavabı üçün istəyə bağlı səbəb.
export function respondToMeeting(meetingId, response, reason = "") {
  return client.patch(`/meetings/${meetingId}/respond/`, { response, reason });
}

export function createMeeting({ title, description, location, startsAt, endsAt, userIds, sectionIds, unitIds, allUsers }) {
  return client.post("/meetings/create/", {
    title,
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt || null,
    user_ids: userIds || [],
    section_ids: sectionIds || [],
    unit_ids: unitIds || [],
    all_users: !!allUsers,
  });
}
