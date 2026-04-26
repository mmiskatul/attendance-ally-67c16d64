import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RefreshCw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ScanAngle = "front" | "left" | "right" | "up" | "down";

export interface ScanCapture {
  angle: ScanAngle;
  dataUrl: string;
}

interface FaceScannerProps {
  onComplete: (captures: ScanCapture[]) => void;
  disabled?: boolean;
}

const ANGLES: { key: ScanAngle; label: string; instruction: string; Icon: typeof ArrowLeft }[] = [
  { key: "front", label: "Front", instruction: "Look straight at the camera", Icon: User },
  { key: "left", label: "Left", instruction: "Slowly turn your head to the LEFT", Icon: ArrowLeft },
  { key: "right", label: "Right", instruction: "Slowly turn your head to the RIGHT", Icon: ArrowRight },
  { key: "up", label: "Up", instruction: "Tilt your head slightly UP", Icon: ArrowUp },
  { key: "down", label: "Down", instruction: "Tilt your head slightly DOWN", Icon: ArrowDown },
];

export function FaceScanner({ onComplete, disabled }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  };

  const start = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : e?.name === "NotFoundError"
          ? "No camera found on this device."
          : e?.message || "Could not access camera.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grabFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !ready) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const runScan = async () => {
    if (!ready) return;
    setScanning(true);
    setCaptures([]);
    const collected: ScanCapture[] = [];

    for (let i = 0; i < ANGLES.length; i++) {
      setCurrentIdx(i);
      // Countdown 3..1 so the user has time to pose
      for (let c = 3; c >= 1; c--) {
        setCountdown(c);
        await new Promise((r) => setTimeout(r, 800));
      }
      setCountdown(null);
      const frame = grabFrame();
      if (!frame) {
        toast.error("Failed to capture frame");
        setScanning(false);
        return;
      }
      const cap: ScanCapture = { angle: ANGLES[i].key, dataUrl: frame };
      collected.push(cap);
      setCaptures([...collected]);
      // Brief pause between captures
      await new Promise((r) => setTimeout(r, 350));
    }

    setScanning(false);
    toast.success("Face scan complete");
    onComplete(collected);
  };

  const reset = () => {
    setCaptures([]);
    setCurrentIdx(0);
    setCountdown(null);
    setScanning(false);
  };

  const current = ANGLES[currentIdx];
  const progress = (captures.length / ANGLES.length) * 100;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Face guide overlay */}
        {ready && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  "h-3/4 w-1/2 rounded-[50%] border-[3px] border-dashed transition-colors duration-300 shadow-[0_0_0_9999px_hsl(0_0%_0%/0.45)]",
                  scanning ? "border-primary animate-pulse" : "border-primary/70",
                )}
              />
            </div>

            {/* Scan progress ring (top) */}
            <div className="absolute left-0 right-0 top-3 flex justify-center">
              <div className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
                {captures.length} / {ANGLES.length} angles captured
              </div>
            </div>

            {/* Instruction overlay (bottom) */}
            {scanning && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-5 text-primary-foreground">
                <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold">
                  <current.Icon className="h-3.5 w-3.5" />
                  Step {currentIdx + 1} · {current.label}
                </div>
                <p className="text-sm font-medium">{current.instruction}</p>
                {countdown !== null && (
                  <div className="mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground animate-scale-in">
                    {countdown}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-primary-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Starting camera…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-primary-foreground">
            <p className="text-sm">{error}</p>
            <Button size="sm" variant="secondary" onClick={start}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Angle thumbnails */}
      <div className="grid grid-cols-5 gap-2">
        {ANGLES.map((a, i) => {
          const cap = captures.find((c) => c.angle === a.key);
          const isCurrent = scanning && i === currentIdx && !cap;
          return (
            <div
              key={a.key}
              className={cn(
                "relative overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                cap ? "border-success" : isCurrent ? "border-primary" : "border-border",
              )}
            >
              <div className="aspect-square w-full">
                {cap ? (
                  <img src={cap.dataUrl} alt={a.label} className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <a.Icon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 px-1.5 py-1 text-[10px] font-medium">
                <span className="truncate">{a.label}</span>
                {cap && <Check className="h-3 w-3 text-success" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {captures.length === 0 ? (
          <Button
            onClick={runScan}
            disabled={!ready || scanning || disabled}
            className="bg-gradient-primary hover:opacity-95"
          >
            {scanning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning…</>
            ) : (
              <><Camera className="mr-2 h-4 w-4" /> Start face scan</>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={reset} disabled={scanning || disabled}>
            <RefreshCw className="mr-2 h-4 w-4" /> Re-scan
          </Button>
        )}
      </div>
    </div>
  );
}
