import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { DropZone } from '../components/upload/DropZone';
import { ColumnMappingTable } from '../components/upload/ColumnMappingTable';
import { ValidationSummaryCard } from '../components/upload/ValidationSummaryCard';
import { parseWorkbookFile } from '../lib/parseExcel';
import { computeStudentRecords } from '../lib/computeStudents';
import { buildDatasetSummary } from '../lib/datasetSummary';
import type { ColumnMapping } from '../lib/types';

const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-data/sample-results.xlsx`;

export function UploadPage() {
  const { settings, commitDataset } = useApp();
  const [busy, setBusy] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [editedMapping, setEditedMapping] = useState<ColumnMapping[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadFromBuffer(buffer: ArrayBuffer, name: string) {
    try {
      const auto = parseWorkbookFile(buffer, settings);
      if (auto.rawHeaders.length === 0) {
        setError('Could not read any data from this file. Please check it is a valid spreadsheet.');
        return;
      }
      setPreviewBuffer(buffer);
      setPreviewName(name);
      setEditedMapping(auto.mapping);
      setError(null);
    } catch {
      setError('Something went wrong reading this file. Please check the format and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    const buffer = await file.arrayBuffer();
    await loadFromBuffer(buffer, file.name);
  }

  async function handleSample() {
    setBusy(true);
    try {
      const res = await fetch(SAMPLE_URL);
      const buffer = await res.arrayBuffer();
      await loadFromBuffer(buffer, 'sample-results.xlsx');
    } catch {
      setError('Could not load the sample dataset.');
      setBusy(false);
    }
  }

  const livePreview = useMemo(() => {
    if (!previewBuffer || !editedMapping) return null;
    const parsed = parseWorkbookFile(previewBuffer, settings, editedMapping);
    const students = computeStudentRecords(parsed, settings);
    const summary = buildDatasetSummary(parsed, students);
    return { parsed, summary };
  }, [previewBuffer, editedMapping, settings]);

  function reset() {
    setPreviewBuffer(null);
    setPreviewName('');
    setEditedMapping(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Upload Results Spreadsheet</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload an exam-section export (.xlsx, .xls, or .csv). Everything is processed in this browser tab — nothing
        is uploaded to a server.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {!previewBuffer ? (
        <div className="mt-6">
          <DropZone onFile={handleFile} onSample={handleSample} busy={busy} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">{previewName}</div>
              <div className="text-xs text-slate-500">
                Header row detected at row {(livePreview?.parsed.headerRowIndex ?? 0) + 1} ·{' '}
                {livePreview?.parsed.totalDataRows ?? 0} data rows found
              </div>
            </div>
            <button onClick={reset} className="text-sm font-medium text-slate-500 underline hover:text-slate-800">
              Choose a different file
            </button>
          </div>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">1. Confirm column mapping</h2>
            <p className="mb-3 text-sm text-slate-500">
              We auto-detected these columns. Fix anything that looks wrong before we analyze the data.
            </p>
            {editedMapping && (
              <ColumnMappingTable
                mapping={editedMapping}
                sampleRows={livePreview?.parsed.sampleRows ?? []}
                onChange={setEditedMapping}
              />
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">2. Validation summary</h2>
            {livePreview && <ValidationSummaryCard summary={livePreview.summary} />}
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              onClick={reset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => editedMapping && commitDataset(previewBuffer, previewName, editedMapping)}
              disabled={!livePreview || livePreview.summary.studentsFound === 0}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm & Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
