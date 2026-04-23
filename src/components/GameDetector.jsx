import React, { useEffect, useRef, useState } from 'react';
import {
  initializeModel,
  detectObjects,
  classifyBoxes,
  drawDetections,
  calculateSafeZones,
  drawSafeZones,
  getPerformanceMetrics
} from '../utils/gameDetector';
import './GameDetector.css';

const GameDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detections, setDetections] = useState({ bombs: [], xMarks: [], safe: [] });
  const [metrics, setMetrics] = useState({ latency: 0, fps: 0 });
  const [isDetecting, setIsDetecting] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeModel();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsLoading(false);
            startDetection();
          };
        }
      } catch (err) {
        setError(`Initialization error: ${err.message}`);
        setIsLoading(false);
      }
    };
    initializeApp();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startDetection = async () => {
    const detect = async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const startTime = performance.now();
        try {
          const predictions = await detectObjects(videoRef.current);
          const classified = classifyBoxes(predictions);
          const ctx = canvasRef.current.getContext('2d');
          drawDetections(ctx, predictions);
          if (showSafeZones) {
            const safeZones = calculateSafeZones(canvasRef.current.width, canvasRef.current.height, predictions);
            drawSafeZones(ctx, safeZones);
          }
          setDetections(classified);
          setMetrics(getPerformanceMetrics(startTime));
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    animationFrameRef.current = requestAnimationFrame(detect);
    setIsDetecting(true);
  }; 

  const toggleSafeZones = () => {
    setShowSafeZones(!showSafeZones);
  };

  const downloadResults = () => {
    const results = {
      timestamp: new Date().toISOString(),
      bombs: detections.bombs.length,
      xMarks: detections.xMarks.length,
      safeSpaces: detections.safe.length,
      metrics: metrics
    };
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detection_results_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="game-detector">
      <header className="header">
        <h1>🎮 Real-Time Bomb & X Mark Detector</h1>
        <p>Detects dangerous zones and shows safe spaces in real-time</p>
      </header>
      {isLoading && <div className="loading">Initializing AI model and camera...</div>}
      {error && <div className="error">Error: {error}</div>}
      <div className="container">
        <div className="video-container">
          <video ref={videoRef} className="video" style={{ display: 'none' }} />
          <canvas
            ref={canvasRef}
            className="canvas"
            width={1280}
            height={720}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        </div>
        <div className="sidebar">
          <div className="stats">
            <h2>Real-Time Stats</h2>
            <div className="stat-item">
              <span className="stat-label">🔴 Bombs Detected:</span>
              <span className="stat-value">{detections.bombs.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">⚠️ X Marks:</span>
              <span className="stat-value">{detections.xMarks.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">✅ Safe Spaces:</span>
              <span className="stat-value">{detections.safe.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">⚡ Latency:</span>
              <span className="stat-value">{metrics.latency}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">📊 FPS:</span>
              <span className="stat-value">{metrics.fps}</span>
            </div>
          </div>
          <div className="controls">
            <h2>Controls</h2>
            <button
              className={`btn ${showSafeZones ? 'active' : ''}`}
              onClick={toggleSafeZones}
            >
              {showSafeZones ? '👁️ Hide Safe Zones' : '👁️ Show Safe Zones'}
            </button>
            <button className="btn" onClick={downloadResults}>
              💾 Download Results
            </button>
          </div>
          <div className="legend">
            <h2>Legend</h2>
            <div className="legend-item">
              <span className="color-red">■</span> <span>Bombs (Red)</span>
            </div>
            <div className="legend-item">
              <span className="color-yellow">■</span> <span>X Marks (Yellow)</span>
            </div>
            <div className="legend-item">
              <span className="color-green">■</span> <span>Safe Zones (Green)</span>
            </div>
          </div>
        </div>
      </div>
      <footer className="footer">
        <p>💡 Point your camera at objects to detect bombs and safe spaces in real-time!</p>
      </footer>
    </div>
  );
};

export default GameDetector;