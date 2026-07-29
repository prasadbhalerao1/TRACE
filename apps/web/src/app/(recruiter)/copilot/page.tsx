"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RecruiterCopilotPage() {
  const [messages, setMessages] = useState<Array<{ role: "ai" | "user"; text: string }>>([
    { role: "ai", text: "Hello! I am your Recruitment Copilot. Ask me to find candidates (e.g. 'Find backend developers with React and Python experience who won hackathons')" }
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setSearching(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "I found 2 candidates matching your description:\n1. Alice Johnson (97% Match) - Python, FastAPI, React. Won DataAxle Summer Hackathon.\n2. Bob Smith (89% Match) - Python, Django, PostgreSQL. Active contributor.\n\nWould you like to add these candidates to your active screening pipeline?" }
      ]);
      setSearching(false);
    }, 1500);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Recruiter Copilot</h1>
        <p className="text-sm text-slate">Search for talent using conversational natural language commands.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Copilot Chat</CardTitle>
            <CardDescription>Conversational search runs through semantic Qdrant lookups and LLM synthesis.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50 dark:bg-zinc-900 rounded-md border">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === "ai" ? "bg-white dark:bg-zinc-800 text-ink dark:text-zinc-50 shadow-sm border border-border" : "bg-primary text-primary-foreground"}`}>
                    <p className="font-semibold text-xs mb-1 opacity-70">{m.role === "ai" ? "Recruiter Copilot" : "You"}</p>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {searching && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 text-slate p-3 rounded-lg text-sm border">
                    Querying vector models...
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-background text-foreground focus:outline-none"
                placeholder="Ask Copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} disabled={searching}>Search</Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Search Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>You can search by:
                <br />• **Skills**: &quot;with Python and React&quot;
                <br />• **Badges**: &quot;who have verified security badges&quot;
                <br />• **Location**: &quot;based in Bangalore&quot;
                <br />• **Complexity**: &quot;who worked on high complexity databases&quot;
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Natural Language Parser**: Calls `POST /recruiter/copilot`. It processes query embeddings, queries Qdrant database clusters, filters using Postgres, and parses outputs using Claude 3.5 Sonnet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
