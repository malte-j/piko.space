import create from "zustand";
import { devtools, persist } from "zustand/middleware";

interface NavState {
  navOpen: boolean;
  toggle(): void;
}

export const useNavStore = create<NavState>()(
  devtools((set) => ({
    navOpen: false,
    toggle: () => set((state) => ({ navOpen: !state.navOpen })),
  }))
);
