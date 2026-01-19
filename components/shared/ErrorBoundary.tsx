"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.name || "ErrorBoundary"}:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-6 my-4 border border-destructive/20 bg-destructive/5 rounded-xl flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                    <div className="p-3 bg-destructive/10 rounded-full">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">Something went wrong</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            {this.state.error?.message || "An unexpected error occurred in this component."}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleReset}
                        className="gap-2 border-border"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
