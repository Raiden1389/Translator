"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog } from "./ReviewDialog";
import { DictionaryView } from "./dictionary/tabs/DictionaryView";
import { CharacterTab } from "./CharacterTab";
import { BlacklistView } from "./dictionary/tabs/BlacklistView";
import { CorrectionsView } from "./dictionary/tabs/CorrectionsView";
import { useDictionary } from "./dictionary/hooks/useDictionary";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export function DictionaryTab({ workspaceId }: { workspaceId: string }) {
    const [activeTab, setActiveTab] = useState("dictionary");

    // Only need review dialog state from useDictionary
    const {
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleConfirmSave,
    } = useDictionary(workspaceId);

    return (
        <div className="h-full flex flex-col">
            <ErrorBoundary name="DictionaryTab">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                        <TabsTrigger value="dictionary">Thuật ngữ</TabsTrigger>
                        <TabsTrigger value="characters">Danh sách Nhân vật</TabsTrigger>
                        <TabsTrigger value="corrections">Cải chính</TabsTrigger>
                        <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dictionary" className="flex-1 mt-6">
                        <DictionaryView workspaceId={workspaceId} onChangeTab={setActiveTab} />
                    </TabsContent>

                    <TabsContent value="characters" className="flex-1 mt-6">
                        <CharacterTab workspaceId={workspaceId} />
                    </TabsContent>

                    <TabsContent value="corrections" className="flex-1 mt-6">
                        <CorrectionsView workspaceId={workspaceId} />
                    </TabsContent>

                    <TabsContent value="blacklist" className="flex-1 mt-6">
                        <BlacklistView workspaceId={workspaceId} />
                    </TabsContent>
                </Tabs>

                <ReviewDialog
                    open={isReviewOpen}
                    onOpenChange={setIsReviewOpen}
                    characters={pendingCharacters}
                    terms={pendingTerms}
                    onSave={handleConfirmSave}
                />
            </ErrorBoundary>
        </div>
    );
}
