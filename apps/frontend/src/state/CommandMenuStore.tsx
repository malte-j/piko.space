import create from "zustand";
import { devtools } from "zustand/middleware";

interface CommandMenuStore {
  navOpen: boolean;
  toggle(): void;
  setOpen(open: boolean): void;
}

export const useCommandMenuStore = create<CommandMenuStore>()(
  devtools((set) => ({
    navOpen: false,
    setOpen: (open: boolean) => set({ navOpen: open }),
    toggle: () => set((state) => ({ navOpen: !state.navOpen })),
  }))
);
