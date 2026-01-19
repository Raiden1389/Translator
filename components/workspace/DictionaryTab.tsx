"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog } from "./ReviewDialog";
import { DictionaryView } from "./dictionary/tabs/DictionaryView";
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
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                        <TabsTrigger value="dictionary">Từ điển</TabsTrigger>
                        <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
                        <TabsTrigger value="corrections">Chỉnh sửa</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dictionary" className="flex-1 mt-6">
                        <DictionaryView workspaceId={workspaceId} onChangeTab={setActiveTab} />
                    </TabsContent>

                    <TabsContent value="blacklist" className="flex-1 mt-6">
                        <BlacklistView workspaceId={workspaceId} />
                    </TabsContent>

                    <TabsContent value="corrections" className="flex-1 mt-6">
                        <CorrectionsView workspaceId={workspaceId} />
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
