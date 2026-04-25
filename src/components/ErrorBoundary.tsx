import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔥 Uncaught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/10"
        >
          <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center ring-4 ring-destructive/5">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                حدث خطأ غير متوقع
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                نعتذر عن هذا الخلل. يمكنك المحاولة مرة أخرى أو العودة لاحقاً.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-start bg-muted/50 rounded-lg p-3 border border-border">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  تفاصيل المطور
                </summary>
                <pre className="mt-2 text-[10px] text-destructive overflow-auto max-h-48 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={this.handleRetry} className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              <Button onClick={this.handleBack} variant="outline" className="flex-1 gap-2">
                <ArrowLeft className="w-4 h-4" />
                العودة
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
