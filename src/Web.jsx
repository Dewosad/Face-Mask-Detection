import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const Web = () => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isDebugMode, setIsDebugMode] = useState(true);
    const [currentCoordinator, setCurrentCoordinator] = useState("OpenCV");
    const [detections, setDetections] = useState([]);
    const [lastFrame, setLastFrame] = useState(null);
    const imageRef = useRef(null);
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io("http://localhost:5000", {
            transports: ["websocket"],
            cors: { origin: "http://localhost:5173" },
        });

        // Handle frame updates
        socketRef.current.on("frame_update", (data) => {
            if (isStreaming) {
                setLastFrame(`data:image/jpeg;base64,${data.frame}`);
                if (imageRef.current) {
                    imageRef.current.src = `data:image/jpeg;base64,${data.frame}`;
                }
                setDetections(data.detections);
            }
        });

        // Handle errors
        socketRef.current.on("error", (data) => {
            console.error("Stream error:", data.error);
        });

        return () => {
            if (isStreaming) {
                socketRef.current.emit("stop_stream");
            }
            socketRef.current.disconnect();
        };
    }, [isStreaming]);

    const toggleStream = () => {
        if (isStreaming) {
            setIsStreaming(false);
            socketRef.current.emit("stop_stream");
        } else {
            socketRef.current.emit("start_stream");
            setIsStreaming(true);
        }
    };

    const toggleDebug = () => {
        socketRef.current.emit("toggle_debug");
        setIsDebugMode(!isDebugMode);
    };

    const toggleCoordinator = () => {
        socketRef.current.emit("toggle_coordinator");
        setCurrentCoordinator(currentCoordinator === "Main" ? "OpenCV" : "Main");
    };

    // const resetFrame = () => {
    //     if (lastFrame && imageRef.current) {
    //         imageRef.current.src = lastFrame; // Show last frame
    //     }
    // };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6 flex gap-4">
                <button
                    onClick={toggleStream}
                    className={`px-4 py-2 rounded-lg ${isStreaming ? "bg-red-500" : "bg-green-500"
                        } text-white font-medium`}
                >
                    {isStreaming ? "Stop Camera" : "Start Camera"}
                </button>

                <button
                    onClick={toggleDebug}
                    className={`px-4 py-2 rounded-lg ${isDebugMode ? "bg-blue-500" : "bg-gray-500"
                        } text-white font-medium`}
                >
                    Debug Mode: {isDebugMode ? "ON" : "OFF"}
                </button>

                <button
                    onClick={toggleCoordinator}
                    className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium"
                >
                    {/* Using: {currentCoordinator} */}
                </button>

                {/* {!isStreaming && lastFrame && (
                    <button
                        onClick={resetFrame}
                        className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-medium"
                    >
                        Reset Frame
                    </button>
                )} */}
            </div>

            {isStreaming && (
                <div className="flex flex-col gap-6">
                    <div
                        className="bg-black rounded-lg overflow-hidden"
                        style={{ width: "1200px", height: "700px" }}
                    >
                        <img
                            ref={imageRef}
                            alt="Video Stream"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* <div className="bg-gray-100 p-4 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">Detections</h2>
                        <div className="space-y-2 overflow-auto max-h-96">
                            {detections.map((detection, index) => (
                                <div key={index} className="bg-white p-3 rounded shadow text-sm">
                                    <p className="font-medium">Detection {index + 1}</p>
                                    <p>Class: {detection.class}</p>
                                    <p>Mask Confidence: {(detection.mask_confidence * 100).toFixed(2)}%</p>
                                    <p>No Mask Confidence: {(detection.no_mask_confidence * 100).toFixed(2)}%</p>
                                </div>
                            ))}
                        </div>
                    </div> */}
                </div>
            )}
        </div>
    );
};

export default Web;
