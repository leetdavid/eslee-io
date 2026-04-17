"use client";

import { Mic, MicOff, SendHorizontal, Settings, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT = `You are Yomi-sensei, a warm and encouraging Japanese language tutor built into the Yomi app.

Your role:
- Conduct natural Japanese conversation practice at the learner's level
- Gently correct grammar and pronunciation mistakes by modeling correct usage in your next response
- Use です/ます form by default; adjust politeness level as the learner progresses
- Keep responses concise and conversational — 2 to 4 sentences

When the user speaks or writes English, gently encourage Japanese: 「日本語でも試してみましょう！」.
However, not all users are proficient enough to understand that, so speaking English for absolute beginners is acceptable.

Start by greeting the user warmly in Japanese and asking how they'd like to practice today.

You have access to a tool called add_clip. Use it to save any Japanese word, phrase, or sentence that would be valuable for the user to study later — for example after correcting them, introducing new vocabulary, or when they ask to save something.`;

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy" },
  { value: "ash", label: "Ash" },
  { value: "ballad", label: "Ballad" },
  { value: "coral", label: "Coral" },
  { value: "echo", label: "Echo" },
  { value: "sage", label: "Sage" },
  { value: "shimmer", label: "Shimmer" },
  { value: "verse", label: "Verse" },
] as const;

type VoiceId = (typeof VOICE_OPTIONS)[number]["value"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionStatus = "idle" | "connecting" | "active" | "error";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
}

interface VoiceChatSettings {
  voice: VoiceId;
  systemPrompt: string;
}

type ToolCallHandler = (name: string, args: Record<string, unknown>) => Promise<string>;

