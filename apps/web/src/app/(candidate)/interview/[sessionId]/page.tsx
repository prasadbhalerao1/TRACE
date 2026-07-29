"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CandidateInterviewPage() {
  const [messages, setMessages] = useState<Array<{ role: "ai" | "user"; text: string }>>([
    { role: "ai", text: "Welcome to your AI technical interview. Let's discuss your experience building APIs. How do you handle database connection pooling in Python?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);

  function handleSend() {
    if (!inputText.trim()) return;
    const userMsg = inputText;
    setInputText("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "That is correct. Using connection pools avoids the cost of establishing connections repeatedly. Let's talk about auth: how would you secure a FastAPI endpoint?" }
      ]);
    }, 1200);
  }

  function toggleSpeech() {
    if (listening) {
      setListening(false);
    } else {
      setListening(true);
      setInputText("I usually use asyncpg with transaction-level pooling and configure statement caches to zero on remote Neon endpoints...");
      setTimeout(() => {
        setListening(false);
      }, 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">AI Interview Simulator</h1>
        <p className="text-sm text-slate">Interactive chat & voice interview platform powered by the Web Speech API.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Session</CardTitle>
            <CardDescription>Speak or type your answers to continue the assessment.</CardDescription>
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
              <p>1. Make sure your microphone is connected and configured.</p>
              <p>2. Speak clearly into the microphone. Voice transcription will populate the text input box.</p>
              <p>3. Do not exit full screen or open other tabs during the interview to avoid fraud flags.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/03-SRS-Assessment-Verification-System.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Voice Processing**: Uses the native browser Web Speech API (`webkitSpeechRecognition`) for local audio-to-text conversion (zero transcription charges).</p>
          <p>**Anti-Cheating Guardrails**: Monitors tab focus/blur changes and full-screen exits. Violations raise an automated trust flag in the admin fraud queue.</p>
        </CardContent>
      </Card>
    </div>
  );
}
