import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Landmark, BookOpen } from "lucide-react";

function UploadSlot({ label, icon: Icon, file, onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    const f = fileList?.[0];
    if (f && f.name.toLowerCase().endsWith(".csv")) onFileSelected(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-200
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-brand hover:bg-panel"}
        ${isDragging ? "border-brand bg-panel" : "border-brand/30 bg-white"}
      `}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)} />

      <Icon className="w-8 h-8 text-brand mx-auto mb-2" strokeWidth={1.5} />
      <p className="font-display font-semibold text-ink text-sm mb-1">{label}</p>

      {file ? (
        <div className="flex items-center justify-center gap-2 mt-2">
          <FileSpreadsheet className="w-4 h-4 text-brand" />
          <p className="text-sm text-ink truncate max-w-[200px]">{file.name}</p>
        </div>
      ) : (
        <p className="text-xs text-muted">Drop CSV or click to browse</p>
      )}
    </div>
  );
}

export default function DualUpload({ bankFile, glFile, onBankSelected, onGlSelected, disabled }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UploadSlot
        label="Bank Statement"
        icon={Landmark}
        file={bankFile}
        onFileSelected={onBankSelected}
        disabled={disabled}
      />
      <UploadSlot
        label="General Ledger"
        icon={BookOpen}
        file={glFile}
        onFileSelected={onGlSelected}
        disabled={disabled}
      />
    </div>
  );
}
