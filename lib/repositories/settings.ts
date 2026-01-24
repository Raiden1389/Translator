import { db } from "../db"

/**
 * Repository for Settings persistence
 */
export const settingsRepo = {
    /**
     * Saves AI configuration atomically using a transaction
     */
    async saveAISettings(primaryKey: string, poolKeys: string, model: string): Promise<void> {
        await db.transaction('rw', db.settings, async () => {
            await db.settings.bulkPut([
                { key: "apiKeyPrimary", value: primaryKey },
                { key: "apiKeyPool", value: poolKeys },
                { key: "aiModel", value: model }
            ])
        })
    }
}
