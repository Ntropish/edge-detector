import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import init, { detect } from "canny-wasm";

export default function CannyEdgeCard() {
  /* ---------- UI state ---------- */
  const [low, setLow] = useState(75);
  const [high, setHigh] = useState(200);
  const [error, setError] = useState<string | null>(null);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    // Load the WebAssembly module
    init()
      .then(() => {
        setInitialized(true);
        setError(null);
      })
      .catch((e) => {
        console.error("Failed to load WebAssembly module", e);
        setError("Failed to load WebAssembly module");
      });
  }, []);

  /* ---------- refs ---------- */
  const srcCanvasRef = useRef<HTMLCanvasElement>(null);
  const dstCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- core processing ---------- */
  const process = useCallback(() => {
    if (!initialized) return; // wait for WebAssembly to load

    const srcCanvas = srcCanvasRef.current;
    const dstCanvas = dstCanvasRef.current;
    if (!srcCanvas || !dstCanvas) return;

    const w = srcCanvas.width;
    const h = srcCanvas.height;
    if (!w || !h) return; // no image yet

    const srcCtx = srcCanvas.getContext("2d");
    const dstCtx = dstCanvas.getContext("2d");
    if (!srcCtx || !dstCtx) return;

    try {
      const { data } = srcCtx.getImageData(0, 0, w, h);

      // 1️  re‑interpret the bytes as Uint8Array
      const inBuf = new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength
      );

      // 2️  run Canny inside WebAssembly
      const out = detect(inBuf, w, h, low, high); // ← now type‑safe

      // 3️  view the returned buffer as Uint8ClampedArray for Canvas
      const outClamped = new Uint8ClampedArray(out.buffer);

      dstCtx.putImageData(new ImageData(outClamped, w, h), 0, 0);

      dstCtx.putImageData(
        new ImageData(new Uint8ClampedArray(out), w, h),
        0,
        0
      );
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [initialized, low, high]);

  /* re‑run when thresholds change */
  useEffect(() => {
    process();
  }, [process]);

  const handleFiles = useCallback(
    (files?: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const srcCanvas = srcCanvasRef.current;
        const dstCanvas = dstCanvasRef.current;
        if (!srcCanvas || !dstCanvas) return;
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        dstCanvas.width = img.width;
        dstCanvas.height = img.height;
        const ctx = srcCanvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        process();
      };
    },
    [process]
  );

  // drag‑and‑drop handlers
  const onDrop = useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      handleFiles(ev.dataTransfer.files);
    },
    [handleFiles]
  );

  const onBrowse = () => fileInputRef.current?.click();

  return (
    <Card className="p-4 w-full max-w-5xl mx-auto">
      <CardHeader>
        <h2 className="text-xl font-semibold">
          Canny Edge Detection Playground
        </h2>
      </CardHeader>
      <CardContent>
        {/* Upload / drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 gap-4 text-sm cursor-pointer hover:bg-muted/50 transition"
          onClick={onBrowse}
        >
          <p>Drag & drop an image here, or click to choose a file</p>
          <Button variant="outline" type="button">
            Browse…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Sliders */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-medium">Low threshold ({low})</label>
            <Slider
              min={0}
              max={high - 1}
              step={1}
              defaultValue={[low]}
              onValueChange={([v]) => setLow(v)}
            />
          </div>
          <div>
            <label className="font-medium">High threshold ({high})</label>
            <Slider
              min={low + 1}
              max={255}
              step={1}
              defaultValue={[high]}
              onValueChange={([v]) => setHigh(v)}
            />
          </div>
        </div>

        {error && <p className="text-destructive mt-4">{error}</p>}

        {/* Canvases */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <figure className="flex flex-col items-center gap-2">
            <canvas
              ref={srcCanvasRef}
              className="border rounded-2xl max-w-full shadow-lg"
            />
            <figcaption className="text-sm text-muted-foreground">
              Original
            </figcaption>
          </figure>

          <figure className="flex flex-col items-center gap-2">
            <canvas
              ref={dstCanvasRef}
              className="border rounded-2xl max-w-full shadow-lg"
            />
            <figcaption className="text-sm text-muted-foreground">
              Edges
            </figcaption>
          </figure>
        </div>
      </CardContent>
    </Card>
  );
}
