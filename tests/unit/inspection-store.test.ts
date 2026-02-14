import { describe, it, expect, beforeEach } from "vitest";
import { useInspectionStore } from "@/lib/stores/inspection-store";

describe("useInspectionStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useInspectionStore.getState().reset();
    localStorage.clear();
  });

  it("initializes with null state", () => {
    const state = useInspectionStore.getState();
    expect(state.inspectionId).toBeNull();
    expect(state.spaceId).toBeNull();
    expect(state.responses).toEqual({});
    expect(state.startedAt).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it("init sets up responses for given item IDs", () => {
    const { init } = useInspectionStore.getState();
    init("insp-1", "space-1", ["item-a", "item-b"]);

    const state = useInspectionStore.getState();
    expect(state.inspectionId).toBe("insp-1");
    expect(state.spaceId).toBe("space-1");
    expect(Object.keys(state.responses)).toHaveLength(2);
    expect(state.responses["item-a"].result).toBeNull();
    expect(state.responses["item-a"].comment).toBe("");
    expect(state.responses["item-a"].photoUrls).toEqual([]);
    expect(state.startedAt).toBeTruthy();
  });

  it("setResult updates a specific item result", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);

    useInspectionStore.getState().setResult("item-a", "fail");

    const state = useInspectionStore.getState();
    expect(state.responses["item-a"].result).toBe("fail");
    expect(state.isDirty).toBe(true);
  });

  it("setComment updates a specific item comment", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);

    useInspectionStore.getState().setComment("item-a", "Needs cleaning");

    const state = useInspectionStore.getState();
    expect(state.responses["item-a"].comment).toBe("Needs cleaning");
    expect(state.isDirty).toBe(true);
  });

  it("addPhoto appends a URL to item photoUrls", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);

    useInspectionStore.getState().addPhoto("item-a", "https://example.com/photo1.jpg");
    useInspectionStore.getState().addPhoto("item-a", "https://example.com/photo2.jpg");

    const state = useInspectionStore.getState();
    expect(state.responses["item-a"].photoUrls).toEqual([
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ]);
  });

  it("removePhoto removes a specific URL", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);

    useInspectionStore.getState().addPhoto("item-a", "https://example.com/1.jpg");
    useInspectionStore.getState().addPhoto("item-a", "https://example.com/2.jpg");
    useInspectionStore.getState().removePhoto("item-a", "https://example.com/1.jpg");

    const state = useInspectionStore.getState();
    expect(state.responses["item-a"].photoUrls).toEqual(["https://example.com/2.jpg"]);
  });

  it("loadFromStorage restores state from localStorage", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);
    useInspectionStore.getState().setResult("item-a", "pass");

    // Simulate fresh store
    useInspectionStore.setState({
      inspectionId: null,
      spaceId: null,
      responses: {},
      startedAt: null,
      isDirty: false,
    });

    const loaded = useInspectionStore.getState().loadFromStorage("space-1");
    expect(loaded).toBe(true);

    const state = useInspectionStore.getState();
    expect(state.inspectionId).toBe("insp-1");
    expect(state.responses["item-a"].result).toBe("pass");
  });

  it("reset clears state and localStorage", () => {
    const store = useInspectionStore.getState();
    store.init("insp-1", "space-1", ["item-a"]);
    useInspectionStore.getState().setResult("item-a", "fail");

    useInspectionStore.getState().reset();

    const state = useInspectionStore.getState();
    expect(state.inspectionId).toBeNull();
    expect(state.responses).toEqual({});

    // localStorage should be cleared for this space
    expect(localStorage.getItem("inspection:space-1")).toBeNull();
  });
});
