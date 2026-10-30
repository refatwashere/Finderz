import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { bumpGenre } from "./rank";
import { mergeSources } from "./sources";
import type { Find, HuntQuery, SavedFind, Source, Taste, XPin } from "./types";

type State = {
  sources: Source[];
  includeJavinfo: boolean;
  taste: Taste;
  file: SavedFind[];
  pins: XPin[];
  lastQuery: HuntQuery;
  lastFinds: Find[];
  setSources: (sources: Source[]) => void;
  setIncludeJavinfo: (enabled: boolean) => void;
  toggleSource: (id: string) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  setLast: (query: HuntQuery, finds: Find[]) => void;
  like: (find: Find) => void;
  pass: (find: Find) => void;
  save: (find: SavedFind) => void;
  unsave: (id: string) => void;
  pinX: (pin: XPin) => void;
  unpinX: (id: string) => void;
};

const emptyTaste: Taste = { genres: {}, likedIds: [], passedIds: [] };
const legacyStorageKey = "kestrel-desk";
const finderzStorage = createJSONStorage(() => {
  const browserStorage = window.localStorage;
  return {
    getItem(name: string) {
      const current = browserStorage.getItem(name);
      if (current !== null) return current;
      const legacy = browserStorage.getItem(legacyStorageKey);
      if (legacy !== null) {
        browserStorage.setItem(name, legacy);
        browserStorage.removeItem(legacyStorageKey);
      }
      return legacy;
    },
    setItem(name: string, value: string) {
      browserStorage.setItem(name, value);
    },
    removeItem(name: string) {
      browserStorage.removeItem(name);
    },
  };
});

export const useDesk = create<State>()(
  persist(
    (set, get) => ({
      sources: mergeSources(undefined),
      includeJavinfo: false,
      taste: emptyTaste,
      file: [],
      pins: [],
      lastQuery: { query: "", genre: "", code: "" },
      lastFinds: [],
      setSources: (sources) => set({ sources }),
      setIncludeJavinfo: (includeJavinfo) => set({ includeJavinfo }),
      toggleSource: (id) =>
        set({
          sources: get().sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
        }),
      addSource: (source) => set({ sources: [...get().sources, source] }),
      removeSource: (id) =>
        set({
          sources: get().sources.filter((s) => s.id !== id || s.builtin),
        }),
      setLast: (lastQuery, lastFinds) => set({ lastQuery, lastFinds }),
      like: (find) => {
        const taste = get().taste;
        const likedIds = taste.likedIds.includes(find.id)
          ? taste.likedIds
          : [...taste.likedIds, find.id];
        set({
          taste: {
            ...taste,
            likedIds,
            passedIds: taste.passedIds.filter((id) => id !== find.id),
            genres: bumpGenre(taste.genres, find.genres, 1),
          },
        });
      },
      pass: (find) => {
        const taste = get().taste;
        set({
          taste: {
            ...taste,
            passedIds: taste.passedIds.includes(find.id) ? taste.passedIds : [...taste.passedIds, find.id],
            likedIds: taste.likedIds.filter((id) => id !== find.id),
            genres: bumpGenre(taste.genres, find.genres, -1),
          },
        });
      },
      save: (find) => {
        const file = get().file.filter((f) => f.id !== find.id);
        set({ file: [{ ...find, savedAt: Date.now() }, ...file] });
      },
      unsave: (id) => set({ file: get().file.filter((f) => f.id !== id) }),
      pinX: (pin) => {
        const pins = get().pins.filter((p) => p.url !== pin.url);
        set({ pins: [pin, ...pins].slice(0, 40) });
      },
      unpinX: (id) => set({ pins: get().pins.filter((p) => p.id !== id) }),
    }),
    {
      name: "finderz-desk",
      storage: finderzStorage,
      version: 1,
      partialize: (s) => ({
        sources: s.sources,
        includeJavinfo: s.includeJavinfo,
        taste: s.taste,
        file: s.file,
        pins: s.pins,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          sources: mergeSources(p.sources),
          includeJavinfo: p.includeJavinfo === true,
          taste: p.taste ?? emptyTaste,
          file: p.file ?? [],
          pins: p.pins ?? [],
          lastQuery: current.lastQuery,
          lastFinds: current.lastFinds,
        };
      },
    },
  ),
);
