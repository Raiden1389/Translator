/**
 * Hook to manage OAuth preference setting
 * Allows user to toggle between API Key and OAuth without deleting keys
 */

import { useState, useEffect } from "react";
import { db } from "@/lib/db";

export function useOAuthPreference() {
  const [preferOAuth, setPreferOAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load preference from DB
  useEffect(() => {
    loadPreference();
  }, []);

  async function loadPreference() {
    try {
      const setting = await db.settings.get("preferOAuthOverApiKey");
      setPreferOAuth(setting?.value === true || setting?.value === "true");
    } catch (error) {
      console.error("Failed to load OAuth preference:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function togglePreference(value: boolean) {
    try {
      await db.settings.put({
        key: "preferOAuthOverApiKey",
        value
      });
      setPreferOAuth(value);
    } catch (error) {
      console.error("Failed to save OAuth preference:", error);
      throw error;
    }
  }

  return {
    preferOAuth,
    isLoading,
    togglePreference
  };
}
