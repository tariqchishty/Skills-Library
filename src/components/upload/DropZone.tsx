import { useCallback, useRef, useState } from 'react';

const ACCEPTED_EXT = ['.xlsx', '.xls', '.csv'];

function isAccepted(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
}

export function DropZone({
  onFile,
  onSample,
  busy,
}: {
  onFile: (file: File) => void;
  onSample: () => void;
  busy: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isAccepted(file)) {
        setRejected(true);
        return;
      }
      setRejected(false);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center transition ${
          dragOver ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="text-4xl">⬆</div>
        <div className="text-lg font-semibold text-slate-800">
          {busy ? 'Reading file…' : 'Drag & drop your results spreadsheet here'}
        </div>
        <div className="text-sm text-slate-500">or click to browse — .xlsx, .xls, or .csv</div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {rejected && (
        <p className="mt-2 text-sm text-red-600">
          That file type isn't supported. Please upload an .xlsx, .xls, or .csv file.
        </p>
      )}
      <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
        <span>Don't have a file handy?</span>
        <button onClick={onSample} className="font-semibold text-slate-800 underline hover:text-slate-950">
          Load a sample dataset
        </button>
      </div>
    </div>
  );
}
