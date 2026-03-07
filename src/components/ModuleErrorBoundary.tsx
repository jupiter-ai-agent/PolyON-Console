/**
 * ModuleErrorBoundary — 모듈 로딩 에러 처리
 */
import { Component } from 'react';
import type { ReactNode } from 'react';
import { InlineNotification, Button } from '@carbon/react';

interface Props {
  moduleId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Module ${this.props.moduleId} error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem' }}>
          <InlineNotification
            kind="error"
            title={`모듈 "${this.props.moduleId}" 로딩 실패`}
            subtitle={this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <Button
              size="sm"
              kind="tertiary"
              onClick={this.handleReset}
            >
              재시도
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}