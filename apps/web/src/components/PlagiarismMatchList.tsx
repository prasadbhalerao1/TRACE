import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlagiarismMatchOut } from "@/lib/api";

/** Always ships evidence (matched deck + slide + similarity score), never a bare
 * plagiarism yes/no — same "signal with evidence" requirement as FR-6 (doc 04 §9). */
export function PlagiarismMatchList({ matches }: { matches: PlagiarismMatchOut[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">No similarity matches found against prior submissions.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Slide</TableHead>
          <TableHead>Matched presentation</TableHead>
          <TableHead>Similarity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((match) => (
          <TableRow key={match.id}>
            <TableCell>{match.slide_index + 1}</TableCell>
            <TableCell className="font-mono text-xs">{match.matched_presentation_id}</TableCell>
            <TableCell className="tabular-nums">{(match.similarity * 100).toFixed(1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
