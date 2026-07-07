"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper over the browser-native Web Speech API (SpeechRecognition).
 * No backend, no keys — works in Chrome/Edge and mobile Safari. Returns a
 * simple start/stop + live transcript so a mic button can dictate into any
 * text input. Degrades gracefully: `supported` is false where the API is
 * missing, and callers should keep the typed input as the fallback.
 */

type SpeechResult = { transcript: string; isFinal: boolean };

interface MinimalRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

function getCtor(): (new () => MinimalRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalRecognition;
    webkitSpeechRecognition?: new () => MinimalRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function readResult(e: unknown): SpeechResult {
  const ev = e as {
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  };
  let transcript = "";
  let isFinal = false;
  for (let i = 0; i < ev.results.length; i++) {
    const r = ev.results[i];
    transcript += r[0]?.transcript ?? "";
    if (r.isFinal) isFinal = true;
  }
  return { transcript: transcript.trim(), isFinal };
}

export function useSpeechRecognition(opts?: {
  onFinal?: (text: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<MinimalRecognition | null>(null);
  const onFinalRef = useRef(opts?.onFinal);

  useEffect(() => {
    onFinalRef.current = opts?.onFinal;
  });

  useEffect(() => {
    // Read Web Speech API availability from the browser once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    // Fresh instance each time — reusing across sessions is flaky on Safari.
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const { transcript: t, isFinal } = readResult(e);
      setTranscript(t);
      if (isFinal) {
        setListening(false);
        onFinalRef.current?.(t);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, start, stop };
}
