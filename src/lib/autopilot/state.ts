/**
 * Shared state for autopilot status
 * This file provides a singleton for managing the autopilot state across API routes
 */

// In-memory state instead of file-based storage
let autopilotState = {
  active: false
};

/**
 * Get the current autopilot status
 */
export function getAutopilotStatus(): boolean {
  return autopilotState.active;
}

/**
 * Set the autopilot status
 */
export function setAutopilotStatus(active: boolean): boolean {
  autopilotState.active = active;
  return active;
}

/**
 * Toggle the autopilot status
 */
export function toggleAutopilotStatus(): boolean {
  autopilotState.active = !autopilotState.active;
  return autopilotState.active;
} 