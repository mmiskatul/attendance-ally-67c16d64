import { useEffect, useState } from "react";
import { ScanFace, Check, Sparkles, Loader2, Database, Cpu, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaceScanner, type ScanCapture } from "@/components/shared/FaceScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { Student } from "@/types";
import { toast } from "sonner";

const steps = [
  { key: "select", label: "Select Student" },
  { key: "scan", label: "Camera Scan" },
  { key: "embed", label: "Generate Embeddings" },
  { key: "save", label: "Save to Vector DB" },
];

export default function FaceRegistration() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [captures, setCaptures] = useState<ScanCapture[]>([]);
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(0);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  useEffect(() => { api.getStudents().then(setStudents); }, []);

  // Advance stepper based on state
  useEffect(() => {
    if (result === "success") return;
    if (processing) return;
    if (captures.length > 0) setStep(1);
    else if (selected) setStep(1);
    else setStep(0);
  }, [selected, captures, processing, result]);

  const handleScanComplete = (caps: ScanCapture[]) => {
    if (!selected) {
      toast.error("Please select a student first");
      setCaptures([]);
      return;
    }
    setCaptures(caps);
  };

  const generateAndSave = async () => {
    if (!selected) { toast.error("Please select a student"); return; }
    if (captures.length === 0) { toast.error("Please complete the face scan first"); return; }
    setProcessing(true);
    setResult(null);

    // Step 3 — generate embeddings (simulated streaming progress)
    setStep(2);
    setEmbedProgress(0);
    for (let i = 1; i <= 100; i += 5) {
      setEmbedProgress(i);
      await new Promise((r) => setTimeout(r, 40));
    }

    // Step 4 — save to vector DB
    setStep(3);
    await new Promise((r) => setTimeout(r, 900));

    setProcessing(false);
    setResult("success");
    toast.success("Face profile registered successfully");
  };

  const reset = () => {
    setCaptures([]); setStep(0); setResult(null); setSelected(""); setEmbedProgress(0);
  };

  const selectedStudent = students.find((s) => s.id === selected);
  const scanComplete = captures.length === 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Face Registration"
        description="Capture multi-angle face data with the live camera and enroll into the AI vector database"
        icon={ScanFace}
      />

      {/* Stepper */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {steps.map((s, i) => {
              const active = step === i && !result;
              const done = step > i || result === "success";
              return (
                <div key={s.key} className="flex flex-1 items-center gap-3 min-w-fit">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="hidden md:block">
                      <p className={cn("text-sm font-medium", active || done ? "text-foreground" : "text-muted-foreground")}>
                        {s.label}
                      </p>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn("h-0.5 flex-1 mx-2", done ? "bg-success" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — student select + camera */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select student</CardTitle>
              <CardDescription>Choose the student to enroll into the face recognition system</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selected} onValueChange={setSelected} disabled={processing || result === "success"}>
                <SelectTrigger><SelectValue placeholder="Select a student…" /></SelectTrigger>
                <SelectContent>
                  {students.slice(0, 30).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.studentId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Live face scan</CardTitle>
              <CardDescription>
                The camera will guide you through 5 head positions — front, left, right, up, down. Stay centered in the oval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result === "success" ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-success/40 bg-success-soft py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
                    <Check className="h-6 w-6" />
                  </div>
                  <p className="mt-3 font-semibold">Face data captured & stored</p>
                  <p className="mt-1 text-sm text-muted-foreground">Camera released. Click "Register another" to enroll a new student.</p>
                </div>
              ) : (
                <FaceScanner onComplete={handleScanComplete} disabled={processing} />
              )}
            </CardContent>
          </Card>

          {/* Action */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={generateAndSave}
              disabled={processing || !scanComplete || !selected || result === "success"}
              className="bg-gradient-primary hover:opacity-95"
            >
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating embeddings…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate & save face data</>
              )}
            </Button>
            {(captures.length > 0 || result) && (
              <Button variant="outline" onClick={reset} disabled={processing}>
                {result === "success" ? "Register another" : "Reset"}
              </Button>
            )}
          </div>
        </div>

        {/* Right — status panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment status</CardTitle>
              <CardDescription>Live status of the registration pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  selectedStudent ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {selectedStudent ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Student selected</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent ? `${selectedStudent.name} · ${selectedStudent.studentId}` : "Pick a student to begin"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  scanComplete ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {scanComplete ? <Check className="h-4 w-4" /> : "2"}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Face scan</p>
                  <p className="text-xs text-muted-foreground">{captures.length} / 5 angles captured</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  embedProgress >= 100 ? "bg-success text-success-foreground" : processing ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {embedProgress >= 100 ? <Check className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Embeddings</p>
                  <Progress value={embedProgress} className="mt-1.5 h-1.5" />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  result === "success" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {result === "success" ? <Check className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Saved to vector DB</p>
                  <p className="text-xs text-muted-foreground">
                    {result === "success" ? `${captures.length} embeddings stored` : "Pending"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary-soft">
            <CardContent className="flex gap-3 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-xs text-foreground">
                <p className="font-semibold">Privacy & security</p>
                <p className="mt-1 text-muted-foreground">
                  Captured frames stay in the browser until you click "Generate & save". Only the resulting embeddings (not raw images) are stored in the vector database.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
