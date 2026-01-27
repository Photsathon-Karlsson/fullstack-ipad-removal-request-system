export type LogEntry = {
  id: string;
  time: string;
  user: string;
  action: string;
  requestId?: string;
  detail?: string;
};

const LOG_KEY = "irrs_logs_v1";

function readAll(): LogEntry[] {
  const raw = localStorage.getItem(LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

function writeAll(list: LogEntry[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(list));
}

export function listLogs(): LogEntry[] {
  return readAll().sort((a, b) => (a.time < b.time ? 1 : -1));
}

export function addLog(input: Omit<LogEntry, "id" | "time">) {
  const list = readAll();
  const entry: LogEntry = {
    id: `LOG-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    time: new Date().toISOString(),
    ...input,
  };
  list.unshift(entry);
  writeAll(list);
  return entry;
}
