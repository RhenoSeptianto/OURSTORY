import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mocks.from }),
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_only");
  vi.stubGlobal("navigator", { onLine: true });
  const chain = {
    update: mocks.update,
    insert: mocks.insert,
    eq: mocks.eq,
    select: mocks.select,
    single: mocks.single,
  };
  for (const fn of [
    mocks.from,
    mocks.update,
    mocks.insert,
    mocks.eq,
    mocks.select,
  ])
    fn.mockReturnValue(chain);
  mocks.single.mockResolvedValue({
    data: { id: "one", version: 4 },
    error: null,
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Confirmed persistence and conflict protection", () => {
  it("updates only the record version opened by the editor", async () => {
    const { save } = await import("./lib");
    await save(
      "trips",
      { name: "Our next trip" },
      { id: "one", version: 3, created_by: null, updated_by: null },
    );
    expect(mocks.eq.mock.calls).toEqual([
      ["id", "one"],
      ["version", 3],
    ]);
    expect(mocks.single).toHaveBeenCalledOnce();
  });
  it("rejects a stale version instead of reporting success", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    const { save } = await import("./lib");
    await expect(
      save(
        "trips",
        { name: "Old edit" },
        { id: "one", version: 3, created_by: null, updated_by: null },
      ),
    ).rejects.toThrow("perangkat lain");
  });
  it("does not queue or send offline changes", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { save } = await import("./lib");
    await expect(save("trips", { name: "Offline" })).rejects.toThrow("offline");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("propagates database failures and never treats them as saved", async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });
    const { save } = await import("./lib");
    await expect(save("memories", { title: "Story" })).rejects.toThrow(
      "Permission denied",
    );
  });
});
