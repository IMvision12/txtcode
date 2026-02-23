/**
 * Stream output normalizer - cleans and sanitizes CLI output
 * Inspired by OpenClaw's normalizeStreamingText
 */

import type { NormalizedStreamOutput } from "./streaming-types";

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;
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

  // Strip ANSI escape codes
  if (ANSI_REGEX.test(normalized)) {
    normalized = normalized.replace(ANSI_REGEX, "");
    stripped.ansi = true;
  }

  // Strip heartbeat tokens
  if (normalized.includes(HEARTBEAT_TOKEN)) {
    normalized = normalized.replace(new RegExp(HEARTBEAT_TOKEN, "g"), "");
    stripped.heartbeat = true;
  }

  // Strip control characters (except newlines and tabs)
  if (CONTROL_CHARS_REGEX.test(normalized)) {
    normalized = normalized.replace(CONTROL_CHARS_REGEX, "");
    stripped.control = true;
  }

  // Trim excessive whitespace
  normalized = normalized.trim();

  // Skip if empty after normalization
  if (!normalized) {
    return { text: "", skip: true, stripped };
  }

  return { text: normalized, skip: false, stripped };
}

/**
 * Check if text should be skipped (silent reply)
 */
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
