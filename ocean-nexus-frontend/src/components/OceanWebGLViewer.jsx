
import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';

export default function OceanWebGLViewer({ trajectoryData = [] }) {
  const [hoverInfo, setHoverInfo] = useState(null);

  // Fallback sample points if data hasn't loaded yet, matching backend keys
  const safeData = trajectoryData && trajectoryData.length > 0 ? trajectoryData : [
    { depth: 0, temp: 29.8, salinity: 34.5, lat: 13.08, lng: 80.27, timestamp: "2026-09-01" },
    { depth: 100, temp: 24.1, salinity: 34.8, lat: 13.08, lng: 80.27, timestamp: "2026-09-01" },
    { depth: 500, temp: 12.4, salinity: 35.0, lat: 13.08, lng: 80.27, timestamp: "2026-09-01" }
  ];

  // Map 4D data: X = Longitude, Y = Latitude, Z = Negative Depth for 3D subsurface descent
  const points = safeData.map((d, i) => ({
    coordinates: [d.lng, d.lat, -(d.depth || 0) * 4],
    temp: d.temp,
    salinity: d.salinity,
    depth: d.depth,
    time: d.timestamp,
    nextCoord: i < safeData.length - 1 ? [safeData[i+1].lng, safeData[i+1].lat, -(safeData[i+1].depth || 0) * 4] : null
  }));

  // Build connecting lines for the 3D descending profile trajectory
  const lineSegments = points.filter(p => p.nextCoord !== null).map(p => ({
    sourcePosition: p.coordinates,
    targetPosition: p.nextCoord,
    temp: p.temp
  }));

  const initialViewState = {
    longitude: safeData[0]?.lng || 80.27,
    latitude: safeData[0]?.lat || 13.08,
    zoom: 6,
    pitch: 50,
    bearing: -30
  };

  const layers = [
    // 3D Subsurface Descent Path Line Layer
    new LineLayer({
      id: 'subsurface-path',
      data: lineSegments,
      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,
      getColor: [6, 182, 212, 200], // Cyan glowing trajectory line
      getWidth: 4,
      widthMinPixels: 3
    }),
    // 4D Telemetry Nodes (Depth, Temp, Lat, Lng)
    new ScatterplotLayer({
      id: 'argo-nodes-layer',
      data: points,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 8,
      radiusMinPixels: 6,
      radiusMaxPixels: 18,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => 12 + (d.depth / 25),
      getFillColor: d => [
        Math.min(255, Math.max(0, (d.temp - 10) * 12)), // Thermal Red intensity
        80,
        Math.min(255, Math.max(0, 255 - (d.temp * 8)))  // Blue thermal balance
      ],
      getLineColor: [255, 255, 255],
      onHover: info => setHoverInfo(info)
    })
  ];

  return (
    <div style={{ position: 'relative', height: '460px', width: '100%', background: '#090d16', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 5, pointerEvents: 'none' }}>
        <h4 style={{ color: '#38bdf8', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>WebGL 4D Oceanographic Engine</h4>
        <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '11px' }}>Lat / Lng / Depth Subsurface Trajectory & Thermal Gradient</p>
      </div>

      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        views={new MapView({ repeat: true })}
      />

      {/* Real-time Hover Inspector Card */}
      {hoverInfo && hoverInfo.object && (
        <div style={{
          position: 'absolute',
          zIndex: 10,
          pointerEvents: 'none',
          left: hoverInfo.x + 12,
          top: hoverInfo.y + 12,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #38bdf8',
          padding: '10px 14px',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>ARGO Telemetry Node</div>
          <div><strong>Depth:</strong> {hoverInfo.object.depth} m</div>
          <div><strong>Temperature:</strong> {hoverInfo.object.temp} °C</div>
          <div><strong>Salinity:</strong> {hoverInfo.object.salinity} PSU</div>
          <div><strong>Position:</strong> {hoverInfo.object.lat.toFixed(2)}°N, {hoverInfo.object.lng.toFixed(2)}°E</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Time: {hoverInfo.object.time}</div>
        </div>
      )}
    </div>
  );
}