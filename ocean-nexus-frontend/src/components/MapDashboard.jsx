import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';
import {
  Sparkles,
  Database,
  Layers,
  Bot,
  Compass,
  ArrowLeft,
  Cpu,
  Activity,
  BarChart3,
  Globe,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Thermometer,
  Droplets,
  MapPin
} from 'lucide-react';
import axios from 'axios';

const MapDashboard = ({ onBack }) => {
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Time animation states
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Depth exaggeration
  const [depthScale, setDepthScale] = useState(3);

  const [argoFloats, setArgoFloats] = useState([]);

  /*
    Fetch ARGO data from backend.
    Expected response:
    {
      data: [
        {
          float_id: "...",
          trajectory_4d: [...]
        }
      ]
    }
  */
  useEffect(() => {
    const fetchArgoData = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          'http://127.0.0.1:8000/api/v1/chat',
          {
            params: {
              q: 'Show ARGO temperature and salinity trajectory'
            }
          }
        );

        const payload = response.data?.dashboard_payload;

        const payloadArray = Array.isArray(payload)
          ? payload
          : payload
            ? [payload]
            : [];

        const formattedFloats = payloadArray
          .map((item, index) => {
            const trajectory = item.trajectory_4d || [];

            return {
              id: item.float_id || `ARGO-FLOAT-${index + 1}`,
              title: item.title || 'ARGO Float',
              region: item.region || 'Ocean Region',
              trajectory_4d: trajectory
            };
          })
          .filter(float => float.trajectory_4d.length > 0);

        setArgoFloats(formattedFloats);
      } catch (error) {
        console.error('Unable to load ARGO data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArgoData();
  }, []);

  /*
    Normalize all trajectory records.
    Supports both:
    lat/lng and latitude/longitude
    temp and temperature
  */
  const normalizedFloats = useMemo(() => {
    return argoFloats.map(float => {
      const trajectory = float.trajectory_4d
        .map((point, index) => ({
          id: `${float.id}-${index}`,

          lat: Number(point.lat ?? point.latitude),
          lng: Number(
            point.lng ??
            point.longitude ??
            point.lon
          ),

          depth: Number(point.depth ?? 0),

          temp: Number(
            point.temp ??
            point.temperature ??
            0
          ),

          salinity: Number(
            point.salinity ??
            point.psu ??
            0
          ),

          time: point.time || point.timestamp || ''
        }))
        .filter(
          point =>
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng)
        )
        .sort((a, b) => {
          const firstTime = new Date(a.time).getTime();
          const secondTime = new Date(b.time).getTime();

          if (
            Number.isFinite(firstTime) &&
            Number.isFinite(secondTime)
          ) {
            return firstTime - secondTime;
          }

          return 0;
        });

      return {
        ...float,
        trajectory
      };
    });
  }, [argoFloats]);

  /*
    Find the largest number of observations.
  */
  const maxTimeIndex = Math.max(
    ...normalizedFloats.map(float => float.trajectory.length),
    1
  ) - 1;

  const safeTimeIndex = Math.min(
    Math.max(Number(timeIndex), 0),
    maxTimeIndex
  );

  /*
    Build visible points until selected time.
  */
  const visiblePoints = useMemo(() => {
    const points = [];

    normalizedFloats.forEach(float => {
      const visibleTrajectory = float.trajectory.slice(
        0,
        safeTimeIndex + 1
      );

      visibleTrajectory.forEach(point => {
        points.push({
          ...point,
          floatId: float.id,
          floatTitle: float.title,
          region: float.region,

          // Depth is shown below the ocean surface.
          coordinates: [
            point.lng,
            point.lat,
            -Math.abs(point.depth) * depthScale
          ]
        });
      });
    });

    return points;
  }, [normalizedFloats, safeTimeIndex, depthScale]);

  /*
    Current point for every float.
  */
  const currentPoints = useMemo(() => {
    return normalizedFloats
      .map(float => {
        const point =
          float.trajectory[safeTimeIndex] ||
          float.trajectory[float.trajectory.length - 1];

        if (!point) return null;

        return {
          ...point,
          floatId: float.id,
          floatTitle: float.title,
          region: float.region,

          coordinates: [
            point.lng,
            point.lat,
            -Math.abs(point.depth) * depthScale
          ]
        };
      })
      .filter(Boolean);
  }, [normalizedFloats, safeTimeIndex, depthScale]);

  /*
    Build trajectory line segments.
  */
  const lineSegments = useMemo(() => {
    const segments = [];

    normalizedFloats.forEach(float => {
      const visibleTrajectory = float.trajectory.slice(
        0,
        safeTimeIndex + 1
      );

      for (let index = 0; index < visibleTrajectory.length - 1; index++) {
        const source = visibleTrajectory[index];
        const target = visibleTrajectory[index + 1];

        segments.push({
          sourcePosition: [
            source.lng,
            source.lat,
            -Math.abs(source.depth) * depthScale
          ],

          targetPosition: [
            target.lng,
            target.lat,
            -Math.abs(target.depth) * depthScale
          ],

          floatId: float.id
        });
      }
    });

    return segments;
  }, [normalizedFloats, safeTimeIndex, depthScale]);

  /*
    Play/Pause animation.
    One observation moves every 1 second.
  */
  useEffect(() => {
    if (!isPlaying || maxTimeIndex <= 0) {
      return;
    }

    const animationTimer = setInterval(() => {
      setTimeIndex(previousIndex => {
        const nextIndex = Number(previousIndex) + 1;

        if (nextIndex >= maxTimeIndex) {
          setIsPlaying(false);
          return maxTimeIndex;
        }

        return nextIndex;
      });
    }, 1000);

    return () => clearInterval(animationTimer);
  }, [isPlaying, maxTimeIndex]);

  /*
    Reset animation when new data arrives.
  */
  useEffect(() => {
    setTimeIndex(0);
    setIsPlaying(false);
  }, [normalizedFloats.length]);

  /*
    Selected observation.
  */
  const activePoint = currentPoints[0] || null;

  /*
    DeckGL camera.
  */
  const initialViewState = {
    longitude: 78.0,
    latitude: 12.0,
    zoom: 5,
    pitch: 55,
    bearing: -20
  };

  /*
    WebGL layers.
    LineLayer connects trajectory points.
    ScatterplotLayer renders current observations.
  */
  const layers = [
    new LineLayer({
      id: 'trajectory-line',
      data: lineSegments,

      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,

      getColor: [6, 182, 212, 190],
      getWidth: 5,
      widthMinPixels: 3,

      pickable: false
    }),

    new ScatterplotLayer({
      id: 'argo-current-observations',
      data: currentPoints,

      pickable: true,
      opacity: 0.95,
      stroked: true,
      filled: true,

      radiusScale: 6,
      radiusMinPixels: 8,
      radiusMaxPixels: 24,

      lineWidthMinPixels: 2,

      getPosition: d => d.coordinates,

      getRadius: d => 15 + Math.abs(d.depth) / 15,

      getFillColor: d => {
        if (d.temp >= 29) {
          return [239, 68, 68, 235];
        }

        return [6, 182, 212, 235];
      },

      getLineColor: [255, 255, 255],

      onClick: info => {
        if (info.object) {
          setSelectedFloat(info.object);
        }
      },

      onHover: info => setHoverInfo(info)
    })
  ];

  const formattedCurrentDate = activePoint?.time
    ? new Date(activePoint.time).toLocaleString()
    : 'No time selected';

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden relative">

      {/* HEADER */}
      <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/30 px-6 flex items-center justify-between z-20 shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-xs text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1.5 rounded-full bg-cyan-950/60 flex items-center gap-1.5 cursor-pointer transition-all hover:bg-cyan-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Landing
          </button>

          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            Ocean Nexus 4D WebGL Engine
          </h1>
        </div>

        <div className="flex items-center gap-5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            FastAPI PostGIS Active
          </span>

          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            4D Time Engine Active
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative z-10 min-h-0">

        <div className="flex-1 flex gap-4 min-h-0">

          {/* WEBGL MAP */}
          <div className="flex-1 bg-slate-900/40 rounded-xl border border-cyan-500/30 overflow-hidden flex flex-col relative shadow-lg min-w-0">

            <div className="bg-slate-900 px-4 py-2 border-b border-cyan-500/30 flex items-center justify-between z-20 shrink-0">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                4D ARGO TRAJECTORY VIEW
              </span>

              <span className="text-[10px] text-cyan-400 font-mono">
                {activePoint
                  ? `${activePoint.lat.toFixed(3)}°N | ${activePoint.lng.toFixed(3)}°E`
                  : 'Waiting for telemetry'}
              </span>
            </div>

            <div className="flex-1 relative w-full h-full min-h-0">

              <DeckGL
                initialViewState={initialViewState}
                controller={true}
                layers={layers}
                views={new MapView({ repeat: true })}
              />

              {/* HOVER TOOLTIP */}
              {hoverInfo && hoverInfo.object && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 30,
                    pointerEvents: 'none',
                    left: hoverInfo.x + 12,
                    top: hoverInfo.y + 12,
                    background: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid #38bdf8',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div className="font-bold text-cyan-400">
                    {hoverInfo.object.floatId}
                  </div>

                  <div>
                    Time: {hoverInfo.object.time || 'N/A'}
                  </div>

                  <div>
                    Depth: {hoverInfo.object.depth} m
                  </div>

                  <div>
                    Temperature: {hoverInfo.object.temp} °C
                  </div>

                  <div>
                    Salinity: {hoverInfo.object.salinity} PSU
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20">
                  <div className="text-cyan-300 text-sm animate-pulse">
                    Loading ARGO trajectory data...
                  </div>
                </div>
              )}

            </div>

            {/* TIME CONTROLS */}
            <div className="bg-slate-900 border-t border-cyan-500/30 px-4 py-3 shrink-0">

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-cyan-400" />

                <span className="text-xs text-slate-400 font-mono">
                  TIME
                </span>

                <button
                  onClick={() => {
                    if (maxTimeIndex <= 0) return;

                    if (safeTimeIndex >= maxTimeIndex) {
                      setTimeIndex(0);
                    }

                    setIsPlaying(previous => !previous);
                  }}
                  disabled={maxTimeIndex <= 0}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Play
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setTimeIndex(0);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>

                <input
                  type="range"
                  min="0"
                  max={maxTimeIndex}
                  step="1"
                  value={safeTimeIndex}
                  onChange={event => {
                    setIsPlaying(false);
                    setTimeIndex(Number(event.target.value));
                  }}
                  disabled={maxTimeIndex <= 0}
                  className="flex-1 accent-cyan-500 cursor-pointer disabled:opacity-40"
                />

                <span className="text-xs text-cyan-300 font-mono min-w-[100px] text-right">
                  {safeTimeIndex + 1} / {maxTimeIndex + 1}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                <span>
                  {formattedCurrentDate}
                </span>

                <span>
                  {activePoint
                    ? `Depth: ${activePoint.depth}m`
                    : 'No observation selected'}
                </span>
              </div>

            </div>
          </div>

          {/* DEPTH AND OBSERVATION PANEL */}
          <div className="w-[420px] bg-slate-900/80 rounded-xl border border-cyan-500/30 overflow-hidden flex flex-col relative shadow-lg shrink-0">

            <div className="bg-slate-900 px-4 py-3 border-b border-cyan-500/30">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                CURRENT OBSERVATION
              </span>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">

              {activePoint ? (
                <>
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-cyan-400/40">
                    <div className="text-xs text-cyan-300 font-bold mb-3">
                      {activePoint.floatId}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          <MapPin className="inline w-3.5 h-3.5 mr-1" />
                          Latitude
                        </span>

                        <b className="text-cyan-400">
                          {activePoint.lat.toFixed(4)}°
                        </b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Longitude
                        </span>

                        <b className="text-cyan-400">
                          {activePoint.lng.toFixed(4)}°
                        </b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Time
                        </span>

                        <b className="text-slate-200 text-xs">
                          {formattedCurrentDate}
                        </b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Depth
                        </span>

                        <b className="text-emerald-400">
                          {activePoint.depth} m
                        </b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          <Thermometer className="inline w-3.5 h-3.5 mr-1" />
                          Temperature
                        </span>

                        <b className="text-cyan-400">
                          {activePoint.temp} °C
                        </b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          <Droplets className="inline w-3.5 h-3.5 mr-1" />
                          Salinity
                        </span>

                        <b className="text-emerald-400">
                          {activePoint.salinity} PSU
                        </b>
                      </div>
                    </div>
                  </div>

                  {/* DEPTH SCALE CONTROL */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">
                        Depth exaggeration
                      </span>

                      <span className="text-cyan-400 font-mono">
                        {depthScale}x
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={depthScale}
                      onChange={event =>
                        setDepthScale(Number(event.target.value))
                      }
                      className="w-full accent-cyan-500"
                    />

                    <p className="text-[10px] text-slate-500 mt-2">
                      Higher values make underwater depth easier to see in the 3D view.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400 text-center py-10">
                  No ARGO observation available.
                </div>
              )}

            </div>

            <div className="mt-auto p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              Time-enabled ARGO telemetry
            </div>
          </div>

        </div>

        {/* STATUS BAR */}
        <div className="h-12 bg-slate-900/80 rounded-xl border border-cyan-500/30 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="w-4 h-4 text-cyan-400" />
            {normalizedFloats.length} float dataset loaded
          </div>

          <div className="text-xs text-cyan-300 font-mono">
            {isPlaying ? 'TIME ANIMATION RUNNING' : 'TIME ANIMATION PAUSED'}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MapDashboard;