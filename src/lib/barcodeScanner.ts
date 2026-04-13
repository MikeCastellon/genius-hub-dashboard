/**
 * Native barcode scanner bridge using barkoder-capacitor.
 * Works on both iOS and Android (replaces ML Kit which only worked on Android).
 *
 * NOTE: This file is kept for backward compatibility but the main scanner logic
 * is now in BarkoderScanner.tsx which handles both web and native paths directly.
 */
import { Capacitor } from '@capacitor/core'

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}
