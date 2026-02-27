import type { NormalizedStreamOutput } from "./streaming-types";

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g;
const HEARTBEAT_TOKEN = "HEARTBEAT_OK";

export function normalizeStreamOutput(text: string | undefined): NormalizedStreamOutput {
  if (!text) {
    return { text: "", skip: true };
  }

  let normalized = text;
  const stripped = {
    ansi: false,
    heartbeat: false,
    control: false,
  };

  if (ANSI_REGEX.test(normalized)) {
    normalized = normalized.replace(ANSI_REGEX, "");
    stripped.ansi = true;
  }

  if (normalized.includes(HEARTBEAT_TOKEN)) {
    normalized = normalized.replace(new RegExp(HEARTBEAT_TOKEN, "g"), "");
    stripped.heartbeat = true;
  }

  if (CONTROL_CHARS_REGEX.test(normalized)) {
    normalized = normalized.replace(CONTROL_CHARS_REGEX, "");
    stripped.control = true;
  }

  normalized = normalized.trim();

  if (!normalized) {
    return { text: "", skip: true, stripped };
  }

  return { text: normalized, skip: false, stripped };
}

export function isSilentReply(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed === "" ||
    trimmed === "ok" ||
    trimmed === "done" ||
    trimmed.startsWith("[silent]") ||
    trimmed.startsWith("(no output)")
  );
}
