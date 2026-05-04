"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { RelationshipMessageRow } from "@/lib/clients/types";

type Props = {
  relationshipId: string;
  selfUserId: string;
};

const POLL_MS = 5000;

export function MessagesPanel({ relationshipId, selfUserId }: Props) {
  const { showToast } = useAppState();
  const [messages, setMessages] = useState<RelationshipMessageRow[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const r = await fetch(`/api/clients/${relationshipId}/messages`, {
        credentials: "include",
      });
      if (!r.ok) {
        setMessages([]);
        return;
      }
      const json = (await r.json()) as { messages: RelationshipMessageRow[] };
      setMessages(json.messages);
      cursorRef.current = json.messages.at(-1)?.createdAt ?? null;
    } catch {
      setMessages([]);
    }
  }, [relationshipId]);

  const pollNew = useCallback(async () => {
    if (!cursorRef.current) return;
    try {
      const r = await fetch(
        `/api/clients/${relationshipId}/messages?since=${encodeURIComponent(cursorRef.current)}`,
        { credentials: "include" },
      );
      if (!r.ok) return;
      const json = (await r.json()) as { messages: RelationshipMessageRow[] };
      if (json.messages.length === 0) return;
      setMessages((prev) => (prev ? [...prev, ...json.messages] : json.messages));
      cursorRef.current = json.messages.at(-1)?.createdAt ?? cursorRef.current;
    } catch {
      /* swallow — next tick retries */
    }
  }, [relationshipId]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --- one-shot bootstrap */
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const id = setInterval(() => {
      void pollNew();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pollNew]);

  /* Auto-scroll to bottom on new messages. */
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    /* Optimistic insert */
    const optimistic: RelationshipMessageRow = {
      id: `tmp-${Date.now()}`,
      relationshipId,
      senderId: selfUserId,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => (prev ? [...prev, optimistic] : [optimistic]));
    setDraft("");
    try {
      const r = await fetch(`/api/clients/${relationshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      if (!r.ok) {
        showToast("Couldn't send. Reverting.");
        setMessages((prev) => prev?.filter((m) => m.id !== optimistic.id) ?? null);
        setDraft(text);
        return;
      }
      const json = (await r.json()) as { message: RelationshipMessageRow };
      /* Replace optimistic with real */
      setMessages((prev) =>
        prev
          ? prev.map((m) => (m.id === optimistic.id ? json.message : m))
          : [json.message],
      );
      cursorRef.current = json.message.createdAt;
    } finally {
      setSending(false);
    }
  }

  if (messages === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-10 rounded-[10px] animate-pulse",
              i % 2 ? "bg-accent-soft/40 ml-12" : "bg-surface-2 mr-12",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "min(60vh, 600px)" }}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-muted">
            No messages yet. Say something.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              fromSelf={m.senderId === selfUserId}
            />
          ))
        )}
      </div>
      <form
        onSubmit={send}
        className="pt-3 mt-2 border-t border-border flex items-end gap-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e);
            }
          }}
          placeholder="Type a message…"
          disabled={sending}
          rows={1}
          className="flex-1 px-3 py-2 rounded-[10px] border border-border bg-surface text-[13.5px] text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none min-h-[40px] max-h-32"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          <Send className="w-3.5 h-3.5" />
          Send
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  fromSelf,
}: {
  message: RelationshipMessageRow;
  fromSelf: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className={cn("flex", fromSelf ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] px-3.5 py-2 rounded-[14px] text-[13.5px] leading-relaxed whitespace-pre-wrap break-words",
          fromSelf
            ? "bg-accent text-white rounded-br-[4px]"
            : "bg-surface-2 border border-border text-text rounded-bl-[4px]",
        )}
      >
        {message.body}
        <div
          className={cn(
            "text-[10px] mt-1 tabular-nums",
            fromSelf ? "text-white/70" : "text-muted",
          )}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
