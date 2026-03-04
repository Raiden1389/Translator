/**
 * UI Preferences Repository (v2.7.0 - UI Polish)
 *
 * CRUD operations for UI preferences stored in IndexedDB.
 * All operations are no-op when feature flag is OFF (safe for rollback).
 */

import { db, type UIPreference } from '../db';
import { featureFlags } from '../featureFlags';

export async function getUIPreference<T = unknown>(key: string): Promise<T | null> {
  if (!featureFlags.uiPreferences) return null;

  try {
    const pref = await db.uiPreferences.get(key);
    return pref ? (pref.value as T) : null;
  } catch (error) {
    console.error(`Failed to get UI preference "${key}":`, error);
    return null;
  }
}

export async function setUIPreference(key: string, value: unknown): Promise<void> {
  if (!featureFlags.uiPreferences) return;

  try {
    await db.uiPreferences.put({ key, value, updatedAt: new Date() });
  } catch (error) {
    console.error(`Failed to set UI preference "${key}":`, error);
  }
}

export async function deleteUIPreference(key: string): Promise<void> {
  if (!featureFlags.uiPreferences) return;

  try {
    await db.uiPreferences.delete(key);
  } catch (error) {
    console.error(`Failed to delete UI preference "${key}":`, error);
  }
}

export async function getAllUIPreferences(): Promise<UIPreference[]> {
  if (!featureFlags.uiPreferences) return [];

  try {
    return await db.uiPreferences.toArray();
  } catch (error) {
    console.error('Failed to get all UI preferences:', error);
    return [];
  }
}

export async function clearAllUIPreferences(): Promise<void> {
  if (!featureFlags.uiPreferences) return;

  try {
    await db.uiPreferences.clear();
    console.log('✅ All UI preferences cleared');
  } catch (error) {
    console.error('Failed to clear UI preferences:', error);
  }
}
