import { Component, ReactNode, ErrorInfo } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('nexusnet_social_graph_v1');
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">NexusNet 畫面載入異常</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              可能因瀏覽器舊版本快取或資料解析不相容導致。點擊下方按鈕可清除快取並重設回預設關係網。
            </p>
            {this.state.error && (
              <div className="w-full p-2.5 mb-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-red-400 text-left overflow-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg shadow-sky-600/30 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重設資料並重新載入</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                重新整理
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
