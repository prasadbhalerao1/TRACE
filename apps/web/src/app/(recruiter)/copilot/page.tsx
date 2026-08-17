"use client";

import { Page, PageHeader } from "@/components/common/PageHeader";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { postCopilotQuery, type CopilotResult } from "@/lib/api";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
  results?: CopilotResult[];
}

function formatResults(results: CopilotResult[]): string {
  if (results.length === 0)
    return "I couldn't find any candidates matching that search.";
  return `I found ${results.length} candidate(s) matching your description.`;
}

export default function RecruiterCopilotPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Hello! I am your Recruitment Copilot. Ask me to find candidates (e.g. 'Find backend developers with React and Python experience')",
    },
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!input.trim() || searching) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setSearching(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const response = await postCopilotQuery(token, userMsg, conversationId);
      setConversationId(response.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: formatResults(response.results),
          results: response.results,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Copilot"
        description="Describe who you are looking for in plain language and search across verified evidence."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Copilot Chat
            </CardTitle>
            <CardDescription>
              Structured filters + Qdrant semantic re-rank + Claude explanation,
              per doc 02 §3.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-card rounded-md border">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === "ai" ? "bg-card text-foreground shadow-flat border border-border" : "bg-primary text-primary-foreground"}`}
                  >
                    <p className="font-semibold text-xs mb-1 opacity-70">
                      {m.role === "ai" ? "Recruiter Copilot" : "You"}
                    </p>
                    <p>{m.text}</p>
                    {m.results && m.results.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {m.results.map((r) => (
                          <li
                            key={r.candidate_id}
                            className="border-t border-border/50 pt-1"
                          >
                            {r.match_percentage !== null && (
                              <span className="font-semibold">
                                {r.match_percentage.toFixed(0)}% —{" "}
                              </span>
                            )}
                            {r.explanation}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {searching && (
                <div className="flex justify-start">
                  <div className="bg-card text-muted-foreground p-3 rounded-lg text-sm border">
                    Understanding your query and searching the candidate pool…
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-background text-foreground focus:outline-none"
                placeholder="Ask Copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} disabled={searching}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Search Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <div>
                <p className="font-semibold mb-1">Try these searches:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• &quot;Find Python developers&quot;</li>
                  <li>• &quot;Find React developers&quot;</li>
                  <li>• &quot;Fullstack with Python and React&quot;</li>
                  <li>• &quot;Show candidates in San Francisco&quot;</li>
                  <li>• &quot;Find 75+ coding ability&quot;</li>
                </ul>
              </div>
              <div className="border-t pt-2">
                <p className="font-semibold mb-1">Refine results:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• &quot;Now show only San Francisco&quot;</li>
                  <li>• &quot;Filter to 75+ scores&quot;</li>
                  <li>• &quot;Who has best problem solving?&quot;</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
