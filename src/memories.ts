import type { Memory, Trip } from "./lib";
export function visibleMemories(memories: Memory[], trips: Trip[], query = "") {
  return memories.filter(
    (m) =>
      !m.deleted_at &&
      (!m.trip_id || trips.some((t) => t.id === m.trip_id && !t.deleted_at)) &&
      (!query.trim() ||
        m.title
          .toLocaleLowerCase("id-ID")
          .includes(query.trim().toLocaleLowerCase("id-ID"))),
  );
}
export function memoryLocation(memory: Memory, trips: Trip[]) {
  return (
    memory.location?.trim() ||
    trips.find((t) => t.id === memory.trip_id)?.name ||
    "Album bebas"
  );
}
