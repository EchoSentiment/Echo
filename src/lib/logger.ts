type Level = "info" | "warn" | "error" | "debug";

function log(level: Level, ns: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${ns}]`;
  if (data !== undefined) {
    console[level === "debug" ? "log" : level](`${prefix} ${msg}`, data);
  } else {
    console[level === "debug" ? "log" : level](`${prefix} ${msg}`);
  }
}

export function createLogger(ns: string) {
  return {
    info: (msg: string, data?: unknown) => log("info", ns, msg, data),
    warn: (msg: string, data?: unknown) => log("warn", ns, msg, data),
    error: (msg: string, data?: unknown) => log("error", ns, msg, data),
    debug: (msg: string, data?: unknown) => log("debug", ns, msg, data),
  };
}
