import client from "./client";

export function fetchMeetings() {
  return client.get("/meetings/");
}

export function respondToMeeting(meetingId, response) {
  return client.patch(`/meetings/${meetingId}/respond/`, { response });
}

export function createMeeting({ title, description, location, startsAt, endsAt, userIds, sectionIds, unitIds }) {
  return client.post("/meetings/create/", {
    title,
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt || null,
    user_ids: userIds || [],
    section_ids: sectionIds || [],
    unit_ids: unitIds || [],
  });
}
