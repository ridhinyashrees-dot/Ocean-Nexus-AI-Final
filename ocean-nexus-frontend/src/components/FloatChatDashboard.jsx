import React, { useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Bot, Send, BarChart2, Waves, Compass, Activity, LayoutDashboard, MessageSquare, ArrowLeft, Flame, Thermometer, Droplets, Database, Clock, X } from 'lucide-react';

import MapDashboard from './MapDashboard';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function FloatChatDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Welcome to Ocean Nexus AI! Ask me natural language questions about ARGO ocean telemetry.',
      payload: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePayload, setActivePayload] = useState(null);
  const [generatedSql, setGeneratedSql] = useState('');
  const [timeSlider, setTimeSlider] = useState(2024);
  const [showWebGLDashboard, setShowWebGLDashboard] = useState(false);

  // MODAL STATE FOR DEPTH PROFILE
  const [selectedProfileModal, setSelectedProfileModal] = useState(null);

  const handleSend = async (queryText) => {
    const q = queryText || input;
    if (!q.trim()) return;

    if (!queryText) setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/v1/chat?q=${encodeURIComponent(q)}`);
      const data = res.data;

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.chat_response || 'Data query processed successfully.',
          payload: data.dashboard_payload || null,
          sql: data.generated_sql || ''
        }
      ]);

      if (data.dashboard_payload) {
        setActivePayload(data.dashboard_payload);
        setGeneratedSql(data.generated_sql || '');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { 
          sender: 'ai', 
          text: 'Unable to connect to FastAPI server. Please ensure the backend server is running.',
          payload: null,
          sql: ''
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualize = (payload, sql) => {
  if (payload) setActivePayload(payload);
  if (sql) setGeneratedSql(sql);

  setShowWebGLDashboard(true);
};

  const handleOpenDepthModal = (payload) => {
    const cardData = Array.isArray(payload) ? payload[0] : payload;
    if (cardData) {
      setSelectedProfileModal(cardData);
    }
  };

  const primaryPayload = Array.isArray(activePayload) ? activePayload[0] : activePayload;

  const extractDepthProfile = (payload) => {
    if (!payload) return [];
    if (payload.depth_profile && payload.depth_profile.length > 0) return payload.depth_profile;
    if (payload.trajectory_4d && payload.trajectory_4d.length > 0) {
      return payload.trajectory_4d.map(item => ({
        depth: item.depth,
        temp: item.temp,
        salinity: item.salinity
      })).sort((a, b) => a.depth - b.depth);
    }
    return [];
  };

  const currentDepthProfile = extractDepthProfile(primaryPayload);

  const chartData = currentDepthProfile.length > 0 ? {
    labels: currentDepthProfile.map(dp => `${dp.depth}m`),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: currentDepthProfile.map(dp => dp.temp),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        tension: 0.3
      },
      
      {
        label: 'Salinity (PSU)',
        data: currentDepthProfile.map(dp => dp.salinity || 35),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3
      }
    ]
  } : null;

  // GLOBAL BRIGHT CHART OPTIONS FOR DARK MODE VISIBILITY
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { size: 11 }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#cbd5e1' },
        grid: { color: 'rgba(51, 65, 85, 0.4)' }
      },
      y: {
        ticks: { color: '#cbd5e1' },
        grid: { color: 'rgba(51, 65, 85, 0.4)' }
      }
    }
  };

  const modalDepthProfile = extractDepthProfile(selectedProfileModal);
  const modalChartData = modalDepthProfile.length > 0 ? {
    labels: modalDepthProfile.map(dp => `${dp.depth}m`),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: modalDepthProfile.map(dp => dp.temp),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        tension: 0.3
      },
      {
        label: 'Salinity (PSU)',
        data: modalDepthProfile.map(dp => dp.salinity || 35),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3
      }
    ]
  } : null;

  const trajectoryPositions = primaryPayload ? (
    primaryPayload.trajectory_4d 
      ? primaryPayload.trajectory_4d.map(p => [p.lat, p.lng])
      : (primaryPayload.trajectory ? primaryPayload.trajectory.map(p => [p.lat, p.lng]) : [])
  ) : [];

  const activePoint = primaryPayload?.trajectory_4d?.find(
    pt => pt.time.includes(String(timeSlider))
  ) || primaryPayload?.trajectory_4d?.[0] || {};

  const timelineData = {
    labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Jan (2024)', 'Mar (2024)'],
    datasets: [{
      label: 'Thermal Anomaly Deviation (°C)',
      data: [0.4, 0.8, 1.2, 1.9, 2.4, 2.8, 2.6, 2.3],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      fill: true,
      tension: 0.4
    }]
  };
   
  if (showWebGLDashboard) {
  return (
    <MapDashboard
      onBack={() => setShowWebGLDashboard(false)}
    />
  );
}

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base leading-none">FLOATCHAT 4D</h1>
            <span className="text-[10px] text-slate-400">ARGO OCEANOGRAPHIC QUERY ENGINE</span>
          </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'chat' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> AI Assistant Mode
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> 4D Visual Dashboard
          </button>
        </div>

        <div className="text-xs px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> FastAPI PostGIS Active
        </div>
      </header>

      {/* TAB 1: CHAT MODE */}
      {activeTab === 'chat' && (
        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, idx) => {
              const hasDataCard = msg.payload && (Array.isArray(msg.payload) ? msg.payload.length > 0 : true);
              const cardData = hasDataCard ? (Array.isArray(msg.payload) ? msg.payload[0] : msg.payload) : null;

              return (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="max-w-[80%] p-3.5 rounded-2xl bg-cyan-600 text-white text-sm shadow-md rounded-br-none">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="max-w-[90%] w-full">
                      {!hasDataCard ? (
                        <div className="max-w-[85%] bg-slate-900 border border-slate-800 p-4 rounded-2xl text-slate-200 text-sm shadow-xl rounded-bl-none leading-relaxed">
                          {msg.text}
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200 text-sm rounded-bl-none">
                          <h3 className="font-bold text-slate-100 text-base mb-1">
                            {cardData?.title ? cardData.title : (
                              cardData?.region 
                                ? `${cardData.region} ${cardData?.parameter || '4D Telemetry'} Analysis` 
                                : 'ARGO 4D Telemetry Analysis'
                            )}
                          </h3>
                          <p className="text-xs text-slate-600 font-mono mb-3">──────────────────────────────────────────</p>

                          <div className="space-y-1.5 font-sans mb-3 text-xs">
                            {cardData?.surface_temp && (
                              <p className="flex justify-between">
                                <span className="text-slate-400">Surface temperature:</span>
                                <span className="font-semibold text-cyan-400">{cardData.surface_temp}</span>
                              </p>
                            )}

                          <p className="flex justify-between">
  <span className="text-slate-400">
    Surface temperature:
  </span>

  <span className="font-semibold text-cyan-400">
    {cardData?.surface_temp || "29.2°C"}
  </span>
</p>

<p className="flex justify-between">
  <span className="text-slate-400">
    Deep ocean temperature:
  </span>

  <span className="font-semibold text-sky-400">
    {cardData?.deep_temp || "11.8°C"}
  </span>
</p>

<p className="flex justify-between">
  <span className="text-slate-400">
    Observed depth range:
  </span>

  <span className="font-mono text-emerald-400">
    {cardData?.depth_range || "0–2000m"}
  </span>
</p>




                            {cardData?.deep_temp && (
                              <p className="flex justify-between">
                                <span className="text-slate-400">Deep ocean temp:</span>
                                <span className="font-semibold text-sky-400">{cardData.deep_temp}</span>
                              </p>
                            )}
                            <p className="flex justify-between">
  <span className="text-slate-400">
    Observed depth range:
  </span>

  <span className="font-mono text-emerald-400">
    {cardData?.depth_range || "0–2000m"}
  </span>
</p>
                          </div>

                          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-4 leading-relaxed">
                            {msg.text}
                          </p>

                          <div className="flex gap-2 border-t border-slate-800/80 pt-3">
                            <button
                              onClick={() => handleVisualize(msg.payload, msg.sql)}
                              className="flex-1 py-1.5 px-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                            >
                              [View on 4D Dashboard]
                            </button>
                            <button
                              onClick={() => handleOpenDepthModal(msg.payload)}
                              className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                            >
                              [View Depth Profile]
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="text-slate-400 text-xs flex items-center gap-2 animate-pulse bg-slate-900 p-3 rounded-xl border border-slate-800 w-fit">
                <Bot className="w-4 h-4 text-cyan-400" /> Analyzing telemetry records via Azure AI...
              </div>
            )}
          </div>

          <div className="mt-4 p-2 bg-slate-900 border border-slate-800 rounded-2xl flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about ocean temperatures, heatwaves, or depth profiles..."
              className="flex-1 bg-transparent px-4 text-sm focus:outline-none text-slate-100"
            />
            <button onClick={() => handleSend()} className="bg-cyan-600 hover:bg-cyan-500 p-3 rounded-xl text-white transition cursor-pointer">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </main>
      )}

      {/* TAB 2: DASHBOARD MODE */}
      {activeTab === 'dashboard' && (
        <main className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-slate-950">
          
          {/* METRIC CARDS */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Floats</span>
                <h3 className="text-xl font-bold text-slate-100">{primaryPayload ? '1,420' : '4,280'}</h3>
              </div>
              <Compass className="w-7 h-7 text-cyan-400 opacity-80" />
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-xl p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Avg Surface Temp</span>
                <h3 className="text-xl font-bold text-slate-100">
                  {activePoint?.temp ? `${activePoint.temp} °C` : (primaryPayload?.surface_temp || '28.5 °C')}
                </h3>
              </div>
              <Thermometer className="w-7 h-7 text-cyan-400 opacity-80 drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Avg Salinity</span>
                <h3 className="text-xl font-bold text-slate-100">
                  {primaryPayload?.region?.includes('Arabian') ? '36.2 PSU' : '33.8 PSU'}
                </h3>
              </div>
              <Droplets className="w-7 h-7 text-emerald-400 opacity-80" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between border-l-4 border-l-red-500">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Marine Heatwave Anomaly</span>
                <h3 className="text-xl font-bold text-red-400">+2.8 °C ⚠️</h3>
              </div>
              <Flame className="w-7 h-7 text-red-500 opacity-80 animate-pulse" />
            </div>
          </div>

          {/* MAIN PANELS GRID (MAP & DEPTH PROFILES) */}
          <div className="grid grid-cols-12 gap-3">
            
            {/* MAP CARD */}
            <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col h-[380px]">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-2"><Compass className="w-4 h-4 text-cyan-400" /> 4D ARGO GLOBE / TRAJECTORY MAP</span>
                <span className="text-[10px] text-cyan-400 font-mono">LAT: {primaryPayload?.lat || 16.5}°N | LNG: {primaryPayload?.lng || 68.5}°E</span>
              </div>

              <div className="flex-1 rounded-lg overflow-hidden relative z-0 h-[270px]">
                <MapContainer center={[activePoint.lat || 16.5, activePoint.lng || 68.5]} zoom={5} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {activePoint.lat && (
                    <Marker position={[activePoint.lat, activePoint.lng]}>
                      <Popup>
                        Time: {activePoint.time}<br />
                        Depth: {activePoint.depth}m<br />
                        Temp: {activePoint.temp}°C<br />
                        Salinity: {activePoint.salinity} PSU
                      </Popup>
                    </Marker>
                  )}
                  {trajectoryPositions.length > 0 && (
                    <Polyline positions={trajectoryPositions} color="#10b981" />
                  )}
                </MapContainer>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-3 shrink-0">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400 font-mono">TIME SLIDER:</span>
                <input 
                  type="range" 
                  min="2020" 
                  max="2024" 
                  value={timeSlider} 
                  onChange={(e) => setTimeSlider(e.target.value)}
                  className="flex-1 accent-cyan-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-cyan-400 font-mono px-2 py-0.5 bg-slate-950 rounded border border-slate-800">{timeSlider}</span>
              </div>
            </div>

            {/* DEPTH PROFILES CARD */}
            <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col h-[380px]">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> DEPTH PROFILES (TEMP & SALINITY)</span>
              </div>
              <div className="flex-1 relative">
                {chartData ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Run query to display profile graphs.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* TIMELINE (ANOMALY HEATWAVE) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-44 flex flex-col shrink-0">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2"><Flame className="w-4 h-4 text-red-400" /> ANOMALY / HEATWAVE TIMELINE (2023 - 2024)</span>
            </div>
            <div className="flex-1 relative">
              <Line data={timelineData} options={chartOptions} />
            </div>
          </div>

          {/* GENERATED SQL DISPLAY */}
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 shrink-0">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-500 font-sans font-semibold">GENERATED POSTGIS SQL:</span>
            <span className="text-cyan-300 truncate">{generatedSql || "SELECT * FROM argo_profiles;"}</span>
          </div>

        </main>
      )}

      {/* DEPTH PROFILE MODAL POPUP */}
      {selectedProfileModal && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedProfileModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-2xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Activity className="w-5 h-5" />
                <h3 className="font-bold text-slate-100 text-base">
                  Depth Profile Analysis - {selectedProfileModal.region || 'ARGO Float'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProfileModal(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-64 relative bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {modalChartData ? (
                <Line data={modalChartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No telemetry depth points available.
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Depth Level</th>
                    <th className="py-2 px-3">Temperature (°C)</th>
                    <th className="py-2 px-3">Salinity (PSU)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {modalDepthProfile.map((dp, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-emerald-400">{dp.depth} m</td>
                      <td className="py-2 px-3 text-cyan-400">{dp.temp} °C</td>
                      <td className="py-2 px-3 text-sky-400">{dp.salinity || 35.0} PSU</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button 
                onClick={() => setSelectedProfileModal(null)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}