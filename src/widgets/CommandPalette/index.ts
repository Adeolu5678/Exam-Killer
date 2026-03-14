// =============================================================================
// widgets/CommandPalette/index.ts  —  Public barrel export
// Layer: widgets → CommandPalette
// Rule: Consumers import ONLY from this file.
//   ✅  import { CommandPalette } from '@/widgets/CommandPalette'
//   ❌  import { CommandPalette } from '@/widgets/CommandPalette/CommandPalette'
// =============================================================================

export { CommandPalette } from './CommandPalette';
export { useCommandPaletteCommands } from './useCommandPaletteCommands';
export type { PaletteCommand, CommandGroup } from './useCommandPaletteCommands';
