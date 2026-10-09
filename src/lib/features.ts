// Switches for parts of the UI that are built but deliberately turned off.

/**
 * The quorum bar (percentage + shareholder count) on the AGM event page and in the live room.
 * Turned off on request (2026-10-09): quorum is hidden from participants. While off, the quorum
 * endpoint isn't called either. Set to true to bring both bars back; nothing else changes.
 */
export const SHOW_QUORUM = false;
