import type { Memory, Trip } from "./lib";
export function visibleMemories(
  memories: Memory[],
  trips: Trip[],
  filter = "",
) {
  return memories.filter(
    (m) =>
      !m.deleted_at &&
      (!m.trip_id || trips.some((t) => t.id === m.trip_id && !t.deleted_at)) &&
      (!filter ||
        (filter === "standalone" ? !m.trip_id : m.trip_id === filter)),
  );
}
export function memoryLocation(memory: Memory, trips: Trip[]) {
  return (
    memory.location?.trim() ||
    trips.find((t) => t.id === memory.trip_id)?.name ||
    "Album bebas"
  );
}
