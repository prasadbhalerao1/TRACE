"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { endInterview, grantConsent, interviewTurn, startInterview, type InterviewReportResponse } from "@/lib/api";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

// Web Speech API isn't in the standard TS lib — feature-detected at runtime, typed as
// unknown here rather than pulling in a whole ambient-types package for one page.
type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
};

export default function CandidateInterviewPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [consentGiven, setConsentGiven] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(params.sessionId !== "new" ? params.sessionId : null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<"in_progress" | "completed" | null>(null);
  const [report, setReport] = useState<InterviewReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  async function handleConsentAndStart() {
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await grantConsent(token, "ai_interview");
      const result = await startInterview(token);
      setSessionId(result.session_id);
      setStatus(result.status);
      if (result.question) setMessages([{ role: "ai", text: result.question }]);
      setConsentGiven(true);
      router.replace(`/interview/${result.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview");
    }
  }

  async function handleSend() {
    if (!inputText.trim() || !sessionId) return;
    const userMsg = inputText;
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const result = await interviewTurn(token, sessionId, userMsg);
      setStatus(result.status);
      if (result.question) {
        setMessages((prev) => [...prev, { role: "ai", text: result.question as string }]);
      } else if (result.status === "completed") {
        setMessages((prev) => [...prev, { role: "ai", text: "That covers everything — generating your report now…" }]);
        const finalReport = await endInterview(token, sessionId);
        setReport(finalReport);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send answer");
    }
  }

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognitionCtor =
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Speech recognition isn't supported in this browser — use the text box instead.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: unknown) => {
      const event = e as { results: { transcript: string }[][] };
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript;
      if (transcript) setInputText(transcript);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  useEffect(() => {
    // "SpeechSynthesis" TTS: speak the latest AI question aloud, browser-native, no
    // audio persisted anywhere (doc 03 §3).
    const last = messages[messages.length - 1];
    if (last?.role === "ai" && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(last.text));
    }
  }, [messages]);

  if (!consentGiven && !sessionId) {
    return (
      <div className="max-w-lg mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Consent to AI Interview</CardTitle>
            <CardDescription>
              This session is text-transcript based — no audio is recorded or stored, only the
              transcript. Speech input (if used) is converted to text entirely in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            <Button onClick={handleConsentAndStart} className="w-full">I Consent — Start Interview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (report) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Interview Complete</CardTitle>
            <CardDescription>Your report has been generated and shared with the recruiter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate">
            <p>Technical Rating: {report.technical_rating?.toFixed(0) ?? "—"}/100</p>
            <p>Communication Rating: {report.communication_rating?.toFixed(0) ?? "—"}/100</p>
            <p>{report.hiring_recommendation}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">AI Interview</h1>
        <p className="text-sm text-slate">Speak or type your answers. {status === "completed" ? "Wrapping up…" : ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Session</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50 dark:bg-zinc-900 rounded-md border">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === "ai" ? "bg-white dark:bg-zinc-800 text-ink dark:text-zinc-50 shadow-sm" : "bg-primary text-primary-foreground"}`}>
                    <p className="font-semibold text-xs mb-1 opacity-70">{m.role === "ai" ? "AI Interviewer" : "You"}</p>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {error && <p className="text-sm text-rose-flagged">{error}</p>}
            </div>

            <div className="flex gap-2">
              <Button onClick={toggleSpeech} variant={listening ? "destructive" : "secondary"}>
                {listening ? "Listening..." : "🎤 Speak"}
              </Button>
              <input
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-background text-foreground focus:outline-none focus:ring-1"
                placeholder="Type your response..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend}>Send</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate space-y-2">
              <p>Speak or type your answer, then press Send. The interviewer adapts follow-up questions based on your answers.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
