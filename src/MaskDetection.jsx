import React, { useState, useRef, useEffect } from 'react';
import Web from './Web';

const MaskDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detectionStats, setDetectionStats] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const processingRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastProcessedTimeRef = useRef(0);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
      setDetectionResult(null);
      setDetectionStats(null);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setDetectionResult(null);
    setDetectionStats(null);
  };

  const processImage = async (imageData) => {
    try {
      const currentTime = Date.now();
      // Process every 3rd frame and ensure at least 50ms has passed
      if (frameCountRef.current % 3 !== 0 ||
        currentTime - lastProcessedTimeRef.current < 50) {
        return null;
      }

      lastProcessedTimeRef.current = currentTime;

      const response = await fetch('http://localhost:5000/webcam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Detection failed');
      }

      if (data.success) {
        setDetectionResult(data.image);
        setDetectionStats(data.detections);
        return data;
      } else {
        throw new Error(data.error || 'Detection failed');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      return null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      await processImage(reader.result);
      setIsLoading(false);
    };
    reader.readAsDataURL(selectedFile);
  };

  const startWebcam = async () => {
    try {
      if (streamRef.current) {
        stopWebcam();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null);
        frameCountRef.current = 0;
        lastProcessedTimeRef.current = 0;
      }
    } catch (err) {
      setError('Error accessing webcam: ' + err.message);
      setIsStreaming(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsStreaming(false);
      setDetectionResult(null);
      setDetectionStats(null);
    }
  };

  const processWebcamFrame = async () => {
    if (!videoRef.current || !isStreaming || processingRef.current) return;

    frameCountRef.current += 1;

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const video = videoRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas to a data URL
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Process the frame if ready
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        processingRef.current = true;
        await processImage(imageData);
        processingRef.current = false;
      }
    } catch (error) {
      console.error('Error processing webcam frame:', error);
      processingRef.current = false;
    }
  };

  useEffect(() => {
    let animationFrameId;

    const processFrame = () => {
      processWebcamFrame();
      if (isStreaming) {
        animationFrameId = requestAnimationFrame(processFrame);
      }
    };

    if (isStreaming) {
      processFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isStreaming]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const renderDetectionStats = () => {
    if (!detectionStats) return null;

    const classNames = {
      0: 'With Mask',
      1: 'No Mask',
      2: 'Incorrect Mask'
    };

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Detection Results:</h4>
        {detectionStats.map((det, idx) => (
          <div key={idx} className="text-sm">
            {classNames[det.class]}: {(det.confidence * 100).toFixed(1)}% confidence
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 flex justify-center">Mask Detection System</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isLoading ? 'Processing...' : 'Detect Masks'}
              </button>
            </div>

            <button
              onClick={resetUpload}
              disabled={!selectedFile}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
            >
              Reset
            </button>


          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Input Feed</h3>
              <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
                {isStreaming ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : preview ? (
                  <img
                    src={preview}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No image selected
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Detection Results</h3>
              <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
                {detectionResult ? (
                  <div className="relative h-full">
                    <img
                      src={detectionResult}
                      alt="Detection result"
                      className="w-full h-full object-cover"
                      style={isStreaming ? { transform: 'scaleX(-1)' } : {}}
                    />
                    {/* <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50">
                      {renderDetectionStats()}
                    </div> */}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    {isLoading ? 'Processing...' : 'No detections yet'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          {/* {isStreaming && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Performance Information:</h4>
              <div className="text-sm text-gray-600">
                • Processing every 3rd frame to maintain performance
                <br />
                • Minimum 50ms delay between frame processing
                <br />
                • Mirror effect applied for natural webcam interaction
              </div>
            </div>
          )} */}
        </div>
      </div>

      <div className='h-fit'>
        <Web />
      </div>
    </div>
  );
};

export default MaskDetection;