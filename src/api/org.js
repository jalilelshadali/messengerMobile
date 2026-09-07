import client from "./client";

export function fetchUnits() {
  return client.get("/org/units/");
}

export function createUnit(name) {
  return client.post("/org/units/", { name });
}

export function createSection(unitId, name) {
  return client.post("/org/sections/", { unit: unitId, name });
}