const DEFAULT_SETTINGS: VoiceChatSettings = {
  voice: "shimmer",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Internal hook: manages WebRTC + DataChannel lifecycle
// ---------------------------------------------------------------------------

function useRealtimeSession(
  settings: VoiceChatSettings,
  onToolCall: ToolCallHandler,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const pendingMsgIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const pendingToolArgsRef = useRef<Record<string, string>>({});
  // Keep settings and callbacks accessible without triggering re-creation
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const onToolCallRef = useRef<ToolCallHandler>(onToolCall);
  useEffect(() => { onToolCallRef.current = onToolCall; }, [onToolCall]);

  const sendEvent = useCallback((event: object) => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  const cleanup = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    pendingMsgIdRef.current = null;
    pendingToolArgsRef.current = {};
    setIsSpeaking(false);
    setIsAiSpeaking(false);
  }, []);

  const handleDataChannelMessage = useCallback(
    (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as Record<string, unknown>;

      switch (msg.type) {
        case "session.created": {
          sendEvent({
            type: "session.update",
            session: {
              instructions: settingsRef.current.systemPrompt,
              input_audio_transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                silence_duration_ms: 800,
                threshold: 0.5,
                prefix_padding_ms: 300,
              },
              modalities: ["text", "audio"],
              tools: [
                {
                  type: "function",
                  name: "add_clip",
                  description:
                    "Save a Japanese word, phrase, or sentence as a study clip for the user to review later in Yomi.",
                  parameters: {
                    type: "object",
                    properties: {
                      text: {
                        type: "string",
                        description: "The Japanese text to save (word, phrase, or sentence)",
                      },
                      title: {
                        type: "string",
                        description: "Brief descriptive title for the clip (optional)",
                      },
                      jlpt_level: {
                        type: "string",
                        enum: ["N5", "N4", "N3", "N2", "N1"],
                        description: "JLPT difficulty level of the content (optional)",
                      },
                    },
                    required: ["text"],
                  },
                },
              ],
              tool_choice: "auto",
            },
          });
          setStatus("active");

          // Drain any queued text message
          if (pendingTextRef.current) {
            const queued = pendingTextRef.current;
            pendingTextRef.current = null;
            setTimeout(() => {
              sendEvent({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: queued }],
                },
              });
              sendEvent({ type: "response.create" });
            }, 0);
          }
          break;
        }

        case "input_audio_buffer.speech_started": {
          const { item_id } = msg as { item_id: string };
          setIsSpeaking(true);
          setMessages((prev) => [...prev, { id: item_id, role: "user", text: "", pending: true }]);
          break;
        }

        case "input_audio_buffer.speech_stopped":
          setIsSpeaking(false);
          break;

        case "conversation.item.input_audio_transcription.completed": {
          const { item_id, transcript } = msg as { item_id: string; transcript: string };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === item_id ? { ...m, text: transcript.trim(), pending: false } : m,
            ),
          );
          break;
        }

        case "response.audio_transcript.delta": {
          const { delta, item_id } = msg as { delta: string; item_id: string };
          if (pendingMsgIdRef.current !== item_id) {
            pendingMsgIdRef.current = item_id;
            setIsAiSpeaking(true);
            setMessages((prev) => [
              ...prev,
              { id: item_id, role: "assistant", text: delta, pending: true },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === item_id ? { ...m, text: m.text + delta } : m)),
            );
          }
          break;
        }

        case "response.audio_transcript.done": {
          const { item_id } = msg as { item_id: string };
          pendingMsgIdRef.current = null;
          setIsAiSpeaking(false);
          setMessages((prev) => prev.map((m) => (m.id === item_id ? { ...m, pending: false } : m)));
          break;
        }

        case "response.function_call_arguments.delta": {
          const { call_id, delta } = msg as { call_id: string; delta: string };
          pendingToolArgsRef.current[call_id] = (pendingToolArgsRef.current[call_id] ?? "") + delta;
          break;
        }

        case "response.function_call_arguments.done": {
          const { call_id, name, arguments: argsStr } = msg as {
            call_id: string;
            name: string;
            arguments: string;
          };
          delete pendingToolArgsRef.current[call_id];
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(argsStr) as Record<string, unknown>;
          } catch {
            // malformed args — proceed with empty
          }
          void onToolCallRef
            .current(name, args)
            .then((output) => {
              sendEvent({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id, output },
              });
              sendEvent({ type: "response.create" });
            })
            .catch((err: unknown) => {
              const errMsg = err instanceof Error ? err.message : "Tool call failed";
              sendEvent({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id,
                  output: JSON.stringify({ error: errMsg }),
                },
              });
              sendEvent({ type: "response.create" });
            });
          break;
        }

        case "error": {
          const errMsg = (msg.error as { message?: string } | undefined)?.message;
          console.error("[realtime] DataChannel error event:", msg);
          toast.error(errMsg ?? "Voice chat error");
          break;
        }
      }
    },
    [sendEvent],
  );

  const connect = useCallback(async () => {
    setStatus("connecting");
    try {
      // 1. Get ephemeral token from server (send chosen voice)
      const res = await fetch("/api/openai/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: settingsRef.current.voice }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start session");
      }
      const { ephemeralKey } = (await res.json()) as { ephemeralKey: string };

      // 2. Microphone access
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // 3. Peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Add mic tracks
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // 5. Incoming audio → hidden audio element
      pc.ontrack = (e) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0] ?? null;
        }
      };

      // 6. ICE failure detection
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          toast.error("Voice connection lost");
          cleanup();
          setStatus("error");
        }
      };

      // 7. Data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = handleDataChannelMessage;
      dc.onerror = () => {
        toast.error("Voice data channel error");
        cleanup();
        setStatus("error");
      };

      // 8. SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 9. Exchange SDP with OpenAI
      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!sdpRes.ok) {
        const errText = await sdpRes.text().catch(() => "");
        let errMsg = "SDP exchange with OpenAI failed";
        try {
          const errJson = JSON.parse(errText) as { error?: { message?: string } };
          errMsg = errJson.error?.message ?? errMsg;
        } catch {
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }
      const answerSdp = await sdpRes.text();

      // 10. Set remote description — ICE negotiation begins
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      if (
        message.includes("Permission denied") ||
        message.includes("NotAllowedError") ||
        message.includes("NotFoundError")
      ) {
        toast.error("Please allow microphone access to use voice chat");
      } else {
        toast.error(message);
      }
      cleanup();
      setStatus("error");
    }
  }, [cleanup, handleDataChannelMessage]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  // Expose sendEvent so the parent can push text into an active voice session
  const sendVoiceText = useCallback(
    (text: string) => {
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      });
      sendEvent({ type: "response.create" });
    },
    [sendEvent],
  );

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    status,
    isSpeaking,
    isAiSpeaking,
    audioElRef,
    connect,
    disconnect,
    sendVoiceText,
  };
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  isSpeaking,
  isAiSpeaking,
}: {
  status: ConnectionStatus;
  isSpeaking: boolean;
  isAiSpeaking: boolean;
}) {
  if (status === "idle") {
    return (
      <Badge variant="secondary" className="text-xs">
        Ready
      </Badge>
    );
  }
  if (status === "connecting") {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-yellow-500">
        <Spinner className="size-3" />
        Connecting
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="text-xs">
        Error
      </Badge>
    );
  }
  if (isSpeaking) {
    return (
      <Badge className="gap-1.5 bg-green-500 text-white text-xs hover:bg-green-500">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        Listening
      </Badge>
    );
  }
  if (isAiSpeaking) {
    return (
      <Badge className="gap-1.5 bg-blue-500 text-white text-xs hover:bg-blue-500">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        Speaking
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 bg-green-500 text-white text-xs hover:bg-green-500">
      <span className="size-1.5 rounded-full bg-white" />
      Connected
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          message.pending && "opacity-80",
        )}
      >
        {message.text}
        {message.pending && (
          <span className="ml-1 inline-flex gap-0.5">
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

function SettingsPanel({
  settings,
  onChange,
  isConnected,
}: {
  settings: VoiceChatSettings;
  onChange: (next: Partial<VoiceChatSettings>) => void;
  isConnected: boolean;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-5 p-4">
        {isConnected && (
          <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs">
            Changes take effect on the next session.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Voice</Label>
          <Select value={settings.voice} onValueChange={(v) => onChange({ voice: v as VoiceId })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">System prompt</Label>
          <Textarea
            value={settings.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            className="min-h-48 resize-y text-xs"
            placeholder="Instructions for Yomi Sensei…"
          />
          <button
            type="button"
            onClick={() => onChange({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
            className="self-start text-muted-foreground text-xs underline-offset-2 hover:underline"
          >
            Reset to default
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Panel contents (shared between mobile Sheet and desktop Card)
// ---------------------------------------------------------------------------

interface PanelContentsProps {
  status: ConnectionStatus;
  messages: Message[];
  isSpeaking: boolean;
  isAiSpeaking: boolean;
  textInput: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  settings: VoiceChatSettings;
  onSettingsChange: (next: Partial<VoiceChatSettings>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function PanelContents({
  status,
  messages,
  isSpeaking,
  isAiSpeaking,
  textInput,
  onTextChange,
  onSend,
  onConnect,
  onDisconnect,
  onClose,
  showSettings,
  onToggleSettings,
  settings,
  onSettingsChange,
  messagesEndRef,
}: PanelContentsProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{showSettings ? "Settings" : "Yomi Sensei"}</span>
          {!showSettings && (
            <StatusBadge status={status} isSpeaking={isSpeaking} isAiSpeaking={isAiSpeaking} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", showSettings && "bg-accent")}
            onClick={onToggleSettings}
            aria-label="Toggle settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body: settings or messages */}
      {showSettings ? (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          isConnected={status === "active"}
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Mic className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {status === "connecting"
                    ? "Connecting to Yomi Sensei…"
                    : "Type a message or tap the mic to start practicing Japanese"}
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Footer — hidden on settings view */}
      {!showSettings && (
        <div className="shrink-0 border-t p-3">
          <div className="flex items-end gap-2">
            <Button
              variant={status === "active" ? "destructive" : "outline"}
              size="icon"
              className="shrink-0"
              onClick={status === "active" ? onDisconnect : onConnect}
              disabled={status === "connecting"}
              aria-label={status === "active" ? "End voice chat" : "Start voice chat"}
            >
              {status === "connecting" ? (
                <Spinner />
              ) : status === "active" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Textarea
              value={textInput}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Type in Japanese or English…"
              className="max-h-24 min-h-0 resize-none"
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={onSend}
              disabled={!textInput.trim()}
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function VoiceChatButton() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [settings, setSettings] = useState<VoiceChatSettings>(DEFAULT_SETTINGS);
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const createClip = api.clip.create.useMutation();
  const utils = api.useUtils();

  const handleToolCall = useCallback<ToolCallHandler>(
    async (name, args) => {
      if (name === "add_clip") {
        const { text, title, jlpt_level } = args as {
          text: string;
          title?: string;
          jlpt_level?: "N5" | "N4" | "N3" | "N2" | "N1";
        };
        await createClip.mutateAsync({
          title: title ?? "",
          content: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
          sourceLanguage: "ja",
          jlptLevel: jlpt_level,
        });
        void utils.clip.getAll.invalidate();
        toast.success("Clip saved!");
        return JSON.stringify({ success: true });
      }
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    },
    [createClip, utils.clip.getAll],
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const {
    status,
    isSpeaking,
    isAiSpeaking,
    audioElRef,
    connect,
    disconnect,
    sendVoiceText,
  } = useRealtimeSession(settings, handleToolCall, setMessages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // If voice session is active, route through the data channel
      if (status === "active") {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
        sendVoiceText(trimmed);
        return;
      }

      // Otherwise use the text chat API (no voice session needed)
      const userMsgId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      const history = messagesRef.current.map((m) => ({ role: m.role, content: m.text }));

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: trimmed },
        { id: assistantId, role: "assistant", text: "", pending: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: trimmed }],
            systemPrompt: settings.systemPrompt,
          }),
        });
        if (!res.ok || !res.body) throw new Error("Chat request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m)),
          );
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Chat failed");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    },
    [status, sendVoiceText, settings.systemPrompt],
  );

  const handleSend = async () => {
    if (!textInput.trim()) return;
    await sendTextMessage(textInput);
    setTextInput("");
  };

  const handleSettingsChange = (next: Partial<VoiceChatSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  };

  const panelProps: PanelContentsProps = {
    status,
    messages,
    isSpeaking,
    isAiSpeaking,
    textInput,
    onTextChange: setTextInput,
    onSend: handleSend,
    onConnect: connect,
    onDisconnect: disconnect,
    onClose: () => setOpen(false),
    showSettings,
    onToggleSettings: () => setShowSettings((s) => !s),
    settings,
    onSettingsChange: handleSettingsChange,
    messagesEndRef,
  };

  return (
    <>
      {/* biome-ignore lint/a11y/useMediaCaption: AI realtime speech — no captions available */}
      <audio ref={audioElRef} autoPlay className="hidden" aria-hidden="true" />

      {/* Floating trigger button — hidden when panel is open */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        hidden={open}
        className={cn(
          "fixed right-6 bottom-6 z-50",
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          status === "active"
            ? "bg-primary text-primary-foreground"
            : "border border-input bg-background text-foreground hover:bg-accent",
        )}
        aria-label="Open voice chat"
      >
        {status === "connecting" ? <Spinner className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {status === "active" && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        )}
      </button>

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="h-[85dvh] p-0">
            <SheetTitle className="sr-only">Yomi Sensei — Voice Chat</SheetTitle>
            <PanelContents {...panelProps} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: floating card */}
      {!isMobile && open && (
        <div
          className={cn(
            "fixed right-6 bottom-6 z-40 w-[380px]",
            "h-[540px] overflow-hidden rounded-xl border bg-card shadow-2xl",
            "slide-in-from-bottom-4 fade-in-0 animate-in duration-200",
          )}
        >
          <PanelContents {...panelProps} />
        </div>
      )}
    </>
  );
}
