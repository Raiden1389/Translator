"use client";

import { useState } from "react";

export function useEditorState() {
    const [viewMode, setViewMode] = useState<'vi' | 'zh' | 'parallel'>('parallel');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [highlightedChar, setHighlightedChar] = useState<string>("");
    const [isReaderMode, setIsReaderMode] = useState(false);
    const [translatedContent, setTranslatedContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [dicOpen, setDicOpen] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [selectedTranslatedText, setSelectedTranslatedText] = useState("");

    return {
        viewMode, setViewMode,
        sidebarOpen, setSidebarOpen,
        highlightedChar, setHighlightedChar,
        isReaderMode, setIsReaderMode,
        translatedContent, setTranslatedContent,
        isSaving, setIsSaving,
        dicOpen, setDicOpen,
        selectedText, setSelectedText,
        selectedTranslatedText, setSelectedTranslatedText
    };
}
