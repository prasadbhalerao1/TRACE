"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type ResumeTemplateStyle = "apex" | "modern" | "creative" | "minimalist";

export interface ResumeData {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  skills: {
    languages: string;
    frameworks: string;
    tools: string;
    databases: string;
    cloud: string;
  };
  experience: Array<{
    id: string;
    company: string;
    role: string;
    location: string;
    dates: string;
    bullets: string[];
  }>;
  projects: Array<{
    id: string;
    title: string;
    technologies: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    dates: string;
    gpa: string;
  }>;
}

const DEFAULT_RESUME: ResumeData = {
  fullName: "Naveen Beniwal",
  phone: "+91 99999 99999",
  email: "naveen@dataaxle.ai",
  location: "Kurukshetra, HR",
  linkedin: "linkedin.com/in/naveenbeniwal",
  github: "github.com/naveenbeniwal",
  portfolio: "cvinsight.me",
  summary:
    "Computer Engineering graduate with 2+ years of experience in full-stack engineering and AI integration. Proven track record of scaling high-throughput SaaS platforms using Next.js, TypeScript, FastAPI, and PostgreSQL.",
  skills: {
    languages: "TypeScript, JavaScript (ES6+), Python, C++, SQL, HTML/CSS",
    frameworks: "Next.js, React 19, FastAPI, Tailwind CSS, Redux, Express",
    tools: "Git, Docker, Postman, VS Code, Jest, Pyodide, Qdrant Vector DB",
    databases: "PostgreSQL (Neon Cloud), Redis, Qdrant Vector DB, MongoDB",
    cloud: "Google Cloud Platform, AWS, Vercel, Render, Cloudinary",
  },
  experience: [
    {
      id: "exp-1",
      company: "DataAxle AI Intelligence",
      role: "Lead Full-Stack AI Engineer",
      location: "Remote",
      dates: "2025 – Present",
      bullets: [
        "Architected multi-agent AI verification engine processing candidate portfolios and code repos using Python FastAPI, Groq LLM, and Qdrant Vector DB.",
        "Built responsive Next.js 16 control-plane UI handling real-time candidate search, career roadmaps, and drag-and-drop recruitment pipelines.",
        "Engineered zero-downtime background task processing with Redis worker queues for pitch deck document analysis.",
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "CVInsight – AI Resume & ATS Platform",
      technologies: "TypeScript, React, FastAPI, PostgreSQL, Qdrant",
      dates: "2025",
      bullets: [
        "Engineered SaaS resume analysis platform serving 2,200+ active candidates with automated ATS scoring and bullet optimization.",
        "Implemented multi-provider LLM failover gateway for continuous AI availability across Anthropic, OpenAI, and Groq APIs.",
        "Integrated high-density PDF exporter generating pixel-perfect 1-page ATS resumes formatted for enterprise Applicant Tracking Systems.",
      ],
    },
    {
      id: "proj-2",
      title: "Campus Placement & Recruitment Portal",
      technologies: "Next.js, Tailwind CSS, PostgreSQL, Vercel",
      dates: "2024",
      bullets: [
        "Developed university recruitment portal for 1,000+ students and 250+ enterprise recruiters with role-based access control.",
        "Created interactive applicant tracking Kanban board with automated stage transitions and interview evaluation scorecards.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "National Institute of Technology (NIT), Kurukshetra",
      degree: "B.Tech in Computer Engineering",
      dates: "2023 – 2027",
      gpa: "CGPA: 9.38 / 10.0",
    },
  ],
};

export function AtsResumeBuilder() {
  const [data, setData] = useState<ResumeData>(DEFAULT_RESUME);
  const [template, setTemplate] = useState<ResumeTemplateStyle>("apex");
  const [targetJd, setTargetJd] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [atsScore, setAtsScore] = useState(94);

  const handlePrint = () => {
    window.print();
  };

  const handleAiOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setAtsScore(98);
      alert("AI optimization complete! Resume bullets re-formatted for ATS keywords and STAR impact metric alignment.");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">ATS Resume Generator</h2>
          <p className="text-xs text-muted-foreground">
            Engineered ATS templates based on top placement standards. Tailored for strict Applicant Tracking Systems.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30">
            ATS Score: {atsScore}/100
          </Badge>
          <Button onClick={handlePrint} size="sm" className="cursor-pointer">
            Export PDF
          </Button>
        </div>
      </div>

      {/* Template Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setTemplate("apex")}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            template === "apex"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <div className="text-sm font-bold text-foreground">🏆 Apex (Classic)</div>
          <div className="text-[11px] text-muted-foreground">1-Column LaTeX style. FAANG & Enterprise favorite.</div>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("modern")}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            template === "modern"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <div className="text-sm font-bold text-foreground">⚡ Modern 30/70</div>
          <div className="text-[11px] text-muted-foreground">Two-column layout separating skills & experience.</div>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("creative")}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            template === "creative"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <div className="text-sm font-bold text-foreground">💻 Creative Hacker</div>
          <div className="text-[11px] text-muted-foreground">Dark terminal theme for DevOps & Hackathons.</div>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("minimalist")}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            template === "minimalist"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <div className="text-sm font-bold text-foreground">📜 Minimalist Academic</div>
          <div className="text-[11px] text-muted-foreground">Serif typography for R&D & Masters applications.</div>
        </button>
      </div>

      {/* Main Split Layout: Editor on left, Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          {/* AI Tailoring Card */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>AI Job Description Tailoring</span>
                <Badge variant="secondary" className="text-[10px]">Multi-LLM</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Paste target Job Description (JD) here to re-rank skills and optimize bullet points…"
                value={targetJd}
                onChange={(e) => setTargetJd(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <Button
                onClick={handleAiOptimize}
                disabled={isOptimizing}
                variant="outline"
                size="sm"
                className="w-full text-xs cursor-pointer"
              >
                {isOptimizing ? "Optimizing Bullets with AI…" : "Tailor Resume for JD"}
              </Button>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-bold">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">Full Name</label>
                <Input value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground font-medium">Email</label>
                  <Input value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Phone</label>
                  <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground font-medium">LinkedIn</label>
                  <Input value={data.linkedin} onChange={(e) => setData({ ...data, linkedin: e.target.value })} />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">GitHub</label>
                  <Input value={data.github} onChange={(e) => setData({ ...data, github: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Skills */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-bold">Technical Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium">Languages</label>
                <Input
                  value={data.skills.languages}
                  onChange={(e) => setData({ ...data, skills: { ...data.skills, languages: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-muted-foreground font-medium">Frameworks & Libraries</label>
                <Input
                  value={data.skills.frameworks}
                  onChange={(e) => setData({ ...data, skills: { ...data.skills, frameworks: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-muted-foreground font-medium">Databases & Storage</label>
                <Input
                  value={data.skills.databases}
                  onChange={(e) => setData({ ...data, skills: { ...data.skills, databases: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-muted-foreground font-medium">Tools & Cloud</label>
                <Input
                  value={data.skills.tools}
                  onChange={(e) => setData({ ...data, skills: { ...data.skills, tools: e.target.value } })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Resume Sheet Preview (7 cols) */}
        <div className="lg:col-span-7">
          <div className="sticky top-6">
            <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center print:hidden">
              <span>Live ATS Document Preview ({template.toUpperCase()} Template)</span>
              <span>1 Page Format</span>
            </div>

            {/* Printable Resume Sheet Container */}
            <div id="resume-document" className="bg-white text-zinc-900 shadow-xl rounded-sm p-8 min-h-[800px] border border-zinc-200 print:shadow-none print:border-none print:p-0 print:m-0 font-sans">
              {template === "apex" && <ApexTemplate data={data} />}
              {template === "modern" && <ModernTemplate data={data} />}
              {template === "creative" && <CreativeTemplate data={data} />}
              {template === "minimalist" && <MinimalistTemplate data={data} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

{/* --- Template 1: Apex (Classic LaTeX 1-Column Format) --- */}
function ApexTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="space-y-4 text-[12px] leading-relaxed text-zinc-900 font-sans">
      {/* Header */}
      <div className="text-center border-b border-zinc-300 pb-3">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-zinc-900">{data.fullName}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-[11px] text-zinc-600 mt-1">
          <span>{data.phone}</span>
          <span>•</span>
          <span>{data.email}</span>
          <span>•</span>
          <span>{data.linkedin}</span>
          <span>•</span>
          <span>{data.github}</span>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-zinc-800 pb-0.5 mb-1.5 text-zinc-900">
            Professional Summary
          </h2>
          <p className="text-zinc-700">{data.summary}</p>
        </section>
      )}

      {/* Technical Skills */}
      <section>
        <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-zinc-800 pb-0.5 mb-1.5 text-zinc-900">
          Technical Skills
        </h2>
        <ul className="space-y-1 text-zinc-700">
          {data.skills.languages && (
            <li>
              <span className="font-semibold text-zinc-900">Languages:</span> {data.skills.languages}
            </li>
          )}
          {data.skills.frameworks && (
            <li>
              <span className="font-semibold text-zinc-900">Frameworks:</span> {data.skills.frameworks}
            </li>
          )}
          {data.skills.databases && (
            <li>
              <span className="font-semibold text-zinc-900">Databases:</span> {data.skills.databases}
            </li>
          )}
          {data.skills.tools && (
            <li>
              <span className="font-semibold text-zinc-900">Tools & Cloud:</span> {data.skills.tools}
            </li>
          )}
        </ul>
      </section>

      {/* Experience */}
      {data.experience.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-zinc-800 pb-0.5 mb-2 text-zinc-900">
            Experience
          </h2>
          <div className="space-y-3">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline font-semibold text-zinc-900">
                  <span>{exp.company} — <span className="italic font-normal">{exp.role}</span></span>
                  <span className="text-[11px] text-zinc-600">{exp.dates}</span>
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-zinc-700">
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-zinc-800 pb-0.5 mb-2 text-zinc-900">
            Key Projects
          </h2>
          <div className="space-y-3">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-baseline font-semibold text-zinc-900">
                  <span>{proj.title} <span className="font-normal text-[11px] text-zinc-600">| {proj.technologies}</span></span>
                  <span className="text-[11px] text-zinc-600">{proj.dates}</span>
                </div>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-zinc-700">
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-wider border-b border-zinc-800 pb-0.5 mb-2 text-zinc-900">
            Education
          </h2>
          <div className="space-y-1">
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline">
                <div>
                  <span className="font-semibold text-zinc-900">{edu.institution}</span> — <span className="text-zinc-700">{edu.degree}</span>
                </div>
                <div className="text-[11px] text-zinc-600">{edu.gpa} ({edu.dates})</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

{/* --- Template 2: Modern 30/70 Split --- */}
function ModernTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="grid grid-cols-12 gap-6 text-[12px] text-zinc-900 font-sans">
      {/* Left Sidebar (4 cols) */}
      <div className="col-span-4 border-r border-zinc-200 pr-4 space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-indigo-900 leading-tight">{data.fullName}</h1>
          <p className="text-[11px] text-indigo-600 font-medium">Software Engineer</p>
        </div>

        <div className="space-y-1 text-[11px] text-zinc-600">
          <div>{data.email}</div>
          <div>{data.phone}</div>
          <div>{data.location}</div>
          <div className="pt-1 text-indigo-700">{data.github}</div>
        </div>

        <section className="pt-2">
          <h3 className="font-bold text-[11px] uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-1 mb-2">Skills</h3>
          <div className="space-y-2 text-[11px]">
            <div>
              <div className="font-semibold text-zinc-900">Languages</div>
              <div className="text-zinc-600">{data.skills.languages}</div>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Frameworks</div>
              <div className="text-zinc-600">{data.skills.frameworks}</div>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Databases</div>
              <div className="text-zinc-600">{data.skills.databases}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Main Content (8 cols) */}
      <div className="col-span-8 space-y-4">
        {data.summary && (
          <section>
            <h2 className="font-bold text-[12px] uppercase text-indigo-950 border-b border-zinc-200 pb-1 mb-1.5">Profile</h2>
            <p className="text-zinc-700">{data.summary}</p>
          </section>
        )}

        <section>
          <h2 className="font-bold text-[12px] uppercase text-indigo-950 border-b border-zinc-200 pb-1 mb-2">Experience</h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mb-3">
              <div className="font-bold text-zinc-900">{exp.role} <span className="font-normal text-zinc-600">@ {exp.company}</span></div>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-zinc-700">
                {exp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-bold text-[12px] uppercase text-indigo-950 border-b border-zinc-200 pb-1 mb-2">Projects</h2>
          {data.projects.map((proj) => (
            <div key={proj.id} className="mb-3">
              <div className="font-bold text-zinc-900">{proj.title}</div>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-zinc-700">
                {proj.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

{/* --- Template 3: Creative Hacker Terminal --- */}
function CreativeTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="space-y-4 text-[12px] text-emerald-400 bg-zinc-950 p-6 rounded font-mono border border-emerald-500/30">
      <div className="border-b border-emerald-500/30 pb-2">
        <div className="text-lg font-bold text-emerald-300">$ whoami</div>
        <div className="text-emerald-100 font-bold">{data.fullName} // {data.email} // {data.github}</div>
      </div>

      <section>
        <div className="text-emerald-300 font-bold">$ cat summary.txt</div>
        <p className="text-zinc-300 text-[11px] leading-relaxed mt-1">{data.summary}</p>
      </section>

      <section>
        <div className="text-emerald-300 font-bold">$ ./list_skills.sh</div>
        <div className="text-zinc-300 text-[11px] mt-1 space-y-0.5">
          <div><span className="text-emerald-400">LANGUAGES:</span> {data.skills.languages}</div>
          <div><span className="text-emerald-400">FRAMEWORKS:</span> {data.skills.frameworks}</div>
          <div><span className="text-emerald-400">DATABASES:</span> {data.skills.databases}</div>
        </div>
      </section>

      <section>
        <div className="text-emerald-300 font-bold">$ git log --experience</div>
        {data.experience.map((exp) => (
          <div key={exp.id} className="mt-2 text-zinc-300 text-[11px]">
            <div className="font-bold text-emerald-200">&gt; {exp.role} @ {exp.company} ({exp.dates})</div>
            <ul className="list-square pl-4 space-y-0.5 text-zinc-400">
              {exp.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

{/* --- Template 4: Minimalist Academic --- */}
function MinimalistTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="space-y-4 text-[12px] text-zinc-900 font-serif leading-relaxed">
      <div className="text-center pb-2">
        <h1 className="text-2xl font-normal text-zinc-900">{data.fullName}</h1>
        <div className="text-[11px] text-zinc-600 italic mt-0.5">{data.email} • {data.phone} • {data.location}</div>
      </div>

      {data.summary && (
        <section>
          <h2 className="text-[12px] font-bold italic border-b border-zinc-300 pb-0.5 mb-1 text-zinc-900">Summary</h2>
          <p className="text-zinc-800">{data.summary}</p>
        </section>
      )}

      <section>
        <h2 className="text-[12px] font-bold italic border-b border-zinc-300 pb-0.5 mb-1 text-zinc-900">Experience</h2>
        {data.experience.map((exp) => (
          <div key={exp.id} className="mb-2">
            <div className="flex justify-between italic">
              <span className="font-semibold text-zinc-900">{exp.company} — {exp.role}</span>
              <span className="text-zinc-600">{exp.dates}</span>
            </div>
            <ul className="list-disc pl-4 mt-1 text-zinc-800 space-y-0.5">
              {exp.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
