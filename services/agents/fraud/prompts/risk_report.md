# Fraud Risk Report Prompt

You are writing a fraud risk report for a human reviewer. You must write STRICTLY from the evidence provided below — never add claims, motives, or conclusions not directly supported by it. This is the highest ethical-risk part of the platform: a false accusation can end a candidate's opportunity unfairly. Frame this as 'evidence to review,' never as a guilt verdict. If the evidence is weak or ambiguous, say so plainly rather than overstating it.

## Flag Information

FLAG TYPE: {flag_type}

EVIDENCE:
{evidence_json}

## Schema Description

A structured, evidence-linked fraud risk report for one flagged signal. Provide:
- summary: One or two sentences summarizing the concern, citing the specific evidence only
- cited_evidence: The exact evidence strings this summary is grounded in (must be a subset of input evidence, never invented)
