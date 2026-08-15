--
-- PostgreSQL database dump
--

\restrict 05ZimCLrXIZTSmOUSVB2ghO26EfbARmVck9Yy6pCzIxoTMjiOWVVumw0AzlV08j

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id uuid NOT NULL,
    agent_name text NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    input_ref jsonb,
    output jsonb,
    model_used text,
    langfuse_trace_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    stage text DEFAULT 'sourced'::text NOT NULL,
    source text,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_applications_source CHECK (((source IS NULL) OR (source = ANY (ARRAY['direct'::text, 'copilot_search'::text, 'hackathon'::text])))),
    CONSTRAINT ck_applications_stage CHECK ((stage = ANY (ARRAY['sourced'::text, 'screened'::text, 'interview_scheduled'::text, 'offered'::text, 'rejected'::text, 'hired'::text])))
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid NOT NULL,
    job_id uuid,
    type text NOT NULL,
    spec jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    candidate_id uuid,
    CONSTRAINT ck_assessments_type CHECK ((type = ANY (ARRAY['coding'::text, 'mcq'::text, 'project_analysis'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: authenticity_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authenticity_scores (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    score double precision NOT NULL,
    components jsonb,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    skill_name text NOT NULL,
    corroboration_sources jsonb NOT NULL,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    github_username text,
    headline text,
    location text,
    skills jsonb,
    experience jsonb,
    education jsonb,
    merged_conflicts jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    username text,
    portfolio_published boolean DEFAULT false NOT NULL,
    leetcode_username text,
    github_stats jsonb,
    leetcode_stats jsonb,
    stats_refreshed_at timestamp with time zone,
    ingestion_status text DEFAULT 'idle'::text NOT NULL,
    ingestion_error text,
    hackathon_experience json,
    ingestion_stage text
);


--
-- Name: career_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_recommendations (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    target_role text,
    skill_gaps jsonb,
    recommended_courses jsonb,
    roadmap jsonb,
    salary_estimate_low integer,
    salary_estimate_high integer,
    salary_rationale text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certifications (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    file_id uuid,
    issuer text,
    title text,
    issue_date timestamp with time zone,
    credential_id text,
    ocr_confidence double precision,
    verification_status text DEFAULT 'unverified'::text NOT NULL,
    CONSTRAINT ck_certifications_verification_status CHECK ((verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'rejected'::text])))
);


--
-- Name: contribution_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_reports (
    id uuid NOT NULL,
    repo_full_name text NOT NULL,
    candidate_id uuid,
    github_username text,
    contribution_share double precision,
    commits integer,
    lines_survived integer,
    prs_opened integer,
    prs_reviewed integer,
    anomaly_note text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: copilot_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_conversations (
    id uuid NOT NULL,
    recruiter_id uuid NOT NULL,
    messages jsonb,
    structured_filters jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_catalog (
    id uuid NOT NULL,
    provider text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    skill_tags jsonb NOT NULL,
    level text,
    estimated_hours integer,
    is_free boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_course_catalog_level CHECK (((level IS NULL) OR (level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])))),
    CONSTRAINT ck_course_catalog_provider CHECK ((provider = ANY (ARRAY['coursera'::text, 'freecodecamp'::text, 'vendor'::text])))
);


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    id uuid NOT NULL,
    fraud_flag_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    candidate_statement text,
    supporting_files jsonb,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    review_assist jsonb
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid NOT NULL,
    owner_user_id uuid,
    storage_key text NOT NULL,
    public_url text,
    file_type text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fraud_detection_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fraud_detection_configs (
    id uuid NOT NULL,
    org_id uuid,
    code_similarity_threshold double precision DEFAULT '0.75'::double precision NOT NULL,
    text_similarity_threshold double precision DEFAULT '0.8'::double precision NOT NULL,
    ocr_confidence_threshold double precision DEFAULT '0.55'::double precision NOT NULL,
    photo_hash_max_distance double precision DEFAULT '4'::double precision NOT NULL,
    ai_content_perplexity_threshold double precision DEFAULT '50'::double precision NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_code_sim_range CHECK (((code_similarity_threshold >= (0)::double precision) AND (code_similarity_threshold <= (1)::double precision))),
    CONSTRAINT ck_ocr_conf_range CHECK (((ocr_confidence_threshold >= (0)::double precision) AND (ocr_confidence_threshold <= (1)::double precision))),
    CONSTRAINT ck_text_sim_range CHECK (((text_similarity_threshold >= (0)::double precision) AND (text_similarity_threshold <= (1)::double precision)))
);


--
-- Name: fraud_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fraud_flags (
    id uuid NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    flag_type text NOT NULL,
    status text DEFAULT 'raised'::text NOT NULL,
    evidence jsonb NOT NULL,
    raised_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    candidate_id uuid,
    CONSTRAINT ck_fraud_flags_status CHECK ((status = ANY (ARRAY['raised'::text, 'under_review'::text, 'upheld'::text, 'dismissed'::text]))),
    CONSTRAINT ck_fraud_flags_subject_type CHECK ((subject_type = ANY (ARRAY['certificate'::text, 'submission'::text, 'profile'::text, 'resume'::text])))
);


--
-- Name: generated_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_documents (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    document_type text NOT NULL,
    target_job_description text,
    content jsonb NOT NULL,
    file_id uuid,
    fact_check_status text DEFAULT 'pending'::text NOT NULL,
    fact_check_findings jsonb,
    attempts integer DEFAULT 0 NOT NULL,
    model_used text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_generated_documents_document_type CHECK ((document_type = ANY (ARRAY['resume'::text, 'cover_letter'::text]))),
    CONSTRAINT ck_generated_documents_fact_check_status CHECK ((fact_check_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: github_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.github_snapshots (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    repo_full_name text NOT NULL,
    stars integer,
    forks integer,
    commit_count integer,
    pr_count integer,
    issue_count integer,
    languages jsonb,
    is_fork boolean,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    topics jsonb,
    pushed_at timestamp with time zone,
    description text
);


--
-- Name: hackathon_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hackathon_rankings (
    id uuid NOT NULL,
    hackathon_id uuid NOT NULL,
    team_id uuid NOT NULL,
    rank integer NOT NULL,
    composite_score double precision NOT NULL,
    score_breakdown jsonb,
    finalized_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hackathon_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hackathon_submissions (
    id uuid NOT NULL,
    team_id uuid NOT NULL,
    repo_url text,
    presentation_id uuid,
    repo_analysis_submission_id uuid,
    judge_score double precision,
    judge_rationale text,
    judge_user_id uuid,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hackathon_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hackathon_team_members (
    id uuid NOT NULL,
    team_id uuid NOT NULL,
    candidate_id uuid,
    github_username text,
    display_name text,
    role text DEFAULT 'member'::text NOT NULL,
    CONSTRAINT ck_hackathon_team_members_role CHECK ((role = ANY (ARRAY['lead'::text, 'member'::text])))
);


--
-- Name: hackathon_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hackathon_teams (
    id uuid NOT NULL,
    hackathon_id uuid NOT NULL,
    team_name text NOT NULL,
    track text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hackathons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hackathons (
    id uuid NOT NULL,
    organizer_org_id uuid,
    organizer_user_id uuid NOT NULL,
    name text NOT NULL,
    start_date date,
    end_date date,
    tracks jsonb,
    ingestion_mode text DEFAULT 'direct'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scoring_config jsonb,
    ranking_status text DEFAULT 'idle'::text NOT NULL,
    ranking_error text,
    CONSTRAINT ck_hackathons_ingestion_mode CHECK ((ingestion_mode = ANY (ARRAY['manual_csv'::text, 'webhook'::text, 'direct'::text]))),
    CONSTRAINT ck_hackathons_status CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'judging'::text, 'finalized'::text])))
);


--
-- Name: interview_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_definitions (
    id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    title text NOT NULL,
    role_title text NOT NULL,
    job_description text NOT NULL,
    years_experience integer,
    questions jsonb NOT NULL,
    question_count integer NOT NULL,
    duration_minutes integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scoring_rubric jsonb
);


--
-- Name: interview_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_reports (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    response_confidence_signal double precision,
    technical_rating double precision,
    communication_rating double precision,
    hiring_recommendation text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    rubric_scores jsonb
);


--
-- Name: interview_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_sessions (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid,
    status text DEFAULT 'in_progress'::text NOT NULL,
    state jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    interview_definition_id uuid,
    CONSTRAINT ck_interview_sessions_status CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);


--
-- Name: interview_transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_transcripts (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    turn_index integer NOT NULL,
    role text NOT NULL,
    text text NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_interview_transcripts_role CHECK ((role = ANY (ARRAY['agent'::text, 'candidate'::text])))
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid NOT NULL,
    organization_id uuid,
    posted_by_user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    required_skills jsonb,
    min_experience_years integer,
    location text,
    is_remote boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    matching_status text DEFAULT 'idle'::text NOT NULL,
    matching_error text
);


--
-- Name: location_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_aliases (
    canonical_name text NOT NULL,
    aliases text[]
);


--
-- Name: match_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_scores (
    id uuid NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    match_percentage double precision,
    skill_similarity double precision,
    semantic_similarity double precision,
    experience_match double precision,
    talent_score_alignment double precision,
    project_relevance double precision,
    explanation text,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name text NOT NULL,
    domain text,
    org_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_organizations_org_type CHECK ((org_type = ANY (ARRAY['company'::text, 'university'::text, 'hackathon_organizer'::text])))
);


--
-- Name: plagiarism_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plagiarism_matches (
    id uuid NOT NULL,
    presentation_id uuid NOT NULL,
    matched_presentation_id uuid NOT NULL,
    slide_index integer NOT NULL,
    similarity double precision NOT NULL,
    flagged_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: presentation_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentation_scores (
    id uuid NOT NULL,
    presentation_id uuid NOT NULL,
    innovation_score double precision,
    technical_feasibility_score double precision,
    presentation_quality_score double precision,
    business_potential_score double precision,
    overall_pitch_score double precision,
    renormalized_scores jsonb,
    summary text,
    suggestions jsonb,
    ai_content_signal jsonb,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: presentations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentations (
    id uuid NOT NULL,
    owner_user_id uuid,
    file_id uuid,
    linked_repo text,
    hackathon_submission_id uuid,
    status text DEFAULT 'processing'::text NOT NULL,
    status_detail text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_presentations_status CHECK ((status = ANY (ARRAY['processing'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: recruiter_watchlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recruiter_watchlists (
    id uuid NOT NULL,
    recruiter_id uuid NOT NULL,
    criteria jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skill_taxonomy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_taxonomy (
    canonical_name text NOT NULL,
    synonyms text[]
);


--
-- Name: slides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slides (
    id uuid NOT NULL,
    presentation_id uuid NOT NULL,
    slide_index integer NOT NULL,
    title text,
    body text,
    notes text,
    has_image boolean DEFAULT false NOT NULL,
    ocr_text text
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    code_or_answers jsonb,
    test_results jsonb,
    static_analysis jsonb,
    llm_review jsonb,
    score double precision,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    grading_status text DEFAULT 'done'::text NOT NULL,
    grading_error text
);


--
-- Name: talent_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.talent_scores (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    coding_ability double precision,
    project_quality double precision,
    leadership double precision,
    problem_solving double precision,
    innovation double precision,
    community_participation double precision,
    technical_consistency double precision,
    overall double precision,
    renormalized_subscores jsonb,
    score_version text DEFAULT 'v1'::text NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    confidence_available_signals integer,
    confidence_expected_signals integer,
    confidence double precision,
    open_source_contributions double precision,
    hackathon_performance double precision
);


--
-- Name: trusted_issuers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trusted_issuers (
    id uuid NOT NULL,
    name text NOT NULL,
    aliases jsonb,
    verification_url_template text,
    trust_tier text DEFAULT 'platform'::text NOT NULL,
    notes text,
    added_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_trusted_issuers_trust_tier CHECK ((trust_tier = ANY (ARRAY['platform'::text, 'university'::text, 'employer'::text, 'community'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    role text NOT NULL,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    password_hash text NOT NULL,
    CONSTRAINT ck_users_role CHECK ((role = ANY (ARRAY['candidate'::text, 'recruiter'::text, 'organizer'::text, 'judge'::text, 'admin'::text])))
);


--
-- Name: verification_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_records (
    id uuid NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    signal_type text NOT NULL,
    signal_score double precision,
    confidence_label text NOT NULL,
    evidence jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_verification_records_confidence_label CHECK ((confidence_label = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT ck_verification_records_subject_type CHECK ((subject_type = ANY (ARRAY['certificate'::text, 'submission'::text, 'profile'::text, 'resume'::text])))
);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authenticity_scores authenticity_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authenticity_scores
    ADD CONSTRAINT authenticity_scores_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);


--
-- Name: career_recommendations career_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_recommendations
    ADD CONSTRAINT career_recommendations_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: contribution_reports contribution_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_reports
    ADD CONSTRAINT contribution_reports_pkey PRIMARY KEY (id);


--
-- Name: copilot_conversations copilot_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_conversations
    ADD CONSTRAINT copilot_conversations_pkey PRIMARY KEY (id);


--
-- Name: course_catalog course_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_catalog
    ADD CONSTRAINT course_catalog_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: fraud_detection_configs fraud_detection_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_detection_configs
    ADD CONSTRAINT fraud_detection_configs_pkey PRIMARY KEY (id);


--
-- Name: fraud_flags fraud_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_pkey PRIMARY KEY (id);


--
-- Name: generated_documents generated_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_pkey PRIMARY KEY (id);


--
-- Name: github_snapshots github_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_snapshots
    ADD CONSTRAINT github_snapshots_pkey PRIMARY KEY (id);


--
-- Name: hackathon_rankings hackathon_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_rankings
    ADD CONSTRAINT hackathon_rankings_pkey PRIMARY KEY (id);


--
-- Name: hackathon_submissions hackathon_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT hackathon_submissions_pkey PRIMARY KEY (id);


--
-- Name: hackathon_team_members hackathon_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_team_members
    ADD CONSTRAINT hackathon_team_members_pkey PRIMARY KEY (id);


--
-- Name: hackathon_teams hackathon_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_teams
    ADD CONSTRAINT hackathon_teams_pkey PRIMARY KEY (id);


--
-- Name: hackathons hackathons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathons
    ADD CONSTRAINT hackathons_pkey PRIMARY KEY (id);


--
-- Name: interview_definitions interview_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_definitions
    ADD CONSTRAINT interview_definitions_pkey PRIMARY KEY (id);


--
-- Name: interview_reports interview_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_reports
    ADD CONSTRAINT interview_reports_pkey PRIMARY KEY (id);


--
-- Name: interview_sessions interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);


--
-- Name: interview_transcripts interview_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_transcripts
    ADD CONSTRAINT interview_transcripts_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: location_aliases location_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_aliases
    ADD CONSTRAINT location_aliases_pkey PRIMARY KEY (canonical_name);


--
-- Name: match_scores match_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: plagiarism_matches plagiarism_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plagiarism_matches
    ADD CONSTRAINT plagiarism_matches_pkey PRIMARY KEY (id);


--
-- Name: presentation_scores presentation_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_scores
    ADD CONSTRAINT presentation_scores_pkey PRIMARY KEY (id);


--
-- Name: presentations presentations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_pkey PRIMARY KEY (id);


--
-- Name: recruiter_watchlists recruiter_watchlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_watchlists
    ADD CONSTRAINT recruiter_watchlists_pkey PRIMARY KEY (id);


--
-- Name: skill_taxonomy skill_taxonomy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_taxonomy
    ADD CONSTRAINT skill_taxonomy_pkey PRIMARY KEY (canonical_name);


--
-- Name: slides slides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slides
    ADD CONSTRAINT slides_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: talent_scores talent_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scores
    ADD CONSTRAINT talent_scores_pkey PRIMARY KEY (id);


--
-- Name: trusted_issuers trusted_issuers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trusted_issuers
    ADD CONSTRAINT trusted_issuers_pkey PRIMARY KEY (id);


--
-- Name: applications uq_applications_job_candidate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT uq_applications_job_candidate UNIQUE (job_id, candidate_id);


--
-- Name: candidate_profiles uq_candidate_profiles_username; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT uq_candidate_profiles_username UNIQUE (username);


--
-- Name: hackathon_rankings uq_hackathon_rankings_hackathon_team; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_rankings
    ADD CONSTRAINT uq_hackathon_rankings_hackathon_team UNIQUE (hackathon_id, team_id);


--
-- Name: hackathon_submissions uq_hackathon_submissions_team; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT uq_hackathon_submissions_team UNIQUE (team_id);


--
-- Name: hackathon_team_members uq_hackathon_team_members_team_candidate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_team_members
    ADD CONSTRAINT uq_hackathon_team_members_team_candidate UNIQUE (team_id, candidate_id);


--
-- Name: match_scores uq_match_scores_job_candidate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT uq_match_scores_job_candidate UNIQUE (job_id, candidate_id);


--
-- Name: trusted_issuers uq_trusted_issuers_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trusted_issuers
    ADD CONSTRAINT uq_trusted_issuers_name UNIQUE (name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_records verification_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_records
    ADD CONSTRAINT verification_records_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_runs_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_subject ON public.agent_runs USING btree (subject_type, subject_id);


--
-- Name: idx_applications_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_candidate ON public.applications USING btree (candidate_id);


--
-- Name: idx_applications_job_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_job_stage ON public.applications USING btree (job_id, stage);


--
-- Name: idx_assessments_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_candidate ON public.assessments USING btree (candidate_id);


--
-- Name: idx_authenticity_scores_candidate_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_authenticity_scores_candidate_time ON public.authenticity_scores USING btree (candidate_id, computed_at);


--
-- Name: idx_badges_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_candidate ON public.badges USING btree (candidate_id);


--
-- Name: idx_badges_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_candidate_id ON public.badges USING btree (candidate_id);


--
-- Name: idx_candidate_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_profiles_user_id ON public.candidate_profiles USING btree (user_id);


--
-- Name: idx_career_recommendations_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_recommendations_candidate_id ON public.career_recommendations USING btree (candidate_id);


--
-- Name: idx_career_recs_candidate_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_recs_candidate_time ON public.career_recommendations USING btree (candidate_id, generated_at);


--
-- Name: idx_certifications_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certifications_candidate_id ON public.certifications USING btree (candidate_id);


--
-- Name: idx_contribution_reports_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_reports_candidate_id ON public.contribution_reports USING btree (candidate_id);


--
-- Name: idx_contribution_reports_repo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_reports_repo ON public.contribution_reports USING btree (repo_full_name);


--
-- Name: idx_copilot_conversations_recruiter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_conversations_recruiter_id ON public.copilot_conversations USING btree (recruiter_id);


--
-- Name: idx_disputes_flag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_flag ON public.disputes USING btree (fraud_flag_id);


--
-- Name: idx_events_unprocessed_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_unprocessed_type ON public.events USING btree (event_type) WHERE (processed_at IS NULL);


--
-- Name: idx_files_owner_type_uploaded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_owner_type_uploaded ON public.files USING btree (owner_user_id, file_type, uploaded_at DESC);


--
-- Name: idx_fraud_detection_configs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_detection_configs_org ON public.fraud_detection_configs USING btree (org_id);


--
-- Name: idx_fraud_flags_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_flags_candidate ON public.fraud_flags USING btree (candidate_id);


--
-- Name: idx_fraud_flags_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_flags_status ON public.fraud_flags USING btree (status);


--
-- Name: idx_fraud_flags_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_flags_subject ON public.fraud_flags USING btree (subject_type, subject_id);


--
-- Name: idx_generated_documents_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_candidate_id ON public.generated_documents USING btree (candidate_id);


--
-- Name: idx_generated_documents_candidate_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_documents_candidate_time ON public.generated_documents USING btree (candidate_id, generated_at);


--
-- Name: idx_github_snapshots_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_github_snapshots_candidate ON public.github_snapshots USING btree (candidate_id);


--
-- Name: idx_github_snapshots_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_github_snapshots_candidate_id ON public.github_snapshots USING btree (candidate_id);


--
-- Name: idx_hackathon_rankings_hackathon_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_rankings_hackathon_rank ON public.hackathon_rankings USING btree (hackathon_id, rank);


--
-- Name: idx_hackathon_rankings_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_rankings_team ON public.hackathon_rankings USING btree (team_id);


--
-- Name: idx_hackathon_submissions_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_submissions_team ON public.hackathon_submissions USING btree (team_id);


--
-- Name: idx_hackathon_team_members_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_team_members_candidate ON public.hackathon_team_members USING btree (candidate_id);


--
-- Name: idx_hackathon_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_team_members_team ON public.hackathon_team_members USING btree (team_id);


--
-- Name: idx_hackathon_teams_hackathon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hackathon_teams_hackathon ON public.hackathon_teams USING btree (hackathon_id);


--
-- Name: idx_interview_definitions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_definitions_created_by ON public.interview_definitions USING btree (created_by_user_id);


--
-- Name: idx_interview_reports_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_reports_session ON public.interview_reports USING btree (session_id);


--
-- Name: idx_interview_sessions_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_sessions_candidate_id ON public.interview_sessions USING btree (candidate_id);


--
-- Name: idx_interview_sessions_definition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_sessions_definition ON public.interview_sessions USING btree (interview_definition_id);


--
-- Name: idx_interview_sessions_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_sessions_job_id ON public.interview_sessions USING btree (job_id);


--
-- Name: idx_interview_transcripts_session_turn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_transcripts_session_turn ON public.interview_transcripts USING btree (session_id, turn_index);


--
-- Name: idx_jobs_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_organization_id ON public.jobs USING btree (organization_id);


--
-- Name: idx_jobs_posted_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_posted_by_user_id ON public.jobs USING btree (posted_by_user_id);


--
-- Name: idx_match_scores_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_candidate_id ON public.match_scores USING btree (candidate_id);


--
-- Name: idx_match_scores_job_percentage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_job_percentage ON public.match_scores USING btree (job_id, match_percentage);


--
-- Name: idx_match_scores_job_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_scores_job_time ON public.match_scores USING btree (job_id, computed_at);


--
-- Name: idx_plagiarism_matches_presentation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plagiarism_matches_presentation ON public.plagiarism_matches USING btree (presentation_id);


--
-- Name: idx_presentation_scores_presentation_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presentation_scores_presentation_time ON public.presentation_scores USING btree (presentation_id, computed_at);


--
-- Name: idx_recruiter_watchlists_recruiter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruiter_watchlists_recruiter ON public.recruiter_watchlists USING btree (recruiter_id);


--
-- Name: idx_scores_candidate_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_candidate_time ON public.talent_scores USING btree (candidate_id, computed_at);


--
-- Name: idx_slides_presentation_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slides_presentation_index ON public.slides USING btree (presentation_id, slide_index);


--
-- Name: idx_submissions_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_assessment ON public.submissions USING btree (assessment_id);


--
-- Name: idx_submissions_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_candidate ON public.submissions USING btree (candidate_id);


--
-- Name: idx_verification_records_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_records_subject ON public.verification_records USING btree (subject_type, subject_id);


--
-- Name: applications applications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: assessments assessments_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: authenticity_scores authenticity_scores_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authenticity_scores
    ADD CONSTRAINT authenticity_scores_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: badges badges_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: candidate_profiles candidate_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: career_recommendations career_recommendations_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_recommendations
    ADD CONSTRAINT career_recommendations_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: certifications certifications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: certifications certifications_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: contribution_reports contribution_reports_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_reports
    ADD CONSTRAINT contribution_reports_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: copilot_conversations copilot_conversations_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_conversations
    ADD CONSTRAINT copilot_conversations_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.users(id);


--
-- Name: disputes disputes_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: disputes disputes_fraud_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_fraud_flag_id_fkey FOREIGN KEY (fraud_flag_id) REFERENCES public.fraud_flags(id);


--
-- Name: files files_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: assessments fk_assessments_candidate_id_candidate_profiles; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT fk_assessments_candidate_id_candidate_profiles FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: fraud_detection_configs fraud_detection_configs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_detection_configs
    ADD CONSTRAINT fraud_detection_configs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: fraud_flags fraud_flags_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: fraud_flags fraud_flags_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: generated_documents generated_documents_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: generated_documents generated_documents_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: github_snapshots github_snapshots_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_snapshots
    ADD CONSTRAINT github_snapshots_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: hackathon_rankings hackathon_rankings_hackathon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_rankings
    ADD CONSTRAINT hackathon_rankings_hackathon_id_fkey FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id);


--
-- Name: hackathon_rankings hackathon_rankings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_rankings
    ADD CONSTRAINT hackathon_rankings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.hackathon_teams(id);


--
-- Name: hackathon_submissions hackathon_submissions_judge_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT hackathon_submissions_judge_user_id_fkey FOREIGN KEY (judge_user_id) REFERENCES public.users(id);


--
-- Name: hackathon_submissions hackathon_submissions_presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT hackathon_submissions_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id);


--
-- Name: hackathon_submissions hackathon_submissions_repo_analysis_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT hackathon_submissions_repo_analysis_submission_id_fkey FOREIGN KEY (repo_analysis_submission_id) REFERENCES public.submissions(id);


--
-- Name: hackathon_submissions hackathon_submissions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_submissions
    ADD CONSTRAINT hackathon_submissions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.hackathon_teams(id);


--
-- Name: hackathon_team_members hackathon_team_members_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_team_members
    ADD CONSTRAINT hackathon_team_members_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: hackathon_team_members hackathon_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_team_members
    ADD CONSTRAINT hackathon_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.hackathon_teams(id);


--
-- Name: hackathon_teams hackathon_teams_hackathon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathon_teams
    ADD CONSTRAINT hackathon_teams_hackathon_id_fkey FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id);


--
-- Name: hackathons hackathons_organizer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathons
    ADD CONSTRAINT hackathons_organizer_org_id_fkey FOREIGN KEY (organizer_org_id) REFERENCES public.organizations(id);


--
-- Name: hackathons hackathons_organizer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hackathons
    ADD CONSTRAINT hackathons_organizer_user_id_fkey FOREIGN KEY (organizer_user_id) REFERENCES public.users(id);


--
-- Name: interview_definitions interview_definitions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_definitions
    ADD CONSTRAINT interview_definitions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: interview_reports interview_reports_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_reports
    ADD CONSTRAINT interview_reports_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id);


--
-- Name: interview_sessions interview_sessions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: interview_sessions interview_sessions_interview_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_interview_definition_id_fkey FOREIGN KEY (interview_definition_id) REFERENCES public.interview_definitions(id);


--
-- Name: interview_sessions interview_sessions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: interview_transcripts interview_transcripts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_transcripts
    ADD CONSTRAINT interview_transcripts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id);


--
-- Name: jobs jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: jobs jobs_posted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_posted_by_user_id_fkey FOREIGN KEY (posted_by_user_id) REFERENCES public.users(id);


--
-- Name: match_scores match_scores_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: match_scores match_scores_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_scores
    ADD CONSTRAINT match_scores_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: plagiarism_matches plagiarism_matches_matched_presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plagiarism_matches
    ADD CONSTRAINT plagiarism_matches_matched_presentation_id_fkey FOREIGN KEY (matched_presentation_id) REFERENCES public.presentations(id);


--
-- Name: plagiarism_matches plagiarism_matches_presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plagiarism_matches
    ADD CONSTRAINT plagiarism_matches_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id);


--
-- Name: presentation_scores presentation_scores_presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_scores
    ADD CONSTRAINT presentation_scores_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id);


--
-- Name: presentations presentations_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: presentations presentations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentations
    ADD CONSTRAINT presentations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id);


--
-- Name: recruiter_watchlists recruiter_watchlists_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_watchlists
    ADD CONSTRAINT recruiter_watchlists_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.users(id);


--
-- Name: slides slides_presentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slides
    ADD CONSTRAINT slides_presentation_id_fkey FOREIGN KEY (presentation_id) REFERENCES public.presentations(id);


--
-- Name: submissions submissions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: submissions submissions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: talent_scores talent_scores_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scores
    ADD CONSTRAINT talent_scores_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id);


--
-- Name: trusted_issuers trusted_issuers_added_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trusted_issuers
    ADD CONSTRAINT trusted_issuers_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 05ZimCLrXIZTSmOUSVB2ghO26EfbARmVck9Yy6pCzIxoTMjiOWVVumw0AzlV08j

