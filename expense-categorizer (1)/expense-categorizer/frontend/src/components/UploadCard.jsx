import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { useRef, useState } from "react";

/**
 * UploadCard
 * The hero element of the page — a large, obvious drop zone for the CSV.
 * Handles both drag-and-drop and click-to-browse, and shows the picked
 * file name before the user confirms categorization.
 */
export default function UploadCard({ onFileSelected, selectedFile, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      onFileSelected(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer
        transition-colors duration-200
        ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-brand hover:bg-panel"}
        ${isDragging ? "border-brand bg-panel" : "border-brand/30 bg-white"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <FileSpreadsheet className="w-12 h-12 text-brand" strokeWidth={1.5} />
          <p className="font-display font-semibold text-ink">{selectedFile.name}</p>
          <p className="text-sm text-muted">Click or drop another file to replace it</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="w-14 h-14 text-brand" strokeWidth={1.5} />
          <p className="font-display font-semibold text-lg text-ink">
            Drop your expense CSV here
          </p>
          <p className="text-sm text-muted">
            or click to browse — requires columns: Date, Description, Amount
          </p>
        </div>
      )}
    </div>
  );
}
