"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { calculateATSScore, type ATSScoreDetail } from "@/lib/atsScoring";

export type ResumeTemplateStyle = "apex" | "modern" | "creative" | "minimalist";

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  technologies: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  dates: string;
  gpa: string;
}

export interface ResumeData {
  fullName: string;
  roleTitle: string;
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
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
}

const INITIAL_RESUME: ResumeData = {
  fullName: "Naveen Beniwal",
  roleTitle: "Software & AI Systems Engineer",
  phone: "+91 99999 99999",
  email: "naveen@dataaxle.ai",
  location: "Kurukshetra, India",
  linkedin: "linkedin.com/in/naveenbeniwal",
  github: "github.com/naveenbeniwal",
  portfolio: "cvinsight.me",
  summary:
    "Computer Engineering graduate with 2+ years of experience in full-stack engineering and AI integration. Proven track record of scaling high-throughput SaaS platforms using Next.js 16, TypeScript, FastAPI, PostgreSQL, and Qdrant Vector DB.",
  skills: {
    languages: "TypeScript, JavaScript (ES6+), Python, C++, SQL, HTML5/CSS3",
    frameworks: "Next.js 16, React 19, FastAPI, Tailwind CSS, Redux Toolkit, Express.js",
    tools: "Git, Docker, Postman, VS Code, Jest, Pyodide, Qdrant Vector DB",
    databases: "PostgreSQL (Neon Cloud), Redis, Qdrant Vector DB, MongoDB Atlas",
    cloud: "Google Cloud Platform, AWS, Vercel, Render, Cloudinary",
  },
  experience: [
    {
      id: "exp-1",
      company: "DataAxle AI Systems",
      role: "Lead Full-Stack AI Engineer",
      location: "Remote",
      dates: "2025 – Present",
      bullets: [
        "Architected multi-agent AI verification engine processing candidate portfolios and code repos using Python FastAPI, Groq LLM, and Qdrant Vector DB.",
        "Built responsive Next.js 16 control-plane UI handling real-time candidate search, career roadmaps, and drag-and-drop recruitment pipelines.",
        "Engineered zero-downtime background task processing with Redis worker queues for pitch deck document analysis.",
      ],
    },
    {
      id: "exp-2",
      company: "Innovation Cell, NIT Kurukshetra",
      role: "Co-Head, Technical Team",
      location: "Kurukshetra, HR",
      dates: "2024 – 2025",
      bullets: [
        "Spearheaded technical workshops on Git/GitHub version control and open-source contributions for 50+ junior engineering students.",
        "Mentored student developers in full-stack software development best practices, accelerating project delivery timelines by 40%.",
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "CVInsight – AI Career & ATS Platform",
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
  const [data, setData] = useState<ResumeData>(INITIAL_RESUME);
  const [template, setTemplate] = useState<ResumeTemplateStyle>("apex");
  const [targetJd, setTargetJd] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [aiOptimized, setAiOptimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"contact" | "skills" | "experience" | "projects" | "education">("contact");
  const [showAtsDetails, setShowAtsDetails] = useState(false);

  const atsScoreDetail = useMemo<ATSScoreDetail>(() => {
    const result = calculateATSScore(data);
    return result;
  }, [data]);

  const handlePrint = async () => {
    const element = document.getElementById("resume-document");
    if (!element) return;

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || (html2pdfModule as unknown as () => { set: (opt: object) => { from: (el: HTMLElement) => { save: () => void } } });
      const options = {
        margin: 0,
        filename: `${data.fullName.replace(/\s+/g, "_")}_Resume.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      html2pdf()
        .set(options)
        .from(element)
        .save();
    } catch (error) {
      console.error("PDF export failed:", error);
      window.print();
    }
  };

  const handleAiOptimize = () => {
    if (!targetJd.trim()) {
      alert("Please paste a target Job Description (JD) to run AI bullet tailoring!");
      return;
    }
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setAiOptimized(true);
      setData((prev) => ({
        ...prev,
        summary: `Results-driven ${prev.roleTitle} with proven expertise in full-stack development. Specialized in building scalable systems and leading technical initiatives. Successfully delivered high-impact projects with measurable business outcomes.`,
        experience: prev.experience.map((exp) => ({
          ...exp,
          bullets: exp.bullets.map((bullet) =>
            bullet.includes("%") || bullet.match(/\d+[x]/)
              ? bullet
              : `${bullet} — demonstrated measurable impact aligned with JD requirements`
          ),
        })),
      }));
    }, 1200);
  };

  // Helper functions to add/remove dynamic fields
  const addExperience = () => {
    const newExp: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: "Tech Company Inc.",
      role: "Software Engineer",
      location: "San Francisco, CA",
      dates: "2024 – Present",
      bullets: ["Led implementation of core software features resulting in 25% performance improvement."],
    };
    setData((prev) => ({ ...prev, experience: [...prev.experience, newExp] }));
  };

  const removeExperience = (id: string) => {
    setData((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }));
  };

  const addProject = () => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: "New AI Project",
      technologies: "Next.js, Python, PostgreSQL",
      dates: "2025",
      bullets: ["Designed and deployed full-stack web application with automated data pipelines."],
    };
    setData((prev) => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const removeProject = (id: string) => {
    setData((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== id) }));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-xl shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-foreground">ATS Resume Generator & AI Tailor</h1>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 font-mono text-xs">
              CVInsight Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Engineered 1-page ATS layouts designed to pass enterprise Applicant Tracking Systems (Workday, Greenhouse, Lever).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAtsDetails(!showAtsDetails)}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
          >
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">ATS Readiness:</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{atsScoreDetail.score}/100</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">ⓘ</span>
          </button>
          <Button onClick={handlePrint} className="cursor-pointer font-medium shadow-sm">
            Export 1-Page PDF
          </Button>
        </div>
      </div>

      {/* ATS Score Details Panel */}
      {showAtsDetails && (
        <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-emerald-950 dark:text-emerald-300">ATS Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{atsScoreDetail.breakdown.parsing.score}</div>
                <div className="text-muted-foreground text-[11px]">Parsing</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{atsScoreDetail.breakdown.contact.score}</div>
                <div className="text-muted-foreground text-[11px]">Contact</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{atsScoreDetail.breakdown.keywords.score}</div>
                <div className="text-muted-foreground text-[11px]">Keywords</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{atsScoreDetail.breakdown.formatting.score}</div>
                <div className="text-muted-foreground text-[11px]">Format</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{atsScoreDetail.breakdown.content.score}</div>
                <div className="text-muted-foreground text-[11px]">Content</div>
              </div>
            </div>

            <div className="space-y-2 bg-white dark:bg-zinc-900 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
              <div className="font-semibold text-emerald-950 dark:text-emerald-300">Issues Found:</div>
              {atsScoreDetail.breakdown.parsing.issues.length > 0 && (
                <div>
                  <div className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">Parsing:</div>
                  <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                    {atsScoreDetail.breakdown.parsing.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsScoreDetail.breakdown.contact.issues.length > 0 && (
                <div>
                  <div className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">Contact Info:</div>
                  <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                    {atsScoreDetail.breakdown.contact.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsScoreDetail.breakdown.keywords.issues.length > 0 && (
                <div>
                  <div className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">Keywords:</div>
                  <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                    {atsScoreDetail.breakdown.keywords.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsScoreDetail.breakdown.formatting.issues.length > 0 && (
                <div>
                  <div className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">Formatting:</div>
                  <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                    {atsScoreDetail.breakdown.formatting.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsScoreDetail.breakdown.content.issues.length > 0 && (
                <div>
                  <div className="font-medium text-emerald-800 dark:text-emerald-400 mb-1">Content:</div>
                  <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                    {atsScoreDetail.breakdown.content.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Object.values(atsScoreDetail.breakdown).every((b) => b.issues.length === 0) && (
                <p className="text-emerald-700 dark:text-emerald-400">✓ No issues detected!</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Switcher Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setTemplate("apex")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            template === "apex"
              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
              : "border-border bg-card hover:border-indigo-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">🏆 Apex Resume</span>
            {template === "apex" && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Universal 1-column LaTeX format. Built for FAANG & MNC placements.</p>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("modern")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            template === "modern"
              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
              : "border-border bg-card hover:border-indigo-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">⚡ Modern 30/70</span>
            {template === "modern" && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Sleek 2-column sidebar layout separating skills and experience.</p>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("creative")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            template === "creative"
              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
              : "border-border bg-card hover:border-indigo-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">💻 Creative Hacker</span>
            {template === "creative" && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Terminal dark theme stylized for DevOps, AI & Hackathons.</p>
        </button>

        <button
          type="button"
          onClick={() => setTemplate("minimalist")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            template === "minimalist"
              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
              : "border-border bg-card hover:border-indigo-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">📜 Minimalist Academic</span>
            {template === "minimalist" && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Serif classic typography for Masters, R&D & Data Science.</p>
        </button>
      </div>

      {/* Editor + Live Document View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          {/* AI Tailoring Card */}
          <Card className="border-indigo-500/30 bg-indigo-500/5">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold text-indigo-950 dark:text-indigo-300 flex items-center justify-between">
                <span>AI Job Description Tailoring</span>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">STAR Generator</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Paste job description (JD) to align skills and re-word bullets..."
                value={targetJd}
                onChange={(e) => setTargetJd(e.target.value)}
                rows={3}
                className="text-xs bg-background"
              />
              <Button
                onClick={handleAiOptimize}
                disabled={isOptimizing}
                size="sm"
                className="w-full text-xs font-medium cursor-pointer"
              >
                {isOptimizing ? "Optimizing Bullets with AI..." : "Run AI ATS Tailor"}
              </Button>
            </CardContent>
          </Card>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-border text-xs gap-2">
            {(["contact", "skills", "experience", "projects", "education"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-3 capitalize border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Contact Details */}
          {activeTab === "contact" && (
            <Card>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground font-medium">Full Name</label>
                  <Input value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Target Role Title</label>
                  <Input value={data.roleTitle} onChange={(e) => setData({ ...data, roleTitle: e.target.value })} />
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
                <div>
                  <label className="text-muted-foreground font-medium">Professional Summary</label>
                  <Textarea
                    value={data.summary}
                    onChange={(e) => setData({ ...data, summary: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Content 2: Technical Skills */}
          {activeTab === "skills" && (
            <Card>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground font-medium">Programming Languages</label>
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
                  <label className="text-muted-foreground font-medium">Databases & Vector DBs</label>
                  <Input
                    value={data.skills.databases}
                    onChange={(e) => setData({ ...data, skills: { ...data.skills, databases: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-muted-foreground font-medium">Developer Tools & Cloud</label>
                  <Input
                    value={data.skills.tools}
                    onChange={(e) => setData({ ...data, skills: { ...data.skills, tools: e.target.value } })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Content 3: Experience */}
          {activeTab === "experience" && (
            <div className="space-y-4">
              {data.experience.map((exp, idx) => (
                <Card key={exp.id}>
                  <CardHeader className="py-2.5 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold">Experience #{idx + 1}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => removeExperience(exp.id)} className="h-6 text-xs text-rose-500">
                      Remove
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <Input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          experience: prev.experience.map((item) => (item.id === exp.id ? { ...item, company: val } : item)),
                        }));
                      }}
                    />
                    <Input
                      placeholder="Role"
                      value={exp.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          experience: prev.experience.map((item) => (item.id === exp.id ? { ...item, role: val } : item)),
                        }));
                      }}
                    />
                    <Input
                      placeholder="Dates (e.g. 2024 – Present)"
                      value={exp.dates}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          experience: prev.experience.map((item) => (item.id === exp.id ? { ...item, dates: val } : item)),
                        }));
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button onClick={addExperience} variant="outline" size="sm" className="w-full text-xs cursor-pointer">
                + Add Experience Position
              </Button>
            </div>
          )}

          {/* Tab Content 4: Projects */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              {data.projects.map((proj, idx) => (
                <Card key={proj.id}>
                  <CardHeader className="py-2.5 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold">Project #{idx + 1}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => removeProject(proj.id)} className="h-6 text-xs text-rose-500">
                      Remove
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <Input
                      placeholder="Project Title"
                      value={proj.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          projects: prev.projects.map((item) => (item.id === proj.id ? { ...item, title: val } : item)),
                        }));
                      }}
                    />
                    <Input
                      placeholder="Technologies (e.g. React, Next.js, FastAPI)"
                      value={proj.technologies}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          projects: prev.projects.map((item) => (item.id === proj.id ? { ...item, technologies: val } : item)),
                        }));
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button onClick={addProject} variant="outline" size="sm" className="w-full text-xs cursor-pointer">
                + Add Key Project
              </Button>
            </div>
          )}

          {/* Tab Content 5: Education */}
          {activeTab === "education" && (
            <div className="space-y-4">
              {data.education.map((edu) => (
                <Card key={edu.id}>
                  <CardContent className="pt-4 space-y-2 text-xs">
                    <Input
                      placeholder="Institution"
                      value={edu.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          education: prev.education.map((item) => (item.id === edu.id ? { ...item, institution: val } : item)),
                        }));
                      }}
                    />
                    <Input
                      placeholder="Degree"
                      value={edu.degree}
                      onChange={(e) => {
                        const val = e.target.value;
                        setData((prev) => ({
                          ...prev,
                          education: prev.education.map((item) => (item.id === edu.id ? { ...item, degree: val } : item)),
                        }));
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Dates"
                        value={edu.dates}
                        onChange={(e) => {
                          const val = e.target.value;
                          setData((prev) => ({
                            ...prev,
                            education: prev.education.map((item) => (item.id === edu.id ? { ...item, dates: val } : item)),
                          }));
                        }}
                      />
                      <Input
                        placeholder="GPA / Marks"
                        value={edu.gpa}
                        onChange={(e) => {
                          const val = e.target.value;
                          setData((prev) => ({
                            ...prev,
                            education: prev.education.map((item) => (item.id === edu.id ? { ...item, gpa: val } : item)),
                          }));
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Live Document Sheet (7 cols) */}
        <div className="lg:col-span-7">
          <div className="sticky top-6">
            <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center print:hidden">
              <span>Live ATS Document ({template.toUpperCase()} Template)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Single-Page Strict Format</span>
            </div>

            {/* Printable Document Frame */}
            <div
              id="resume-document"
              className="bg-white text-zinc-900 shadow-xl rounded-sm p-8 min-h-[850px] border border-zinc-300 print:shadow-none print:border-none print:p-0 print:m-0 font-sans select-text"
            >
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

{/* --- Template 1: Apex Resume (Universal 1-Column LaTeX Standard) --- */}
function ApexTemplate({ data }: { data: ResumeData }) {
  return (
    <div className="space-y-3.5 text-[11.5px] leading-relaxed text-zinc-900 font-sans">
      {/* Header */}
      <div className="text-center border-b border-zinc-400 pb-2.5">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-zinc-900">{data.fullName}</h1>
        <div className="flex flex-wrap justify-center gap-1.5 text-[10.5px] text-zinc-700 mt-1 font-medium">
          <span>{data.phone}</span>
          <span>|</span>
          <span>{data.email}</span>
          <span>|</span>
          <span>{data.linkedin}</span>
          <span>|</span>
          <span>{data.github}</span>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section>
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-1 text-zinc-900">
            Professional Summary
          </h2>
          <p className="text-zinc-800 text-[11px] leading-snug">{data.summary}</p>
        </section>
      )}

      {/* Technical Skills */}
      <section>
        <h2 className="text-[11.5px] font-bold uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-1 text-zinc-900">
          Technical Skills
        </h2>
        <div className="space-y-0.5 text-[11px] text-zinc-800">
          {data.skills.languages && (
            <div>
              <span className="font-bold text-zinc-950">Languages:</span> {data.skills.languages}
            </div>
          )}
          {data.skills.frameworks && (
            <div>
              <span className="font-bold text-zinc-950">Frameworks & Libraries:</span> {data.skills.frameworks}
            </div>
          )}
          {data.skills.databases && (
            <div>
              <span className="font-bold text-zinc-950">Databases & Infrastructure:</span> {data.skills.databases}
            </div>
          )}
          {data.skills.tools && (
            <div>
              <span className="font-bold text-zinc-950">Tools & Cloud Services:</span> {data.skills.tools}
            </div>
          )}
        </div>
      </section>

      {/* Experience */}
      {data.experience.length > 0 && (
        <section>
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-1.5 text-zinc-900">
            Experience
          </h2>
          <div className="space-y-2.5">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline font-bold text-zinc-950">
                  <span>{exp.company} — <span className="italic font-normal text-zinc-800">{exp.role}</span></span>
                  <span className="text-[10.5px] text-zinc-700 font-normal">{exp.dates}</span>
                </div>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[11px] text-zinc-800 leading-tight">
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Projects */}
      {data.projects.length > 0 && (
        <section>
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-1.5 text-zinc-900">
            Key Projects
          </h2>
          <div className="space-y-2.5">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-baseline font-bold text-zinc-950">
                  <span>{proj.title} <span className="font-normal text-[10.5px] text-zinc-700">| {proj.technologies}</span></span>
                  <span className="text-[10.5px] text-zinc-700 font-normal">{proj.dates}</span>
                </div>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[11px] text-zinc-800 leading-tight">
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
          <h2 className="text-[11.5px] font-bold uppercase tracking-wider border-b border-zinc-900 pb-0.5 mb-1 text-zinc-900">
            Education
          </h2>
          <div className="space-y-1">
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline text-[11px]">
                <div>
                  <span className="font-bold text-zinc-950">{edu.institution}</span> — <span className="text-zinc-800">{edu.degree}</span>
                </div>
                <div className="text-[10.5px] text-zinc-700">{edu.gpa} ({edu.dates})</div>
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
    <div className="grid grid-cols-12 gap-5 text-[11.5px] text-zinc-900 font-sans">
      <div className="col-span-4 border-r border-zinc-200 pr-3.5 space-y-3.5">
        <div>
          <h1 className="text-xl font-extrabold text-indigo-950 leading-tight">{data.fullName}</h1>
          <p className="text-[11px] text-indigo-600 font-bold mt-0.5">{data.roleTitle}</p>
        </div>

        <div className="space-y-1 text-[10.5px] text-zinc-700">
          <div>{data.email}</div>
          <div>{data.phone}</div>
          <div>{data.location}</div>
          <div className="text-indigo-800 font-medium">{data.github}</div>
        </div>

        <section>
          <h3 className="font-bold text-[11px] uppercase tracking-wider text-indigo-950 border-b border-indigo-200 pb-0.5 mb-1.5">
            Technical Skills
          </h3>
          <div className="space-y-1.5 text-[10.5px]">
            <div>
              <div className="font-bold text-zinc-900">Languages</div>
              <div className="text-zinc-700">{data.skills.languages}</div>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Frameworks</div>
              <div className="text-zinc-700">{data.skills.frameworks}</div>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Databases</div>
              <div className="text-zinc-700">{data.skills.databases}</div>
            </div>
          </div>
        </section>
      </div>

      <div className="col-span-8 space-y-3.5">
        {data.summary && (
          <section>
            <h2 className="font-bold text-[11.5px] uppercase text-indigo-950 border-b border-zinc-200 pb-0.5 mb-1">
              Profile
            </h2>
            <p className="text-zinc-800 text-[11px] leading-snug">{data.summary}</p>
          </section>
        )}

        <section>
          <h2 className="font-bold text-[11.5px] uppercase text-indigo-950 border-b border-zinc-200 pb-0.5 mb-1.5">
            Experience
          </h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mb-2.5">
              <div className="font-bold text-zinc-950">{exp.role} <span className="font-normal text-zinc-700">@ {exp.company}</span></div>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[11px] text-zinc-800">
                {exp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-bold text-[11.5px] uppercase text-indigo-950 border-b border-zinc-200 pb-0.5 mb-1.5">
            Projects
          </h2>
          {data.projects.map((proj) => (
            <div key={proj.id} className="mb-2.5">
              <div className="font-bold text-zinc-950">{proj.title}</div>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[11px] text-zinc-800">
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
    <div className="space-y-3.5 text-[11px] text-emerald-400 bg-zinc-950 p-6 rounded font-mono border border-emerald-500/30">
      <div className="border-b border-emerald-500/30 pb-2">
        <div className="text-base font-bold text-emerald-300">$ whoami</div>
        <div className="text-emerald-100 font-bold">{data.fullName} {"//"} {data.roleTitle}</div>
        <div className="text-zinc-400 text-[10px]">{data.email} | {data.github} | {data.linkedin}</div>
      </div>

      <section>
        <div className="text-emerald-300 font-bold">$ cat summary.txt</div>
        <p className="text-zinc-300 text-[10.5px] leading-relaxed mt-0.5">{data.summary}</p>
      </section>

      <section>
        <div className="text-emerald-300 font-bold">$ ./list_skills.sh</div>
        <div className="text-zinc-300 text-[10.5px] mt-0.5 space-y-0.5">
          <div><span className="text-emerald-400">LANGUAGES:</span> {data.skills.languages}</div>
          <div><span className="text-emerald-400">FRAMEWORKS:</span> {data.skills.frameworks}</div>
          <div><span className="text-emerald-400">DATABASES:</span> {data.skills.databases}</div>
        </div>
      </section>

      <section>
        <div className="text-emerald-300 font-bold">$ git log --experience</div>
        {data.experience.map((exp) => (
          <div key={exp.id} className="mt-1.5 text-zinc-300 text-[10.5px]">
            <div className="font-bold text-emerald-200">&gt; {exp.role} @ {exp.company} ({exp.dates})</div>
            <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 mt-0.5">
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
    <div className="space-y-3.5 text-[11.5px] text-zinc-900 font-serif leading-relaxed">
      <div className="text-center pb-2">
        <h1 className="text-2xl font-normal text-zinc-950">{data.fullName}</h1>
        <div className="text-[10.5px] text-zinc-700 italic mt-0.5">{data.roleTitle} — {data.email} • {data.phone}</div>
      </div>

      {data.summary && (
        <section>
          <h2 className="text-[11.5px] font-bold italic border-b border-zinc-300 pb-0.5 mb-1 text-zinc-950">Summary</h2>
          <p className="text-zinc-800 text-[11px] leading-snug">{data.summary}</p>
        </section>
      )}

      <section>
        <h2 className="text-[11.5px] font-bold italic border-b border-zinc-300 pb-0.5 mb-1 text-zinc-950">Experience</h2>
        {data.experience.map((exp) => (
          <div key={exp.id} className="mb-2">
            <div className="flex justify-between italic text-zinc-950">
              <span className="font-bold">{exp.company} — {exp.role}</span>
              <span className="text-zinc-600 text-[10.5px]">{exp.dates}</span>
            </div>
            <ul className="list-disc pl-4 mt-0.5 text-zinc-800 space-y-0.5 text-[11px]">
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
