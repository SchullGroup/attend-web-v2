"use client";
import { useRef, useState, DragEvent } from "react";
import { Upload, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadFile } from "@/api/upload/hooks";

interface Props {
  label: string;
  accept: string; // input accept attr, e.g. ".pdf,.doc,.docx,.zip"
  acceptedTypes?: string[]; // optional MIME allow-list
  maxSize?: number; // bytes (default 10 MB)
  hint?: string;
  folder?: string; // Cloudinary folder hint
  value?: string; // existing URL (edit mode)
  onUploaded: (url: string) => void;
}

export function UploadField({
  label, accept, acceptedTypes, maxSize = 10 * 1024 * 1024, hint, folder, value, onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { mutateAsync, isPending } = useUploadFile();

  async function handleFile(file: File) {
    setErr(null);
    if (acceptedTypes && acceptedTypes.length && !acceptedTypes.includes(file.type)) {
      setErr("Unsupported file type.");
      return;
    }
    if (file.size > maxSize) {
      setErr(`File is too large (max ${Math.round(maxSize / 1024 / 1024)} MB).`);
      return;
    }
    try {
      const url = await mutateAsync({ file, folder });
      setFileName(file.name);
      onUploaded(url);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Upload failed.");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const uploaded = !!value || !!fileName;

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
        {isPending ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : uploaded ? (
          <>
            <Check className="h-6 w-6 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">{fileName || "File uploaded"}</p>
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
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
