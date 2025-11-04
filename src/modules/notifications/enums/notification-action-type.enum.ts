/**
 * Action types for notification interactions
 * Determines how the frontend should handle notification clicks
 */
export enum NotificationActionType {
  NAVIGATE = 'NAVIGATE', // Navigate to internal route (use actionUrl)
  OPEN_MODAL = 'OPEN_MODAL', // Open a modal/dialog
  COPY_TEXT = 'COPY_TEXT', // Copy text to clipboard
  EXTERNAL_LINK = 'EXTERNAL_LINK', // Open external URL
  NONE = 'NONE', // No action, just dismiss
}
