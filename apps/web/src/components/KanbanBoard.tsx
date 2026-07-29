"use client";

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGES,
  type ApplicationStage,
  type ApplicationWithCandidateResponse,
} from "@/lib/api";

function CandidateCard({
  application,
  onAdvance,
}: {
  application: ApplicationWithCandidateResponse;
  onAdvance?: (nextStage: ApplicationStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;
  const currentIndex = APPLICATION_STAGES.indexOf(application.stage);
  const nextStage = APPLICATION_STAGES[currentIndex + 1];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white dark:bg-zinc-800 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary ${isDragging ? "opacity-50" : ""}`}
    >
      <p className="text-sm font-semibold text-ink dark:text-zinc-50">
        {application.candidate_headline ?? application.candidate_github_username ?? "Candidate"}
      </p>
      {application.candidate_overall_talent_score !== null && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          Talent Score: {application.candidate_overall_talent_score.toFixed(0)}
        </p>
      )}
      {onAdvance && nextStage && nextStage !== "rejected" && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAdvance(nextStage)}
          className="text-[10px] text-blue-600 font-semibold hover:underline mt-2"
        >
          Advance to {APPLICATION_STAGE_LABELS[nextStage]} →
        </button>
      )}
    </Card>
  );
}

function StageColumn({
  stage,
  applications,
  onAdvance,
}: {
  stage: ApplicationStage;
  applications: ApplicationWithCandidateResponse[];
  onAdvance: (applicationId: string, nextStage: ApplicationStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <Card
      ref={setNodeRef}
      className={`bg-slate-50 dark:bg-zinc-900 border-dashed ${isOver ? "border-primary" : ""}`}
    >
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-semibold flex justify-between">
          <span>{APPLICATION_STAGE_LABELS[stage]}</span>
          <Badge variant="secondary" className="text-xs">{applications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-2 min-h-16">
        {applications.map((a) => (
          <CandidateCard
            key={a.id}
            application={a}
            onAdvance={(next) => onAdvance(a.id, next)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({
  applications,
  onStageChange,
}: {
  applications: ApplicationWithCandidateResponse[];
  onStageChange: (applicationId: string, nextStage: ApplicationStage) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const nextStage = over.id as ApplicationStage;
    const application = applications.find((a) => a.id === active.id);
    if (application && application.stage !== nextStage) {
      onStageChange(String(active.id), nextStage);
    }
  }

  const activeApplication = applications.find((a) => a.id === activeId);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {APPLICATION_STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={applications.filter((a) => a.stage === stage)}
            onAdvance={onStageChange}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApplication && <CandidateCard application={activeApplication} />}
      </DragOverlay>
    </DndContext>
  );
}
