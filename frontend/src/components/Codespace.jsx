import { useEffect, useState } from "react";
import api from "../services/api";

const Icons = {
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  Spin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}
      style={{ animation: "vscode-spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  ),
  Docker: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
      <path d="M13 3h2v2h-2V3zm3 0h2v2h-2V3zm-6 3h2v2H10V6zm3 0h2v2h-2V6zm3 0h2v2h-2V6zm-9 3H5v2H3.5A3.5 3.5 0 0 0 0 12.5C0 14.43 1.57 16 3.5 16H20a4 4 0 0 0 4-4 4 4 0 0 0-2.5-3.71V6h-2v2h-2V6h-2v2h-2V9H7V6z" />
    </svg>
  ),
};

export default function Codespace({ projectId }) {
  const [isRunning, setIsRunning] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [iframeKey, setIframeKey] = useState(0);

  // The trailing slash is VERY VERY important for code-server to resolve relative static links!
  const proxyUrl = `http://localhost:3000/codespace/${projectId}/`;

  /* ── Status check on mount ── */
  useEffect(() => {
    checkStatus();
  }, [projectId]);

  async function checkStatus() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/codespace/${projectId}/status`);
      setIsRunning(res.data.isRunning);
    } catch (err) {
      setError("Failed to fetch codespace status. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    try {
      setLoading(true);
      setError("");
      await api.post(`/codespace/${projectId}/start`);
      setIsRunning(true);
      setIframeKey(k => k + 1); // force iframe to reload
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start codespace. Make sure Docker is running.");
      setIsRunning(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    try {
      setLoading(true);
      setError("");
      await api.post(`/codespace/${projectId}/stop`);
      setIsRunning(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to stop codespace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes vscode-spin { to { transform: rotate(360deg); } }
        .vsc-start-btn { display:flex; align-items:center; gap:8px; padding:10px 24px;
          background:#007acc; color:#fff; border:none; border-radius:4px; font-size:13px;
          cursor:pointer; font-family:'Menlo','Monaco','Consolas',monospace;
          transition:background .2s; font-weight:500; }
        .vsc-start-btn:hover:not(:disabled) { background:#1a8ad4; }
        .vsc-start-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .vsc-stop-btn { display:flex; align-items:center; gap:6px; padding:4px 12px;
          background:rgba(255,255,255,0.08); color:#ff6b6b; border:1px solid rgba(255,107,107,0.4);
          border-radius:3px; font-size:11px; cursor:pointer; transition:background .15s;
          font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
        .vsc-stop-btn:hover:not(:disabled) { background:rgba(255,107,107,0.15); }
        .vsc-stop-btn:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", height: "100%", minHeight: 600,
        background: "#1e1e1e", border: "1px solid #3c3c3c", borderRadius: 6,
        overflow: "hidden", position: "relative"
      }}>
        
        {/* Simple top bar controls to let user stop the container */}
        <div style={{ height: 40, background: "#252526", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #3c3c3c", justifyContent: "space-between" }}>
            <div style={{ color: "#cccccc", fontSize: 13, fontFamily: "'Menlo','Monaco','Consolas',monospace", display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Docker /> Codespace: {projectId.slice(0, 8)}...
            </div>
            {isRunning && (
                <button onClick={handleStop} disabled={loading} className="vsc-stop-btn">
                  <Icons.Stop /> Stop Container
                </button>
            )}
        </div>

        {/* Dynamic Area */}
        <div style={{ flex: 1, position: "relative" }}>
            
            {loading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(30,30,30,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20, gap: 16 }}>
                    <Icons.Spin />
                    <p style={{ color: "#858585", fontSize: 13, margin: 0 }}>Provisioning environment…</p>
                </div>
            )}

            {error && (
                <div style={{ margin: 16, padding: "10px 14px", background: "rgba(204,63,63,0.12)", border: "1px solid rgba(204,63,63,0.4)", borderRadius: 4, color: "#f48771", fontSize: 12, display: "flex", alignItems: "start", gap: 8, zIndex: 30, position: "relative" }}>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>Error</div>
                        <div style={{ color: "#c9714f" }}>{error}</div>
                    </div>
                    <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#858585", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
            )}

            {/* iframe when running */}
            {isRunning && (
                // <iframe
                //     key={iframeKey}
                //     src={proxyUrl}
                //     style={{
                //         position: "absolute", top: 0, left: 0,
                //         width: "100%", height: "100%", border: "none",
                //         display: loading ? "none" : "block", background: "#1e1e1e",
                //     }}
                //     title="VS Code Codespace"
                //     allow="clipboard-read; clipboard-write"
                // />
             <iframe
  key={iframeKey}
  src={proxyUrl}
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
    background: "#1e1e1e",
  }}
  title="VS Code Codespace"
  allow="clipboard-read; clipboard-write"
/>



            )}

            {/* Offline splash */}
            {!isRunning && !loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 24, padding: 32 }}>
                    <svg width="72" height="72" viewBox="0 0 100 100" style={{ opacity: 0.2 }}>
                        <path fill="#007ACC" d="M74.9 7.4L50 32.4 25 7.4 0 22.3v55.4l25 14.9 25-25 25 25 25-14.9V22.3L74.9 7.4zM25 72.6L8.3 62.8V37.2L25 27.4v45.2zm50 0V27.4l16.7 9.8v25.6L75 72.6z"/>
                    </svg>
                    <div style={{ textAlign: "center" }}>
                        <h3 style={{ color: "#cccccc", fontSize: 18, margin: "0 0 8px", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif", fontWeight: 400 }}>Cloud Development Environment</h3>
                        <p style={{ color: "#5a5a5a", fontSize: 13, margin: "0 0 32px", fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif" }}>
                            Launch a full VS Code server in a Docker container.
                        </p>
                        <button onClick={handleStart} disabled={loading} className="vsc-start-btn">
                            <Icons.Play /> Launch Codespace
                        </button>
                        <p style={{ color: "#3c3c3c", fontSize: 11, marginTop: 16, fontFamily: "sans-serif" }}>
                            Container password: <code style={{ color: "#5a5a5a" }}>rtct_workspace</code>
                        </p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
