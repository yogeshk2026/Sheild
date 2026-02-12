import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { AlertCircle, Home, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI - show error details for debugging
      const errorMessage = this.state.error?.message || 'Unknown error';
      const errorStack = this.state.error?.stack?.split('\n').slice(0, 5).join('\n') || '';

      return (
        <View className="flex-1 bg-shield-surface items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
            <AlertCircle size={40} color="#EF4444" />
          </View>

          <Text className="text-xl font-bold text-shield-dark text-center mb-3">
            {'Something went wrong'}
          </Text>

          <Text className="text-base text-gray-500 text-center mb-4 leading-6">
            {errorMessage}
          </Text>

          {/* Show stack trace for debugging */}
          <View className="bg-gray-100 p-3 rounded-lg mb-6 w-full">
            <Text className="text-xs text-gray-600 font-mono">
              {errorStack}
            </Text>
          </View>

          <Pressable
            onPress={this.handleReset}
            className="w-full bg-shield-accent py-4 rounded-xl flex-row items-center justify-center mb-3"
          >
            <RefreshCw size={20} color="white" />
            <Text className="text-white font-semibold text-base ml-2">
              {'Try Again'}
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary HOC
 *
 * Wraps a component with an error boundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
