// =============================================================================
// shared/stores/ui-store.ts
// Layer: shared → stores
// Tool: Zustand — shell-level ephemeral UI state.
//       Sidebar collapse / mobile drawer / Command Palette.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AppShellUIState {
  /** Desktop sidebar collapsed to icon-only (60px) mode */
  isSidebarCollapsed: boolean;
  /** Mobile: whether the bottom-sheet drawer is open */
  isMobileDrawerOpen: boolean;
  /** Global ⌘K Command Palette open/closed state */
  isCommandPaletteOpen: boolean;
}

interface AppShellUIActions {
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  openCommandPalette: () => void;
}

const initial: AppShellUIState = {
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  isCommandPaletteOpen: false,
};

export const useAppShellStore = create<AppShellUIState & AppShellUIActions>()(
  immer((set) => ({
    ...initial,

    toggleSidebar: () =>
      set((s) => {
        s.isSidebarCollapsed = !s.isSidebarCollapsed;
      }),

    collapseSidebar: () =>
      set((s) => {
        s.isSidebarCollapsed = true;
      }),

    expandSidebar: () =>
      set((s) => {
        s.isSidebarCollapsed = false;
      }),

    openMobileDrawer: () =>
      set((s) => {
        s.isMobileDrawerOpen = true;
      }),

    closeMobileDrawer: () =>
      set((s) => {
        s.isMobileDrawerOpen = false;
      }),

    toggleCommandPalette: () =>
      set((s) => {
        s.isCommandPaletteOpen = !s.isCommandPaletteOpen;
      }),

    closeCommandPalette: () =>
      set((s) => {
        s.isCommandPaletteOpen = false;
      }),

    openCommandPalette: () =>
      set((s) => {
        s.isCommandPaletteOpen = true;
      }),
  })),
);
