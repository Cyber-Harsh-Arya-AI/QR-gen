import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import './App.css';

export default function App() {
  const [text, setText] = useState("https://example.com");
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(4);
  const [ecLevel, setEcLevel] = useState("M");
  const [fg, setFg] = useState("#111827");
  const [bg, setBg] = useState("#ffffff");
  const [logoFile, setLogoFile] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [error, setError] = useState(null);
  const [renderCount, setRenderCount] = useState(0);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!logoFile) { setLogoDataUrl(null); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result);
    reader.onerror = () => setError("Failed to read logo file");
    reader.readAsDataURL(logoFile);
  }, [logoFile]);

  const options = useMemo(() => ({
    width: size,
    margin,
    errorCorrectionLevel: ecLevel,
    color: { dark: fg, light: bg }
  }), [size, margin, ecLevel, fg, bg]);

  useEffect(() => {
    async function draw() {
      setError(null);
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Add fade-in class
      canvas.classList.remove("fade-in");
      void canvas.offsetWidth; // trigger reflow
      canvas.classList.add("fade-in");

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "linear-gradient(to bottom right, #e0e7ff, #f9fafb)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        await QRCode.toCanvas(canvas, text || " ", options);
        if (logoDataUrl) await drawLogo(canvas, logoDataUrl);
        setRenderCount(c => c + 1);
      } catch (e) {
        setError(e?.message || "Failed to render QR");
      }
    }
    draw();
  }, [text, options, logoDataUrl]);

  async function drawLogo(canvas, dataUrl) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const W = canvas.width, H = canvas.height;
    const side = Math.round(Math.min(W, H) * 0.22);
    const x = Math.round((W - side) / 2);
    const y = Math.round((H - side) / 2);

    const radius = Math.max(6, Math.floor(side * 0.12));
    ctx.save();
    roundRect(ctx, x - 6, y - 6, side + 12, side + 12, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, x, y, side, side);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function downloadPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width; tmp.height = canvas.height;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bg || "#ffffff";
    ctx.fillRect(0,0,tmp.width,tmp.height);
    ctx.drawImage(canvas, 0, 0);
    const url = tmp.toDataURL("image/png");
    triggerDownload(url, `qr-${Date.now()}.png`);
  }

  async function downloadSVG() {
    try {
      const svgString = await QRCode.toString(text || " ", { ...options, type: "svg" });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `qr-${Date.now()}.svg`);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || "Failed to export SVG");
    }
  }

  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  }

  function resetAll() {
    setText("");
    setSize(320);
    setMargin(4);
    setEcLevel("M");
    setFg("#111827");
    setBg("#ffffff");
    setLogoFile(null);
    setLogoDataUrl(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-800">
      {/* Header */}
      <header className="text-center py-8 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            QR Code Generator
          </h1>
          <p className="text-gray-600 text-lg">Client-side • No uploads • Privacy first</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="space-y-6">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Text / URL
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your content here (URL, text, JSON, vCard, Wi‑Fi, etc.)"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Higher error correction (H) is better for logos.
                </p>
              </div>

              {/* Grid Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Size (px)
                  </label>
                  <input
                    type="number"
                    min={120}
                    max={1024}
                    step={8}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value) || 320)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Margin
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Error Correction
                  </label>
                  <select
                    value={ecLevel}
                    onChange={(e) => setEcLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {["L", "M", "Q", "H"].map(l => (
                      <option key={l} value={l}>{l} - {l === 'L' ? 'Low' : l === 'M' ? 'Medium' : l === 'Q' ? 'Quartile' : 'High'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Foreground
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={fg}
                      onChange={(e) => setFg(e.target.value)}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm font-mono">{fg}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Background
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <span className="text-sm font-mono">{bg}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Logo (optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {logoFile && (
                      <button
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        onClick={() => { setLogoFile(null); setLogoDataUrl(null); }}
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  onClick={() => setRenderCount(c => c + 1)}
                >
                  Regenerate
                </button>
                <button
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  onClick={downloadPNG}
                >
                  Download PNG
                </button>
                <button
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-md hover:shadow-lg"
                  onClick={downloadSVG}
                >
                  Download SVG
                </button>
                <button
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-md hover:shadow-lg"
                  onClick={resetAll}
                >
                  Reset All
                </button>
              </div>

              {/* Error & Info */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                  {String(error)}
                </div>
              )}
              
              <div className="text-center text-sm text-gray-500">
                Renders: <span className="font-mono font-semibold">{renderCount}</span>
              </div>
            </div>
          </section>

          {/* Preview Section */}
          <section className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-inner mb-4">
                <canvas
                  ref={canvasRef}
                  width={size}
                  height={size}
                  className="rounded-xl shadow-lg"
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">
                High contrast colors improve scan reliability
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-600 border-t border-gray-200 bg-white/50 mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <p>
            Built with <code className="bg-gray-100 px-2 py-1 rounded text-sm">qrcode</code> & React. 
            All processing happens in your browser — your data never leaves your device.
          </p>
        </div>
      </footer>
    </div>
  );
}