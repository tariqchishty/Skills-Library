import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings, ColumnMapping, DatasetSummary, ParseResult, StudentRecord } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/defaultSettings';
import { parseWorkbookFile } from '../lib/parseExcel';
import { computeStudentRecords } from '../lib/computeStudents';
import { buildDatasetSummary } from '../lib/datasetSummary';
import { EMPTY_FILTERS, type Filters } from '../lib/filters';

export type Page = 'upload' | 'dashboard' | 'risk' | 'reports' | 'export' | 'settings';

interface AppContextValue {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  fileName: string | null;
  loading: boolean;
  error: string | null;
  parsed: ParseResult | null;
  students: StudentRecord[];
  summary: DatasetSummary | null;
  page: Page;
  setPage: (p: Page) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  commitDataset: (buffer: ArrayBuffer, name: string, mapping: ColumnMapping[]) => void;
  loadingStart: () => void;
  loadError: (msg: string) => void;
  clearAll: () => void;
  hasData: boolean;
  sessionSaved: boolean;
  saveSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mappingOverride, setMappingOverride] = useState<ColumnMapping[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('upload');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sessionSaved, setSessionSaved] = useState(false);

  const parsed = useMemo(() => {
    if (!fileBuffer) return null;
    try {
      return parseWorkbookFile(fileBuffer, settings, mappingOverride ?? undefined);
    } catch {
      return null;
    }
  }, [fileBuffer, settings, mappingOverride]);

  const students = useMemo(() => {
    if (!parsed) return [];
    return computeStudentRecords(parsed, settings);
  }, [parsed, settings]);

  const summary = useMemo(() => {
    if (!parsed) return null;
    return buildDatasetSummary(parsed, students);
  }, [parsed, students]);

  const value: AppContextValue = {
    settings,
    setSettings,
    fileName,
    loading,
    error,
    parsed,
    students,
    summary,
    page,
    setPage,
    filters,
    setFilters,
    commitDataset: (buffer, name, mapping) => {
      setFileBuffer(buffer);
      setFileName(name);
      setMappingOverride(mapping);
      setLoading(false);
      setError(null);
      setFilters(EMPTY_FILTERS);
      setPage('dashboard');
    },
    loadingStart: () => {
      setLoading(true);
      setError(null);
    },
    loadError: (msg) => {
      setLoading(false);
      setError(msg);
    },
    clearAll: () => {
      setFileBuffer(null);
      setFileName(null);
      setMappingOverride(null);
      setError(null);
      setLoading(false);
      setFilters(EMPTY_FILTERS);
      setPage('upload');
      setSessionSaved(false);
    },
    hasData: !!parsed,
    sessionSaved,
    saveSession: () => setSessionSaved(true),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
