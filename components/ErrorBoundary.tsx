"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // Could send to error tracking service here
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center h-screen bg-background">
                    <div className="text-center max-w-md p-8 bg-card border border-border rounded-lg shadow-lg">
                        <div className="mb-4 text-6xl">⚠️</div>
                        <h2 className="text-2xl font-bold mb-4 text-foreground">Oops! Something went wrong</h2>
                        <p className="text-muted-foreground mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                variant="outline"
                            >
                                Try Again
                            </Button>
                            <Button onClick={() => window.location.reload()}>
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
