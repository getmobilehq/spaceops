import { create } from "zustand";

export interface InspectionResponse {
  checklistItemId: string;
  result: "pass" | "fail" | null;
  comment: string;
  photoUrls: string[];
}

interface InspectionState {
  inspectionId: string | null;
  spaceId: string | null;
  responses: Record<string, InspectionResponse>;
  startedAt: string | null;
  isDirty: boolean;

  // Actions
  init: (inspectionId: string, spaceId: string, itemIds: string[]) => void;
  setResult: (itemId: string, result: "pass" | "fail") => void;
  setComment: (itemId: string, comment: string) => void;
  addPhoto: (itemId: string, url: string) => void;
  removePhoto: (itemId: string, url: string) => void;
  loadFromStorage: (spaceId: string) => boolean;
  markClean: () => void;
  reset: () => void;
}

function getStorageKey(spaceId: string) {
  return `inspection:${spaceId}`;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  inspectionId: null,
  spaceId: null,
  responses: {},
  startedAt: null,
  isDirty: false,

  init: (inspectionId, spaceId, itemIds) => {
    const responses: Record<string, InspectionResponse> = {};
    for (const id of itemIds) {
      responses[id] = {
        checklistItemId: id,
        result: null,
        comment: "",
        photoUrls: [],
      };
    }
    set({
      inspectionId,
      spaceId,
      responses,
      startedAt: new Date().toISOString(),
      isDirty: false,
    });
  },

  setResult: (itemId, result) => {
    const { responses, spaceId } = get();
    const response = responses[itemId];
    if (!response) return;

    const updated = {
      ...responses,
      [itemId]: { ...response, result },
    };

    set({ responses: updated, isDirty: true });

    // Save to localStorage immediately
    if (spaceId) {
      try {
        localStorage.setItem(
          getStorageKey(spaceId),
          JSON.stringify({ ...get(), responses: updated })
        );
      } catch {}
    }
  },

  setComment: (itemId, comment) => {
    const { responses, spaceId } = get();
    const response = responses[itemId];
    if (!response) return;

    const updated = {
      ...responses,
      [itemId]: { ...response, comment },
    };

    set({ responses: updated, isDirty: true });

    if (spaceId) {
      try {
        localStorage.setItem(
          getStorageKey(spaceId),
          JSON.stringify({ ...get(), responses: updated })
        );
      } catch {}
    }
  },

  addPhoto: (itemId, url) => {
    const { responses, spaceId } = get();
    const response = responses[itemId];
    if (!response) return;

    const updated = {
      ...responses,
      [itemId]: { ...response, photoUrls: [...response.photoUrls, url] },
    };

    set({ responses: updated, isDirty: true });

    if (spaceId) {
      try {
        localStorage.setItem(
          getStorageKey(spaceId),
          JSON.stringify({ ...get(), responses: updated })
        );
      } catch {}
    }
  },

  removePhoto: (itemId, url) => {
    const { responses, spaceId } = get();
    const response = responses[itemId];
    if (!response) return;

    const updated = {
      ...responses,
      [itemId]: {
        ...response,
        photoUrls: response.photoUrls.filter((u) => u !== url),
      },
    };

    set({ responses: updated, isDirty: true });

    if (spaceId) {
      try {
        localStorage.setItem(
          getStorageKey(spaceId),
          JSON.stringify({ ...get(), responses: updated })
        );
      } catch {}
    }
  },

  loadFromStorage: (spaceId) => {
    try {
      const stored = localStorage.getItem(getStorageKey(spaceId));
      if (!stored) return false;

      const data = JSON.parse(stored);
      if (data.inspectionId && data.responses) {
        set({
          inspectionId: data.inspectionId,
          spaceId: data.spaceId,
          responses: data.responses,
          startedAt: data.startedAt,
          isDirty: false,
        });
        return true;
      }
    } catch {}
    return false;
  },

  markClean: () => set({ isDirty: false }),

  reset: () => {
    const { spaceId } = get();
    if (spaceId) {
      try {
        localStorage.removeItem(getStorageKey(spaceId));
      } catch {}
    }
    set({
      inspectionId: null,
      spaceId: null,
      responses: {},
      startedAt: null,
      isDirty: false,
    });
  },
}));
