"use client";
import { useRef, useState, DragEvent } from "react";
import { Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Picks and HOLDS a file in memory (shows name/size + Remove) — it does NOT upload.
// The parent uploads the held file at submit time.
interface Props {
  label: string;
  accept: string;
  acceptedTypes?: string[];
  maxSize?: number; // bytes, default 10 MB
  hint?: string;
  value: File | null;
  onChange: (file: File | null) => void;
}

export function FilePickField({
  label, accept, acceptedTypes, maxSize = 10 * 1024 * 1024, hint, value, onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handle(file: File) {
    setErr(null);
    if (acceptedTypes && acceptedTypes.length && !acceptedTypes.includes(file.type)) {
      setErr("Unsupported file type.");
      return;
    }
    if (file.size > maxSize) {
      setErr(`File is too large (max ${Math.round(maxSize / 1024 / 1024)} MB).`);
      return;
    }
    onChange(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handle(f);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-purple-500 bg-purple-50"
            : "border-border bg-white hover:border-purple-400 hover:bg-purple-50/40",
        )}
      >
        {value ? (
          <>
            <Check className="h-6 w-6 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-purple-700">Click to replace</p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag &amp; drop or <span className="font-medium text-purple-700">browse</span>
            </p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
