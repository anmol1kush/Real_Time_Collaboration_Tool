import { useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

const Whiteboard = ({ socket, projectId }) => {
    const excalidrawAPI = useRef(null);
    const isReceiving = useRef(false);

    useEffect(() => {
        if (!socket || !excalidrawAPI.current) return;

        // Receive whiteboard changes from other users
        socket.on("whiteboard:updated", (elements) => {
            if (!excalidrawAPI.current) return;
            isReceiving.current = true;
            excalidrawAPI.current.updateScene({ elements });
            setTimeout(() => { isReceiving.current = false; }, 100);
        });

        return () => {
            socket.off("whiteboard:updated");
        };
    }, [socket, excalidrawAPI.current]);

    const handleChange = (elements) => {
        if (isReceiving.current || !socket) return;
        socket.emit("whiteboard:update", { projectId, elements });
    };

    return (
        <div className="rounded-lg overflow-hidden border border-zinc-800" style={{ height: "600px", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
                onChange={handleChange}
                theme="dark"
                UIOptions={{
                    canvasActions: {
                        saveToActiveFile: false,
                        loadScene: false,
                        export: false,
                    }
                }}
            />
        </div>
    );
};

export default Whiteboard;
