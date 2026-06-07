import React, { useRef, useState, useEffect } from "react";
import { Paintbrush, Eraser, Trash2, Camera, Download, Undo } from "lucide-react";

interface WhiteboardProps {
  onSaveSnapshot?: (dataUrl: string) => void;
  savedSnapshot?: string;
}

export default function Whiteboard({ onSaveSnapshot, savedSnapshot }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#2563eb"); // Blue default
  const [brushSize, setBrushSize] = useState(4);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Support high pixel density retina displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;

    // Load static image snapshot if provided
    if (savedSnapshot) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = savedSnapshot;
    } else {
      // Background base
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
    }

    // Set up continuous resize listener
    const resizeObserver = new ResizeObserver((entries) => {
      if (!canvas || !contextRef.current) return;
      const entry = entries[0];
      if (!entry) return;

      // Keep backup
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
      canvas.width = newWidth * 2;
      canvas.height = newHeight * 2;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      contextRef.current.scale(2, 2);
      contextRef.current.lineCap = "round";
      contextRef.current.lineJoin = "round";
      contextRef.current.fillStyle = "#ffffff";
      contextRef.current.fillRect(0, 0, newWidth, newHeight);

      // Restore
      contextRef.current.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, newWidth, newHeight);
    });

    const parent = canvas.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    // Get exact mouse/touch coordinates relative to standard rect bounding
    const rect = canvas.getBoundingClientRect();
    let offsetX = 0;
    let offsetY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.clientX - rect.left;
      offsetY = e.nativeEvent.clientY - rect.top;
    }

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    contextRef.current.strokeStyle = isErasing ? "#ffffff" : color;
    contextRef.current.lineWidth = brushSize;
    contextRef.current.stroke();

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let offsetX = 0;
    let offsetY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else {
      offsetX = e.nativeEvent.clientX - rect.left;
      offsetY = e.nativeEvent.clientY - rect.top;
    }

    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.strokeStyle = isErasing ? "#ffffff" : color;
    contextRef.current.lineWidth = brushSize;
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    triggerSnapshot();
  };

  const triggerSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSaveSnapshot) return;
    const snapshot = canvas.toDataURL("image/png");
    onSaveSnapshot(snapshot);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    triggerSnapshot();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "meeting_whiteboard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const colors = [
    { value: "#1e293b", name: "Slate" },
    { value: "#ef4444", name: "Red" },
    { value: "#2563eb", name: "Blue" },
    { value: "#10b981", name: "Green" },
    { value: "#f59e0b", name: "Yellow" },
    { value: "#8b5cf6", name: "Purple" }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Tool bar controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {/* Colors selection */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {colors.map((c) => (
              <button
                key={c.value}
                id={`wb-color-${c.name}`}
                onClick={() => {
                  setColor(c.value);
                  setIsErasing(false);
                }}
                className={`w-6 h-6 rounded-md hover:scale-105 transition-all outline-none ${
                  color === c.value && !isErasing ? "ring-2 ring-offset-2 ring-slate-400" : ""
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Draw vs Erase toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              id="wb-btn-pencil"
              onClick={() => setIsErasing(false)}
              className={`p-1.5 rounded-md transition-colors ${
                !isErasing ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Pencil"
            >
              <Paintbrush size={18} />
            </button>
            <button
              id="wb-btn-eraser"
              onClick={() => setIsErasing(true)}
              className={`p-1.5 rounded-md transition-colors ${
                isErasing ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Size range slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 font-sans">Brush size</span>
            <input
              id="wb-brush-slider"
              type="range"
              min="2"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-slate-700 font-mono w-4">{brushSize}px</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="wb-btn-clear"
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 size={14} />
            Clear Plan
          </button>
          <button
            id="wb-btn-download"
            onClick={downloadCanvas}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download size={14} />
            Export Image
          </button>
          <button
            id="wb-btn-snapshot"
            onClick={triggerSnapshot}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
            title="Saves whiteboard into active meeting stats summary"
          >
            <Camera size={14} />
            Attach Snapshot
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full block touch-none"
        />
        {/* Helper layout lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none grid grid-cols-12 grid-rows-12">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border-r border-b border-indigo-900" />
          ))}
        </div>
      </div>
    </div>
  );
}
