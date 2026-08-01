# Complete Manual Testing & Demo Guide

## Project Overview

DataAxle is a full-stack hiring platform with AI-powered candidate intelligence, fraud detection, hackathon management, and interview preparation. The system supports 5 primary roles: **Candidate**, **Recruiter**, **Organizer**, **Judge**, and **Admin**.

### Technology Stack
- **Frontend**: Next.js (TypeScript/React) with Clerk authentication
- **Backend**: FastAPI (Python) with async SQLAlchemy ORM
- **Database**: PostgreSQL with JSONB support
- **AI**: LangGraph agents for talent scoring, resume generation, fraud detection, and hackathon ranking
- **Storage**: Cloudinary for file uploads (resumes, certificates, presentations, photos)

---

## CANDIDATE ROLE

### Feature Category: Profile & Evidence

#### Feature 1: Profile Information Management
**Purpose**: Candidates can create and edit their professional profile (name, headline, location, education).

**Navigation Path**: 
1. After sign-in, go to `/profile/edit` (or from dashboard, click "Edit Profile")
2. Navigate to the "Edit Profile Details" card

**How to Test**:
1. Click into the Full Name field and enter a name (e.g., "Jane Doe")
2. Enter a headline (e.g., "Senior Software Engineer")
3. Enter a location (e.g., "San Francisco, CA")
4. Enter college/university (e.g., "Stanford University")
5. Enter degree (e.g., "B.S. in Computer Science")
6. Click "Save Profile Details"
7. Verify success message appears ("Profile information updated successfully.")
8. Refresh the page and verify all fields are persisted

**Test Data**:
```
Full Name: Jane Doe
Headline: Senior Software Engineer
Location: San Francisco, CA
College: Stanford University
Degree: B.S. in Computer Science
```

**Expected Result**: 
- UI shows "Profile information updated successfully" toast
- All fields are saved to the database and visible on reload
- Fields are also reflected in the candidate dashboard

**Edge Cases**:
- Empty fields: All fields are optional and can be left blank
- Very long names (100+ chars): Should be trimmed/limited appropriately
- Special characters in name: Should be handled gracefully
- Refreshing during save: Verify optimistic UI update works

---

#### Feature 2: GitHub Connection & Development Stats
**Purpose**: Connect candidate's GitHub account to pull public repositories, stats (commits, PRs, stars), and assess technical contribution.

**Navigation Path**: 
1. Go to `/profile/edit`
2. Look for the "GitHub" section under "Connect your evidence"

**How to Test**:
1. Click "Connect GitHub" button
2. You will be redirected to GitHub's OAuth login page
3. Authorize the application to access your public GitHub profile
4. System redirects back to `/profile/edit?github=connected`
5. Verify message: "GitHub connected — processing in the background."
6. Wait for ingestion to complete (check the notice for "GitHub connected — Talent Score updated")
7. Go to `/dashboard` and verify the GitHub profile appears with:
   - GitHub username
   - Development Stats section showing:
     - Total repositories owned
     - Total commits across all repos
     - Total pull requests
     - Total issues
     - Project list (non-fork repos sorted by stars)

**Test Data**:
```
Any GitHub account with public repositories will work.
For demo purposes, use an account with:
- 3+ repositories
- 50+ commits
- 10+ stars on at least one repo
- Mix of original and forked repos
```

**Expected Result**:
- GitHub username is persisted
- Development stats are fetched and displayed
- GitHub snapshots are created for each repository
- Talent Score is recalculated with GitHub data
- Timeline badge appears showing when data was last refreshed

**Edge Cases**:
- Invalid GitHub username: System should show error "GitHub connection failed"
- Expired/revoked OAuth token: Reconnect should work
- GitHub API rate limit hit: System gracefully handles with error
- Candidate with 0 repositories: Stats should show zeros, no crash
- Reconnecting: Old stats should be replaced with new stats

---

#### Feature 3: LeetCode Connection & Problem-Solving Stats
**Purpose**: Connect LeetCode username to pull problem-solving statistics (easy/medium/hard problems solved, acceptance rate).

**Navigation Path**: 
1. Go to `/profile/edit`
2. Look for "LeetCode" section under "Connect your evidence"

**How to Test**:
1. Enter a LeetCode username in the input field (e.g., "leetcode_user_123")
2. Click the "Connect" button
3. System fetches LeetCode stats via unofficial API
4. Verify success message: "LeetCode connected — problem-solving stats synced."
5. Go to `/dashboard` and verify LeetCode stats appear:
   - LeetCode username
   - Easy problems solved
   - Medium problems solved
   - Hard problems solved
   - Acceptance rate
6. Test refresh via `/profile/edit` → click "Reconnect" with new username

**Test Data**:
```
LeetCode Username: (use a real or test account)
Example: "neetcode" (public profile)
```

**Expected Result**:
- LeetCode username and stats are persisted
- Stats appear in candidate dashboard
- Refresh can update stats (with 15-minute cooldown)

**Edge Cases**:
- Invalid LeetCode username: Error "leetcode_username_invalid"
- Private profile: System should handle gracefully
- Refresh cooldown: Within 15 minutes, should show error "refresh_on_cooldown" with retry_at timestamp
- Changing username: Old stats should be replaced

---

#### Feature 4: Resume Upload & Parsing
**Purpose**: Upload resume (PDF/DOCX) for AI parsing to extract skills, experience, education, and recompute Talent Score.

**Navigation Path**: 
1. Go to `/profile/edit`
2. Look for "Resume" section under "Connect your evidence"

**How to Test**:
1. Click "Upload résumé"
2. Select a PDF or DOCX file (or create a test file)
3. System shows "Uploading…" state
4. After upload, shows "Resume uploaded — processing in the background."
5. Frontend polls ingestion status endpoint
6. When complete, shows "Resume processed — Talent Score updated."
7. Go to `/dashboard` and verify:
   - Parsed skills appear
   - Experience entries are extracted
   - Education is populated
   - Talent Score is recalculated

**Test Data**:
```
Sample Resume (DOCX):
---
Jane Doe
Senior Software Engineer | San Francisco, CA
linkedin.com/in/janedoe | github.com/janedoe

EXPERIENCE
Senior Engineer, TechCorp (2022-Present)
- Led team of 5 engineers on microservices architecture
- Improved API latency by 40% using caching strategies
- Mentored 3 junior developers

Software Engineer, StartupXYZ (2020-2022)
- Built real-time analytics dashboard using React and WebSockets
- Designed PostgreSQL schema for 10M+ user dataset
- On-call rotation with 99.99% uptime SLA

SKILLS
Languages: Python, JavaScript, TypeScript, SQL
Frameworks: React, FastAPI, Node.js, Django
Tools: Docker, Kubernetes, PostgreSQL, Redis, AWS
Leadership: Agile, mentoring, code review

EDUCATION
B.S. Computer Science, Stanford University (2020)
---
```

**Expected Result**:
- Resume is stored as File record
- Parsing extracts: skills, experience, education, headline, location
- Talent Score is recalculated based on new resume content
- Profile is marked as updated

**Edge Cases**:
- Empty resume: Parser should handle without crash
- Corrupted file: Should show upload error
- Very large file (>50MB): Should reject with "file_too_large"
- Unsupported format: Should show error "Invalid file type"
- Resume parsing fails: Ingestion status shows error message

---

#### Feature 5: Certificate Upload & OCR Verification
**Purpose**: Upload certificate image or PDF for OCR scanning to extract title, issuer, issue date, and credential ID.

**Navigation Path**: 
1. Go to `/profile/edit`
2. Look for "Certificates" section under "Connect your evidence"

**How to Test**:
1. Click "Upload certificate"
2. Select an image file (PNG, JPG) or PDF
3. System shows "Scanning…" state
4. After processing, shows "Certificate processed and OCR-scanned."
5. Certificate is added to candidate's certifications
6. Go to `/dashboard` and verify certificate appears with:
   - Title extracted via OCR
   - Issuer (if recognized against trusted issuer registry)
   - Credential ID
   - OCR confidence score
   - Verification status (starts as "unverified")

**Test Data**:
```
Certificate Image (sample text on image):
---
AWS Certified Solutions Architect - Professional
Credential ID: CERT-2024-123456
Issue Date: January 1, 2024
Issued by: Amazon Web Services Training
---

Or use a real certificate image/PDF
```

**Expected Result**:
- Certificate is uploaded to Cloudinary
- OCR extracts text
- Certification record is created with extracted data
- Certificate appears in profile dashboard

**Edge Cases**:
- OCR confidence very low: Should still create record but mark as low confidence
- No issuer match: Certification created but marked "unverified"
- Corrupted image: Should show error
- PDF with multiple pages: Should process first page
- Re-upload same cert: Should create new record or update existing

---

#### Feature 6: Portfolio Username & Public Profile
**Purpose**: Set a public username (e.g., "yourname") to publish a public portfolio at `yourdomain.com/yourname`.

**Navigation Path**: 
1. Go to `/profile/edit`
2. Scroll to "Portfolio Username" section at bottom

**How to Test**:
1. In the input field, type a desired username (e.g., "jane-doe")
2. Click "Set Username"
3. System validates username:
   - Only lowercase letters, numbers, hyphens
   - 2-40 characters
   - Not in reserved list
   - Not already taken
4. Verify success: "Portfolio username set to 'jane-doe'. Your public link is now active."
5. Click "View →" link to visit public portfolio at `/{username}`
6. Verify public portfolio displays:
   - Full name, headline, location
   - Skills with badges
   - GitHub summary (projects, stats)
   - LeetCode stats
   - Certifications
   - Talent Score (if available)

**Test Data**:
```
Usernames to test:
- Valid: "jane-doe", "john123", "alex-smith-engineer"
- Invalid: "Jane Doe" (uppercase), "jane doe" (space), "a" (too short)
- Reserved: "api", "dashboard", "jobs", "interview", etc.
```

**Expected Result**:
- Username is validated and stored
- Portfolio becomes publicly accessible
- Public route `/{username}` renders without auth
- Profile data is visible on public page
- "View →" link works

**Edge Cases**:
- Username already taken: Error "username_taken"
- Invalid characters: Error "invalid_username"
- Too short/long: Error "invalid_username"
- Reserved word: Error "invalid_username"
- Changing username: Old URL becomes inactive, new URL is active

---

### Feature Category: Talent Scoring & Insights

#### Feature 7: Talent Score Dashboard
**Purpose**: View AI-computed Talent Score across 7 dimensions (Coding Ability, Problem Solving, Project Quality, Innovation, Technical Consistency, Community Participation, Leadership) with historical trend view.

**Navigation Path**: 
1. After sign-in, click "View your Talent Score →" from profile edit page
2. OR navigate directly to `/dashboard`

**How to Test**:
1. On `/dashboard`, look for the "Your Talent Score" card
2. Verify it displays:
   - Overall score (0-100)
   - 7 sub-scores with individual values
   - Confidence score (% of evidence signals detected)
   - Score computed timestamp
   - "Score History" section showing all previous scores
3. Hover over sub-score items to see explanations
4. Click on historical scores to compare trends
5. Test empty state: If no score yet, message says "No Talent Score yet. Upload your resume or connect GitHub to get started."

**Test Data**:
```
Example Talent Score (after full profile setup):
Overall: 78/100
- Coding Ability: 82
- Problem Solving: 75
- Project Quality: 80
- Innovation: 72
- Technical Consistency: 85
- Community Participation: 68
- Leadership: 70
Confidence: 6/7 signals (86%)
```

**Expected Result**:
- Talent Score displays with all 7 dimensions
- Confidence score shown (available_signals / expected_signals)
- Historical scores sorted chronologically
- Score version indicator (v1 or v2)
- Timestamp of when score was computed

**Edge Cases**:
- No profile data: Show empty state
- Partial data (only GitHub, no resume): Score still computes with low confidence
- After resume upload: Score recalculates and history updates
- Score v1 vs v2: Older rows should show v1, new rows v2 with different algorithm
- Renormalized subscores: If a sub-score was N/A, display note explaining weight redistribution

---

#### Feature 8: Career Guidance & Skill Gap Analysis
**Purpose**: Get AI-powered career guidance for a target role, including skill gaps, recommended courses, learning roadmap, and salary estimates.

**Navigation Path**: 
1. Navigate to `/career` (candidate career guidance page)

**How to Test**:
1. On `/career`, select a target role from dropdown (e.g., "Senior Backend Engineer")
2. System queries career guidance agent with:
   - Current skills from profile
   - Years of experience (calculated from resume)
   - Talent score
   - Target role
3. Agent returns:
   - Skill gaps (skills needed but not currently held)
   - Recommended courses from catalog
   - Learning roadmap with stages
   - Salary estimate (low-high range)
   - Salary rationale
4. Verify results display with:
   - Gap analysis table
   - Course recommendations with links
   - Stage-by-stage roadmap
   - Estimated salary range
5. Test refresh: Click "Refresh" to recompute guidance
6. Test different target roles: Select different roles and verify guidance changes

**Test Data**:
```
Target Role: Senior Backend Engineer
Current Skills: Python, JavaScript, React
Current Experience: 5 years
Expected Gaps: Go, Rust, Kubernetes, Microservices Architecture
Expected Courses: "Go Advanced Patterns" (Coursera), "Kubernetes for Architects" (Linux Academy)
Expected Salary: $180K-$220K
```

**Expected Result**:
- Career guidance computes for selected role
- Skill gaps clearly identified
- Recommended courses include provider, title, link, level, duration
- Roadmap shows clear learning path
- Salary estimate with low/high range
- Results cached for 24 hours (refresh bypasses cache)

**Edge Cases**:
- Unknown target role: Error "unknown_target_role" with list of valid roles
- No existing skills: Guidance still works with all skills as gaps
- Refresh within 24h: Returns cached result
- Refresh after 24h: Recomputes fresh
- Career guidance service unavailable: Error "Career guidance unavailable"

---

### Feature Category: Document Generation

#### Feature 9: Resume Generation (AI-Powered)
**Purpose**: Generate a professional resume from profile data, optionally optimized for a specific job description.

**Navigation Path**: 
1. Navigate to `/resume-builder`
2. OR from dashboard, click "Generate Resume"

**How to Test**:
1. On `/resume-builder`, enter a target job description (optional):
   ```
   We're looking for a Senior Backend Engineer to:
   - Design and implement microservices architecture
   - Mentor junior engineers
   - Lead technical decisions
   Skills: Python, Go, Kubernetes, PostgreSQL, AWS
   ```
2. Click "Generate Resume"
3. System processes:
   - Runs document generation agent
   - Generates tailored resume content
   - Fact-checks content against candidate's profile
   - Renders as PDF
4. Wait for completion (typically 10-15 seconds)
5. Verify resume displays:
   - Candidate name, headline, location
   - Summary optimized for target role
   - Experience formatted professionally
   - Skills section (ranked by relevance)
   - Education
   - Certifications
6. Download PDF by clicking "Download Resume"
7. Verify PDF renders correctly

**Test Data**:
```
Target Job Description:
Senior Backend Engineer at TechCorp
- 7+ years backend development experience
- Expertise in Python or Go
- Experience with microservices and Kubernetes
- Strong mentoring background
Compensation: $180K-$220K
```

**Expected Result**:
- Resume is generated and fact-checked
- PDF is downloadable
- Content is tailored to job description (if provided)
- All sections are complete and professional
- Facts are validated against candidate's profile

**Edge Cases**:
- No target job description: Generic professional resume
- Resume generation fails: Error "Resume generation unavailable"
- Fact-check fails: Error with findings showing what failed
- Empty profile: System uses minimal data, still generates
- Large job description (5000+ chars): Should handle
- PDF generation unavailable: Error message shown

---

#### Feature 10: Cover Letter Generation (AI-Powered)
**Purpose**: Generate a professional cover letter targeted to a specific job description.

**Navigation Path**: 
1. Navigate to `/resume-builder` or job application page
2. Look for "Generate Cover Letter" option

**How to Test**:
1. Enter target job description:
   ```
   Senior Backend Engineer at TechCorp
   Looking for someone who can:
   - Build scalable APIs
   - Mentor engineers
   - Own end-to-end systems
   ```
2. Click "Generate Cover Letter"
3. System generates personalized cover letter with:
   - Opening that shows knowledge of company
   - 2-3 paragraphs highlighting relevant experience
   - Demonstration of how skills match role
   - Call to action
4. Verify content is:
   - Professional tone
   - Fact-checked against profile
   - Specific to the role
5. Copy/paste into job application

**Test Data**:
```
Target Job Description:
Senior Backend Engineer, TechCorp (AI-focused startup)
- Building APIs for our ML platform
- 7+ years experience required
- Python and Go preferred
- Team lead for 3-5 engineers
```

**Expected Result**:
- Cover letter generated in 10-15 seconds
- Content references company/role specifically
- Facts are validated
- Professional formatting
- Can be copied to clipboard or saved

**Edge Cases**:
- No job description: Generic professional letter
- Fact-check fails: Error with specific findings
- Service unavailable: Error message shown
- Very short profile: Letter still generates with what's available

---

#### Feature 11: Generated Documents History
**Purpose**: View all previously generated resumes and cover letters.

**Navigation Path**: 
1. Navigate to `/resume-builder`
2. Look for "Document History" or "Generated Documents" section

**How to Test**:
1. After generating 2-3 resumes/cover letters, navigate to history
2. Verify each document shows:
   - Document type (Resume or Cover Letter)
   - Target job description (first 100 chars or "Generic")
   - Generation date/time
   - Fact-check status (Passed/Failed)
   - Download link (for resumes with PDF)
3. Click on old resume to re-download PDF
4. Verify document can be shared via link

**Test Data**:
```
Regenerate resume 3 times with different job descriptions
to populate history:
1. "Senior Frontend Engineer, ReactCo"
2. "Staff Engineer, FinTech Inc"
3. "Principal Engineer, BigTech Corp"
```

**Expected Result**:
- All documents listed chronologically
- Each shows type, target, date, status
- Old PDFs can be re-downloaded
- Documents can be managed (delete, share, etc.)

**Edge Cases**:
- No documents generated: Show empty state
- Very old documents (1+ year): Still accessible
- Fact-check failure: Show failed status with reason

---

### Feature Category: Interviews & Practice

#### Feature 12: Interview Practice - Browsing Open Interviews
**Purpose**: Browse and practice with interview templates published by recruiters.

**Navigation Path**: 
1. Navigate to `/interviews`
2. Look for "Open Interviews" section

**How to Test**:
1. View list of open interview templates (if any exist)
2. For each template, verify it shows:
   - Title
   - Role title
   - Number of questions
   - Required years of experience
3. Click "Start" on an interview template
4. System redirects to interview session page
5. Verify interview loads with:
   - Question text
   - Audio recording interface
   - Time spent so far
   - Question counter (e.g., "Question 2 of 5")

**Test Data**:
```
Open Interview Template (created by recruiter):
Title: "Senior Engineer Deep Dive"
Role: "Backend Engineer"
Questions: 5
Years Experience: 5+
```

**Expected Result**:
- Templates load and display correctly
- Can start interview session
- Interview session loads with first question
- Recording interface is functional

**Edge Cases**:
- No open interviews: Show "No open interviews yet" message
- Interview template has 0 questions: Should still load but show empty
- Network error during start: Show error message

---

#### Feature 13: Interview Practice - Create Custom Practice Interview
**Purpose**: Create a custom practice interview for any role with AI-generated questions.

**Navigation Path**: 
1. Navigate to `/interviews`
2. Look for "Practice Interview" section
3. Click "Create Practice Interview"

**How to Test**:
1. Fill in practice interview form:
   - Role Title: "Product Manager"
   - Job Description: "Lead product strategy for mobile app, manage stakeholders, analyze metrics"
   - Years of Experience: "3"
2. Click "Generate Topics"
3. System calls AI agent to generate 5 interview topics related to the role
4. Wait for generation (typically 5-10 seconds)
5. Verify generated topics display:
   - Topic 1: "Walking through your most impactful product decision"
   - Topic 2: "How you balance stakeholder feedback with data"
   - etc.
6. Click "Start Interview"
7. System starts interview session with those topics as questions
8. Verify first topic appears as first question

**Test Data**:
```
Role Title: Product Manager
Job Description: Lead product roadmap and strategy for B2B SaaS platform. 
Responsibilities include:
- Define quarterly product roadmap
- Conduct user research and analyze metrics
- Prioritize features based on business impact
- Collaborate with engineers, design, and sales
Required Experience: 3+ years

Years of Experience: 3
```

**Expected Result**:
- Topics generated within 10 seconds
- Each topic is a realistic interview question
- Interview starts with generated topics
- Candidate can answer each question via audio

**Edge Cases**:
- No role title: Form validation prevents submission
- Empty job description: System should still generate but may be generic
- Invalid years (negative or >50): Validation error
- Generation fails: Error "Failed to generate practice topics"

---

#### Feature 14: Interview Session - Take an Interview
**Purpose**: Record audio responses to interview questions in real-time.

**Navigation Path**: 
1. From `/interviews`, start an interview (open or practice)
2. Redirects to `/interview/{sessionId}`

**How to Test**:
1. On interview page, verify it shows:
   - Question text (e.g., "Tell me about a time you led a team")
   - Microphone icon
   - "Start Recording" button
   - Time elapsed
2. Click "Start Recording"
3. Browser requests microphone permission
4. Speak your answer (30-90 seconds is typical)
5. System records audio in real-time
6. Click "Stop Recording" when done
7. Recording saved automatically
8. Click "Next Question" to proceed
9. Repeat for all questions
10. After last question, click "Submit Interview"
11. System shows completion: "Interview submitted successfully"

**Test Data**:
```
Example Answer:
"In my previous role at TechCorp, I was asked to lead a team of 4 engineers 
who were struggling with project delivery. I first spent time understanding 
their challenges - turns out we had vague requirements and no sprint process. 
I implemented a 2-week sprint cycle with clear acceptance criteria. Within 
two sprints, we were shipping features on schedule. The team's velocity 
increased 40% and morale improved significantly."
```

**Expected Result**:
- Audio records clearly without dropouts
- Questions display one at a time
- Recording stops when clicked
- All audio is persisted
- Interview marks as "completed" in database
- Session can be reviewed later

**Edge Cases**:
- Browser denies microphone: Show error "Microphone access required"
- Network disconnect during recording: Buffer locally, retry on reconnect
- Recording very long (>10 minutes): Should handle gracefully
- User navigates away mid-interview: Session can be resumed
- User submits empty answers: Still accepted (optional recording)

---

#### Feature 15: View Past Interview Sessions
**Purpose**: Review recorded interviews and scores.

**Navigation Path**: 
1. Navigate to `/interviews` (candidate interviews main page)
2. Look for "Past Sessions" or "Interview History" section (if implemented)

**How to Test**:
1. After completing an interview, return to `/interviews`
2. Verify completed session appears with:
   - Interview template or practice name
   - Date taken
   - All recorded answers (playable)
   - Any feedback or scores (if evaluator reviewed)
3. Click to expand session details
4. Verify can replay audio recordings
5. If recruiter scored: show score and feedback

**Test Data**:
```
Past Interview Session:
Interview: "Senior Engineer Deep Dive"
Date: August 1, 2024
Questions: 5 (all answered)
Recruiter Feedback: "Strong technical depth, good communication"
```

**Expected Result**:
- Completed interviews listed
- Audio can be replayed
- Feedback displays if available
- Sessions persist indefinitely

**Edge Cases**:
- No past interviews: Show empty state
- Audio files missing: Show placeholder
- Recruiter hasn't scored yet: Show "Pending Review"

---

### Feature Category: Assessments

#### Feature 16: View Assigned Assessments
**Purpose**: See all assessments assigned by recruiters (coding challenges, MCQ quizzes, project analysis).

**Navigation Path**: 
1. Navigate to `/assessments`

**How to Test**:
1. View list of assigned assessments
2. Each assessment shows:
   - Type: "Coding Challenge" / "Multiple Choice Quiz" / "Project Analysis"
   - Assignment date
   - Status (not started / in progress / completed)
3. Click on an assessment to open it

**Test Data**:
```
Assessments:
1. Coding Challenge - "Build a URL Shortener" - Assigned July 31, 2024
2. Multiple Choice Quiz - "System Design Fundamentals" - Assigned July 30, 2024
3. Project Analysis - "Review this React component" - Assigned July 28, 2024
```

**Expected Result**:
- Assessments list loads
- Each shows type, title, assignment date
- Can click to open and start

**Edge Cases**:
- No assessments assigned: Show "No assessments assigned yet"
- Assessment expired: Show status "Expired"
- Assessment completed: Show status "Completed" with score

---

#### Feature 17: Take a Coding Challenge Assessment
**Purpose**: Complete a coding challenge (timed programming problem).

**Navigation Path**: 
1. From `/assessments`, click on a "Coding Challenge" type assessment

**How to Test**:
1. Assessment page loads with:
   - Problem statement
   - Example input/output
   - Code editor
   - Language selector (Python, JavaScript, Java, etc.)
   - Time remaining (if timed)
   - "Submit" button
2. Select preferred language from dropdown
3. Write code in editor (copy-paste test solution)
4. Click "Run Tests" to validate against test cases
5. If all tests pass, click "Submit"
6. System evaluates and shows:
   - Pass/fail status
   - Time spent
   - Test coverage score

**Test Data**:
```
Coding Challenge: "Merge Two Sorted Arrays"
Problem: Given two sorted arrays, return a merged sorted array.

Example:
Input: [1, 3, 5], [2, 4, 6]
Output: [1, 2, 3, 4, 5, 6]

Sample Solution (Python):
def merge_arrays(a, b):
    return sorted(a + b)
```

**Expected Result**:
- Code editor works (syntax highlighting, formatting)
- Tests execute and show pass/fail
- Submission records score
- Completion status updates

**Edge Cases**:
- Syntax error: Show error message in output
- Time limit exceeded: Show TLE error
- Wrong answer: Show failing test case
- Code not submitted: Can save draft and return later

---

#### Feature 18: Take a Multiple Choice Quiz Assessment
**Purpose**: Complete a multiple choice quiz.

**Navigation Path**: 
1. From `/assessments`, click on "Multiple Choice Quiz" type

**How to Test**:
1. Quiz loads with:
   - Question text
   - 4-5 answer options
   - Question counter (e.g., "Question 2 of 10")
   - Time remaining (if timed)
2. Select an answer by clicking radio button
3. Click "Next" to proceed
4. On last question, click "Submit Quiz"
5. System shows:
   - Score (e.g., "8/10 correct")
   - Breakdown by category if available
   - Correct vs incorrect answers

**Test Data**:
```
Quiz Question:
"What is the time complexity of binary search?"
A) O(n)
B) O(log n) ✓
C) O(n²)
D) O(1)
```

**Expected Result**:
- Questions display one at a time
- Selections are saved
- Score calculated accurately
- Results show correct/incorrect breakdown

**Edge Cases**:
- Time expires before submission: Auto-submit with partial answers
- Browser back button: Should prevent going back (or warn)
- Question with no answer selected: Allow proceed (count as wrong)

---

### Feature Category: Applications & Interviews

#### Feature 19: Apply to Jobs
**Purpose**: Apply to open job postings from recruiter partners.

**Navigation Path**: 
1. Navigate to `/jobs`
2. Browse available job postings

**How to Test**:
1. Click on a job posting to view details
2. Verify job shows:
   - Title
   - Company/recruiter name
   - Job description
   - Required skills
   - Location
   - Salary range (if posted)
3. Click "Apply"
4. Application created
5. Verify confirmation: "Application submitted"
6. Application appears in `/applications` page

**Test Data**:
```
Job Posting:
Title: Senior Backend Engineer
Company: TechCorp
Location: San Francisco, CA
Description: We're looking for a talented backend engineer to...
Skills: Python, Go, Kubernetes, AWS
Salary: $180K-$220K
```

**Expected Result**:
- Application created in database
- Application status set to "applied"
- User redirected to `/applications` showing new application
- Email sent to recruiter

**Edge Cases**:
- Already applied to this job: Show "You've already applied"
- Job no longer open: Error "Job posting closed"
- Missing profile info: Warning "Complete your profile for better matches"

---

#### Feature 20: View Applications & Statuses
**Purpose**: Track all submitted job applications and their progress through hiring pipeline.

**Navigation Path**: 
1. Navigate to `/applications`

**How to Test**:
1. View all submitted applications with:
   - Job title
   - Company/recruiter
   - Application status (applied / reviewing / shortlisted / interviewing / offered / rejected)
   - Application date
   - Last update date
2. Click on an application to view details
3. If status is "interviewing", see interview session link
4. If status is "offered", see offer details
5. Applications can be withdrawn (if in "applied" stage)

**Test Data**:
```
Applications:
1. "Senior Backend Engineer" at TechCorp - Applied July 31 - Status: Reviewing
2. "Staff Engineer" at StartupXYZ - Applied July 20 - Status: Shortlisted
3. "Principal Engineer" at BigTech - Applied July 1 - Status: Rejected
```

**Expected Result**:
- All applications listed
- Statuses update as recruiter moves candidates through pipeline
- Can click to see full details

**Edge Cases**:
- No applications: Show empty state
- Application rejected: Show reason if provided
- Application has offer: Highlight and show offer details

---

### Feature Category: Fraud Flags & Disputes

#### Feature 21: View Fraud Flags
**Purpose**: Candidates can see if any fraud flags have been raised against them and dispute them.

**Navigation Path**: 
1. Navigate to `/my-flags`

**How to Test**:
1. View list of any flags raised against this candidate:
   - Flag type (certificate_fraud, plagiarism, duplicate_profile, ai_content)
   - Status (raised / under_review / upheld / dismissed / disputed)
   - Confidence level
   - Evidence summary
   - If disputed: show dispute status
2. For each flag, can click to view full evidence
3. If flag is "raised" or "under_review", can click "Dispute" to contest

**Test Data**:
```
Fraud Flag:
Type: Certificate Fraud
Status: Raised
Confidence: High
Evidence: Certificate issuer not found in trusted registry.
Credential ID verification failed.
```

**Expected Result**:
- Flags display with status, confidence, summary
- Can click to see full evidence trail
- Can dispute with written explanation

**Edge Cases**:
- No flags: Show "No flags currently"
- Multiple flags: List all
- Flag already upheld: Show read-only details

---

#### Feature 22: Dispute a Fraud Flag
**Purpose**: Candidate can submit written dispute explaining why a fraud flag is incorrect.

**Navigation Path**: 
1. From `/my-flags`, click "Dispute" on a flag
2. OR navigate to flag detail page and click "Submit Dispute"

**How to Test**:
1. Dispute form loads with:
   - Evidence summary (read-only)
   - Text area for explanation
   - "Submit Dispute" button
2. Write explanation (e.g., "I received this certificate from AWS in 2024")
3. Click "Submit Dispute"
4. System creates Dispute record
5. Flag status changes to "disputed"
6. Admin/recruiter can review via fraud review queue
7. Show confirmation: "Dispute submitted - awaiting review"

**Test Data**:
```
Dispute Explanation:
"This certificate is legitimate. I completed the AWS Solutions Architect 
Professional exam on January 15, 2024 and received the digital credential. 
The credential ID is correct (I can verify via AWS portal). The issuer 
'Amazon Web Services Training' is the official AWS certification body."
```

**Expected Result**:
- Dispute is created with candidate's explanation
- Status changes to "disputed"
- Admin notified for review
- Candidate sees "Awaiting Review" status

**Edge Cases**:
- Already disputed: Show "Dispute already submitted"
- Flag already dismissed: Show "This flag was dismissed"
- Flag already upheld: Show "This flag was upheld" (read-only)

---

---

## RECRUITER ROLE

### Feature Category: Job Management

#### Feature 23: Create Job Posting
**Purpose**: Create and post a new job opening with description, requirements, salary info.

**Navigation Path**: 
1. Navigate to `/jobs/new` (from job postings page, click "Post a Job")

**How to Test**:
1. Job creation form loads with fields:
   - Job Title (required)
   - Job Description (required, 500+ chars recommended)
   - Required Skills (multi-select or comma-separated)
   - Location (optional)
   - Salary Range (optional)
   - Job Type (Full-time / Contract)
   - Deadline (optional)
2. Fill in form:
   ```
   Title: Senior Backend Engineer
   Description: We're hiring a Senior Backend Engineer to...
   Skills: Python, Go, Kubernetes
   Location: San Francisco, CA
   Salary: $180K-$220K
   ```
3. Click "Post Job"
4. System creates Job record
5. Redirect to `/job-postings` showing new job

**Expected Result**:
- Job is created and persists
- Appears in recruiter's job list
- Available for candidates to discover and apply
- Candidates immediately see job in `/jobs` feed

**Edge Cases**:
- Missing required fields: Show validation errors
- Empty description: Error "Description too short"
- No skills: Job still posts but matching less effective
- Past deadline: Job still posts but shows "Closed" after deadline

---

#### Feature 24: View Job Postings List
**Purpose**: Recruiter sees all their posted jobs with quick links to matches and pipeline.

**Navigation Path**: 
1. Navigate to `/job-postings`

**How to Test**:
1. Page loads showing all jobs posted by this recruiter:
   - Job title
   - Location
   - Post date
   - "Matches" button → links to `/jobs/{jobId}/matches`
   - "Pipeline" button → links to `/pipeline/{jobId}`
2. Each job shows counts:
   - Applications received
   - Currently in review
   - Shortlisted

**Test Data**:
```
Jobs:
1. "Senior Backend Engineer" - San Francisco, CA - Posted July 31
   (15 applications, 3 shortlisted)
2. "Frontend Engineer" - Remote - Posted July 20
   (8 applications, 1 shortlisted)
```

**Expected Result**:
- All jobs listed
- Quick action buttons available
- Counts are accurate

**Edge Cases**:
- No jobs posted: Show "No jobs posted yet"
- Very old job (1+ year): Still visible but may show "Closed"

---

#### Feature 25: View AI-Ranked Job Matches
**Purpose**: See AI-ranked list of candidates best suited for a job based on Talent Score, skill similarity, and experience.

**Navigation Path**: 
1. From `/job-postings`, click "Matches" on a job
2. OR navigate to `/jobs/{jobId}/matches`

**How to Test**:
1. Page loads with ranked candidate list:
   - Rank (1-100+)
   - Candidate name
   - Talent Score
   - Match score (skill similarity %)
   - Key skills overlap
   - Experience years
   - Profile link
2. Each candidate shows:
   - Overall match percentage
   - Breakdown of match factors:
     - Talent Score match
     - Skill overlap
     - Experience relevance
   - Green/yellow/red indicator for fit
3. Click candidate name to open profile
4. Can add to watchlist or pipeline from here

**Test Data**:
```
Job: Senior Backend Engineer
Required Skills: Python, Go, Kubernetes, AWS, PostgreSQL

Top Match (Candidate Jane Doe):
- Talent Score: 82/100 (fits "Senior" level)
- Skills Match: 92% (has Python, Go, Kubernetes, AWS, PostgreSQL)
- Experience: 7 years backend (exceeds 5+ requirement)
- Match Score: 89/100 ⭐

Second Match (Candidate John Smith):
- Talent Score: 76/100
- Skills Match: 78% (has Python, AWS but missing Go)
- Experience: 4 years backend (below requirement)
- Match Score: 75/100
```

**Expected Result**:
- Candidates ranked by algorithm
- Top matches have 80+ match scores
- Can see why each candidate matches
- Can click through to profiles

**Edge Cases**:
- No candidates meet criteria: Show "No matches found"
- Only 1-2 candidates matched: Still show ranked
- Job very new: "Matches calculating..." message

---

#### Feature 26: Recruiter Copilot - AI Query Assistant
**Purpose**: Ask natural language questions about candidates and get AI-powered answers (e.g., "Who's the best fit for Python roles?" or "Which candidates have AWS experience?").

**Navigation Path**: 
1. Navigate to `/copilot`

**How to Test**:
1. Copilot interface loads with:
   - Chat input field
   - Query examples shown
   - Previous query history (if any)
2. Type a query: "Show me senior engineers with Python and leadership experience"
3. Click "Ask Copilot"
4. System processes query via AI agent:
   - Parses intent
   - Searches candidate pool
   - Ranks results
   - Generates summary
5. Results display:
   - Ranked list of matching candidates
   - Relevance score for each
   - Quick profile links
   - Reasoning summary
6. Try more complex queries:
   - "Who's interviewing for the backend role?"
   - "Best candidates for startups"
   - "List engineers with 5+ years experience in Go"

**Test Data**:
```
Query 1: "Show me senior engineers with Python and leadership experience"
Response:
- Jane Doe (Score: 95) - 82 Talent Score, 7 yrs exp, mentored 3 engineers
- Alice Cooper (Score: 87) - 78 Talent Score, 6 yrs exp, tech lead background

Query 2: "Who's the best fit for our AWS migration project?"
Response:
- John Smith (Score: 92) - AWS certified, 5 yrs cloud architecture
- Bob Wilson (Score: 88) - Led AWS migration at previous company

Query 3: "List engineers who've worked on real-time systems"
Response:
- Jane Doe (Score: 91) - Built real-time analytics at TechCorp
- Carol White (Score: 85) - WebSocket experience from StartupXYZ
```

**Expected Result**:
- Queries process in 2-5 seconds
- Results are accurate and relevant
- Candidates ranked correctly
- Reasoning provided for top results

**Edge Cases**:
- Unclear query: Copilot clarifies ("Did you mean...?")
- No matching candidates: Clear "No candidates found" message
- Ambiguous criteria: Copilot asks for clarification
- Query service unavailable: Error message shown

---

### Feature Category: Recruitment Pipeline

#### Feature 27: Kanban Pipeline - View & Manage Applications
**Purpose**: Drag-and-drop kanban board showing candidates' progress through hiring stages (Applied → Reviewing → Shortlisted → Interviewing → Offered → Closed).

**Navigation Path**: 
1. From `/job-postings`, click "Pipeline" on a job
2. OR navigate directly to `/pipeline/{jobId}`

**How to Test**:
1. Kanban board loads with columns:
   - "Applied" (all applications)
   - "Reviewing" (being reviewed)
   - "Shortlisted" (passing review)
   - "Interviewing" (scheduled interviews)
   - "Offered" (offer extended)
   - "Closed" (hired or rejected)
2. Each card shows:
   - Candidate name
   - Talent Score
   - Days in current stage
   - Current status indicator
3. Drag candidate from "Applied" → "Reviewing"
4. Verify status updates in real-time
5. Click candidate card to open profile
6. Use card menu to:
   - Schedule interview
   - Add note
   - Send rejection/offer
   - Remove from pipeline

**Test Data**:
```
Pipeline for "Senior Backend Engineer":
Applied (5):
- Jane Doe (82 Talent Score)
- John Smith (76)
- Alice Cooper (79)

Reviewing (3):
- Bob Wilson (81)
- Carol White (74)

Shortlisted (2):
- Dave Johnson (85)
- Eve Martinez (80)

Interviewing (1):
- Frank Davis (87) - Interview scheduled for Aug 5

Offered (0)
Closed (0)
```

**Expected Result**:
- Board loads with all applications
- Drag-drop updates status
- Card details visible
- Actions menu works

**Edge Cases**:
- Very long pipeline (100+ candidates): Should load but may need pagination
- Drag to invalid column: Validate before allowing
- Offline drag: Queue action for when online
- Candidate has active interview: Show link on card

---

#### Feature 28: Schedule Interview with Candidate
**Purpose**: Send interview invitation to candidate with time slot.

**Navigation Path**: 
1. From pipeline, click candidate → "Schedule Interview"
2. OR from application detail page → "Schedule Interview"

**How to Test**:
1. Interview scheduling form opens:
   - Interview type: "Live interview" / "Async video" / "Phone screen"
   - Date picker
   - Time picker
   - Interview template selector (if available)
   - Duration (default 45 min)
   - Timezone selector
   - Notes field
2. Select:
   - Type: "Live Interview"
   - Date: August 10, 2024
   - Time: 2:00 PM PT
   - Duration: 60 minutes
   - Notes: "Ask about AWS architecture experience"
3. Click "Schedule"
4. System creates InterviewSession
5. Email sent to candidate with link to join
6. Confirmation: "Interview scheduled for August 10 at 2:00 PM"

**Test Data**:
```
Interview Details:
Type: Live Interview
Candidate: Jane Doe (jane@example.com)
Date: August 10, 2024
Time: 2:00 PM PT
Duration: 60 minutes
Timezone: America/Los_Angeles
Notes: "Focus on distributed systems design and leadership background"
```

**Expected Result**:
- Interview session created
- Email sent to candidate
- Interview appears on recruiter's calendar
- Interview appears in candidate's `/interviews` (if they check)
- Recruiter can reschedule or cancel

**Edge Cases**:
- Time already booked: Show "That time slot is unavailable"
- Time is in past: Error "Cannot schedule in the past"
- Candidate email bounces: Warning shown
- No time zone: Use default or ask user

---

### Feature Category: Assessments

#### Feature 29: Create & Assign Assessment
**Purpose**: Create and assign coding challenges, MCQ quizzes, or project analysis tasks to candidates.

**Navigation Path**: 
1. From pipeline or candidate profile, click "Assign Assessment"
2. OR navigate to `/assessments/create` (recruiter view)

**How to Test**:
1. Assessment creation form:
   - Assessment type (Coding Challenge / MCQ Quiz / Project Analysis)
   - Title
   - Description
   - Time limit (in minutes)
   - Passing score (%)
2. For Coding Challenge:
   - Problem statement
   - Example input/output
   - Test cases (can add multiple)
   - Allowed languages
3. For MCQ:
   - Add questions (title, options, correct answer)
   - Add multiple questions
4. For Project Analysis:
   - Code/project to analyze
   - Analysis questions
5. Click "Create and Assign"
6. Select candidates to assign to
7. Click "Send"
8. Confirmation: "Assessment assigned to 3 candidates"

**Test Data**:
```
Coding Challenge:
Title: "Build a URL Shortener"
Description: Implement a service that takes long URLs and generates short IDs
Time Limit: 120 minutes
Problem: "Design a URL shortening service like bit.ly..."

MCQ Quiz:
Title: "System Design Fundamentals"
Time Limit: 30 minutes
Questions:
1. What is CAP theorem?
   A) Consistency, Availability, Partition tolerance ✓
   B) Client, Application, Protocol
   C) ...
```

**Expected Result**:
- Assessment created in system
- Can assign to 1+ candidates
- Candidates receive notification
- Assessment appears in their `/assessments` page
- Recruiter can view submissions

**Edge Cases**:
- Missing required fields: Validation error
- No candidates selected: Error "Select at least one candidate"
- Very complex problem: Still accepts
- Invalid test cases: Validation error

---

#### Feature 30: Review Assessment Submissions
**Purpose**: View candidate assessment results, code, and scores.

**Navigation Path**: 
1. From assessment management page, click "View Submissions"
2. OR from candidate profile, see "Assessment Results"

**How to Test**:
1. Submissions list shows:
   - Candidate name
   - Score achieved
   - Score needed to pass
   - Completion time
   - Submission date
   - Status (Passed / Failed)
2. Click submission to view details:
   - Full solution code (for coding challenges)
   - Test results (pass/fail per test case)
   - Time taken per question
   - Detailed analysis/feedback
3. Can add notes or feedback for candidate
4. Export submission as PDF

**Test Data**:
```
Submission: Coding Challenge "URL Shortener"
Candidate: John Smith
Score: 85/100
Status: PASSED
Time Spent: 95 minutes (within 120 min limit)
Test Results:
- Test 1: ✓ Basic URL shortening
- Test 2: ✓ Collision detection
- Test 3: ✓ Expiration handling
- Test 4: ✗ Concurrent requests (timeout)
```

**Expected Result**:
- All submissions listed
- Can view and analyze each
- Scores calculated correctly
- Feedback can be added

**Edge Cases**:
- Candidate didn't submit: Show "No submission"
- Submission incomplete: Show partial results
- Code has errors: Show compilation errors

---

### Feature Category: Analytics & Insights

#### Feature 31: Hiring Funnel Analytics
**Purpose**: View analytics on hiring pipeline: source breakdown, time-to-hire, conversion rates.

**Navigation Path**: 
1. Navigate to `/analytics`

**How to Test**:
1. Analytics dashboard shows:
   - Total applicants
   - Source breakdown (Direct / Referral / Job Board / etc.)
   - Conversion funnel (Applied → Reviewing → Shortlisted → Offered)
   - Time-to-hire metrics
   - Top performing sources
   - Average time per stage
2. View charts/graphs showing:
   - Funnel visualization
   - Trend over time
   - Source breakdown pie chart
   - Pipeline distribution
3. Filter by date range, job, skill, etc.
4. Export data as CSV

**Test Data**:
```
Hiring Funnel for Aug 2024:
Applied: 100
Reviewing: 45 (45% conversion)
Shortlisted: 20 (44% conversion)
Interviewing: 12 (60% conversion)
Offered: 5 (42% conversion)
Hired: 3 (60% conversion)

Time-to-Hire Metrics:
- Applied → Shortlist: 3 days avg
- Shortlist → Interview: 2 days avg
- Interview → Offer: 5 days avg
- Total Time-to-Hire: 10 days avg

Source Breakdown:
- Direct Applications: 60
- Referral: 25
- LinkedIn: 10
- Job Board: 5
```

**Expected Result**:
- Analytics load and display correctly
- Charts render
- Conversion rates calculated
- Can filter and export

**Edge Cases**:
- No applications: Show empty charts
- Small sample size (< 5): Show warning "Small sample"
- Data generation in progress: Show "Calculating..."

---

#### Feature 32: Top Performers Feed
**Purpose**: View top-performing hackathon teams and candidate-recruiter recommendations.

**Navigation Path**: 
1. Navigate to `/top-performers`

**How to Test**:
1. Feed shows:
   - Recent hackathon winners
   - Top-ranked teams and their members
   - Best performers in tracked skills
   - Recommended candidates for open roles
2. For each performer:
   - Name
   - Talent Score
   - Key achievements/hackathon results
   - "Add to Pipeline" button
   - Profile link
3. Click "Add to Pipeline" for open job
   - System adds candidate to job pipeline
   - Confirmation message

**Test Data**:
```
Top Performers:
1. Jane Doe - Won "FinTech Hackathon 2024" with Team "PaymentPro"
   Talent Score: 87 | Skills: Go, Kubernetes, PostgreSQL
   
2. John Smith - 2nd Place "AI Hackathon 2024" with Team "ModelMaster"
   Talent Score: 82 | Skills: Python, PyTorch, FastAPI
   
3. Alice Cooper - 1st Place "Web3 Hackathon 2024" with Team "SmartChain"
   Talent Score: 85 | Skills: Solidity, React, Web3.js
```

**Expected Result**:
- Top performers listed
- Hackathon results displayed
- Can quickly add to pipeline
- Profiles accessible

**Edge Cases**:
- No hackathons/performers: Show "No hackathons yet"
- Very old hackathon data: Still show but mark as historical

---

### Feature Category: Collaboration

#### Feature 33: Add Candidates to Watchlist
**Purpose**: Save interesting candidates for future consideration.

**Navigation Path**: 
1. From candidate profile, click "Add to Watchlist"
2. OR from pipeline/matches view, right-click candidate → "Add to Watchlist"

**How to Test**:
1. Click "Add to Watchlist" on candidate
2. System adds to watchlist
3. Button changes to "Remove from Watchlist"
4. Navigate to `/watchlist`
5. View all saved candidates:
   - Name
   - Talent Score
   - Why saved (e.g., "Great fit for backend role")
   - Last viewed date
6. Can remove from watchlist
7. Can add to pipeline from watchlist

**Test Data**:
```
Watchlist Items:
1. Jane Doe - Talent Score 82 - Saved July 31 - Great backend engineer
2. John Smith - Talent Score 76 - Saved July 28 - Good Python skills
```

**Expected Result**:
- Candidates added to watchlist
- Watchlist persists
- Can manage watchlist
- Easy access to prospects

**Edge Cases**:
- Adding same candidate twice: Show "Already in watchlist"
- Watchlist full (if limit exists): Show "Watchlist limit reached"
- Empty watchlist: Show "No candidates saved"

---

#### Feature 34: View Submission & Interview Reports
**Purpose**: View detailed analysis reports on candidate submissions and interviews (coding, resume, presentation).

**Navigation Path**: 
1. Navigate to `/reports/submission/{submissionId}` for coding/assessment reports
2. Navigate to `/reports/interview/{interviewId}` for interview analysis
3. Navigate to `/reports/contribution/{repo}` for GitHub contribution analysis

**How to Test**:
1. Submission Report (e.g., coding challenge):
   - Full problem statement
   - Candidate's solution (syntax-highlighted)
   - Test results (pass/fail breakdown)
   - Complexity analysis
   - Code quality score
   - Feedback summary
2. Interview Report:
   - Questions asked
   - Audio transcription (if available)
   - Rating on key competencies
   - Interviewer notes
   - Overall assessment
3. Contribution Report (GitHub):
   - Repository stats
   - Code sample analysis
   - Technical depth assessment
   - Language breakdown

**Test Data**:
```
Coding Challenge Report:
Candidate: John Smith
Problem: "Merge K Sorted Lists"
Solution Language: Python
Test Results: 9/10 passed
- Test 1 (Basic): ✓
- Test 2 (Empty lists): ✓
...
- Test 10 (Performance): ✗ (TLE)
Code Quality: 8/10
Complexity: O(n log k) - good but suboptimal for test 10
```

**Expected Result**:
- Detailed analysis reports display
- Code highlighted
- Results explained
- Feedback actionable

**Edge Cases**:
- Report generation in progress: Show "Generating report..."
- Interview audio missing: Show text notes only
- Contribution repo private: Show "Repository not accessible"

---

---

## ORGANIZER ROLE

### Feature Category: Hackathon Management

#### Feature 35: Create Hackathon Event
**Purpose**: Create a new hackathon event with dates, tracks, and configuration.

**Navigation Path**: 
1. Navigate to `/hackathons/new`

**How to Test**:
1. Hackathon creation form:
   - Event name (e.g., "TechCorp Summer Hackathon 2024")
   - Start date/time
   - End date/time
   - Tracks (multi-select or comma-separated, e.g., "AI/ML, Web3, Fintech")
   - Ingestion mode (CSV / Webhook / Manual)
   - Description
2. Fill in:
   ```
   Name: "TechCorp Summer Hackathon 2024"
   Start: August 15, 2024 - 9:00 AM PT
   End: August 17, 2024 - 6:00 PM PT
   Tracks: "AI/ML", "Web3", "FinTech"
   Ingestion: "CSV Import"
   ```
3. Click "Create Hackathon"
4. Redirect to `/hackathons/{id}/manage`
5. Verify hackathon created and visible in list

**Expected Result**:
- Hackathon record created
- Appears in organizer's list
- Accessible via ID

**Edge Cases**:
- Start date after end date: Validation error
- Duplicate event name: Warning but allowed
- Very old date: Warning if in past
- No tracks: Allowed but recommended

---

#### Feature 36: Ingest Teams (CSV Import)
**Purpose**: Bulk-import hackathon teams and members via CSV file.

**Navigation Path**: 
1. From `/hackathons/{id}/manage`, click "Import Teams"
2. OR `/hackathons/{id}/import`

**How to Test**:
1. CSV import form loads with:
   - File upload area
   - CSV template download
   - Submit button
2. Download template to see expected format
3. Create CSV file:
   ```
   team_name,members,repo_url,track,judge_score
   "PaymentPro","jane@github.com,john@github.com,alice@github.com",https://github.com/team1/payment-pro,FinTech,
   "ModelMaster","bob@github.com,carol@github.com",https://github.com/team2/model-master,AI/ML,
   "SmartChain","dave@github.com",https://github.com/team3/smartchain,Web3,
   ```
4. Upload CSV
5. System validates and previews:
   - Row count
   - Team count
   - Members found/not found
   - Errors (if any)
6. Click "Confirm Import"
7. Teams are created/updated in database
8. Success: "Imported 3 teams, 7 members"

**Test Data**:
```
team_name,members,repo_url,track,judge_score
PaymentPro,jane.doe:github,john.smith:github,alice.cooper:github,FinTech,
ModelMaster,bob.wilson:github,carol.white:github,AI/ML,
SmartChain,dave.johnson:github,Web3,
MobileFirst,eve.martinez:github,frank.davis:github,Web,
CloudOps,grace.lee:github,henry.park:github,DevOps,
```

**Expected Result**:
- Teams imported successfully
- Members matched to candidate profiles (if GitHub username exists)
- CSV validation provides clear errors
- Repo URLs stored for judge submission

**Edge Cases**:
- Duplicate team name: Update existing or create new (configurable)
- Member not in system yet: Still create team, link later
- Invalid CSV format: Show "Invalid CSV structure" with line number
- Repo URL invalid: Warning but import continues
- Empty CSV: Show "No teams to import"

---

#### Feature 37: Ingest Teams (Webhook)
**Purpose**: Receive team data via incoming webhook (e.g., from external hackathon platform).

**Navigation Path**: 
1. From `/hackathons/{id}/manage`, view webhook section
2. Copy webhook URL
3. External platform sends POST to that URL

**How to Test** (for testing team):
1. Get webhook URL from manage page
2. Send POST request with team data:
   ```json
   {
     "team_name": "PaymentPro",
     "members": [
       {"github_username": "jane.doe", "display_name": "Jane Doe"},
       {"github_username": "john.smith", "display_name": "John Smith"}
     ],
     "repo_url": "https://github.com/team1/payment-pro",
     "track": "FinTech"
   }
   ```
3. Webhook normalizes and creates/updates team
4. Verify team appears in `/hackathons/{id}/manage`

**Expected Result**:
- Webhook accepts and processes data
- Teams created from webhook payload
- Duplicates handled gracefully
- Webhook logs available for debugging

**Edge Cases**:
- Invalid JSON: Error "Invalid JSON payload"
- Missing required fields: Error with field name
- Webhook secret verification fails: 401 Unauthorized
- Malformed request: 400 Bad Request

---

#### Feature 38: Manage Hackathon Teams & Members
**Purpose**: View, edit, add, and remove teams and members.

**Navigation Path**: 
1. Navigate to `/hackathons/{id}/manage`

**How to Test**:
1. Teams list displays:
   - Team name
   - Track
   - Member count
   - Repo URL
   - Submission status
2. Click team to expand and see members:
   - Member name
   - GitHub username
   - Role (member / lead / etc.)
3. Can add member:
   - Enter name and GitHub username
   - Select role
   - Click "Add"
4. Can remove member:
   - Click "Remove" on member row
5. Can edit team:
   - Update track
   - Update repo URL
   - Update team name (with warning if changing)
6. Can delete team (cascades to submissions)

**Test Data**:
```
Team: PaymentPro
Track: FinTech
Members:
- Jane Doe (jane.doe) - Lead
- John Smith (john.smith) - Member
- Alice Cooper (alice.cooper) - Member
Repo: https://github.com/team1/payment-pro
```

**Expected Result**:
- Teams display with all details
- Can add/edit/remove members
- Changes persist immediately
- Cascading deletes work (team delete removes submissions)

**Edge Cases**:
- No teams yet: Show "No teams" message
- Team has no members: Allow, but may want warning
- GitHub username not found in system: Still add member
- Removing all members: Warn user

---

#### Feature 39: View Judge Submissions Queue
**Purpose**: See all team submissions pending judge evaluation.

**Navigation Path**: 
1. From `/hackathons/{id}/manage`, view "Judge Queue" section
2. OR `/judges/queue` (judge view)

**How to Test**:
1. Queue lists submissions:
   - Team name
   - Repo URL
   - Submission status (pending / submitted / scored)
   - Judge assigned (if applicable)
   - Repo quality score (if scored)
   - Pitch deck score (if scored)
2. Submissions without scores marked as "pending"
3. Click submission to view details and assigned judge
4. Organizer can reassign judge or manually score

**Expected Result**:
- All submissions visible
- Can track scoring progress
- Can see which are pending

**Edge Cases**:
- No submissions: Show "No submissions yet"
- All submissions already scored: Show "All submissions scored"

---

#### Feature 40: Finalize Hackathon Rankings
**Purpose**: Calculate final rankings based on judge scores, pitch deck analysis, repo quality, and novelty, with configurable weights.

**Navigation Path**: 
1. Navigate to `/hackathons/{id}/rankings`

**How to Test**:
1. Rankings page shows:
   - Weighting formula (currently hardcoded or configurable)
   - List of all teams with composite scores
   - Ranking (1st, 2nd, 3rd, etc.)
2. Weights displayed:
   - Judge score: 40%
   - Pitch deck: 30%
   - Repo quality: 20%
   - Novelty: 10%
3. Click "Finalize Rankings"
4. System:
   - Computes scores for all teams
   - Creates HackathonRanking records
   - Triggers "hackathon.rankings.finalized" event
   - Notifies recruiters with top 3 teams
5. Verify results show:
   - Rank 1-N
   - Team name
   - Composite score
   - Score breakdown (judge / pitch / repo / novelty)

**Test Data**:
```
Hackathon: "TechCorp Summer 2024"
Teams Scored:
1. PaymentPro - Composite 89.5
   Judge Score: 85 (0.40 * 85 = 34)
   Pitch Score: 92 (0.30 * 92 = 27.6)
   Repo Quality: 88 (0.20 * 88 = 17.6)
   Novelty: 90 (0.10 * 90 = 9)
   
2. ModelMaster - Composite 84.2
   Judge Score: 80 (32)
   Pitch Score: 87 (26.1)
   Repo Quality: 85 (17)
   Novelty: 88 (8.8)
   
3. SmartChain - Composite 81.0
   [Similar breakdown...]
```

**Expected Result**:
- Rankings calculated and displayed
- Top 3 highlighted
- Event triggered for recruiter integration
- Can re-finalize if judge scores change

**Edge Cases**:
- Ties in composite score: Handled by secondary sort (e.g., judge score)
- Team has no judge score: Excluded from ranking or score 0
- Team has no pitch deck: Only judge/repo/novelty count
- Finalizing twice: Re-calculates, doesn't duplicate

---

#### Feature 41: View Hackathon Leaderboard (Public)
**Purpose**: Public-facing leaderboard showing final rankings.

**Navigation Path**: 
1. Navigate to `/hackathons/{id}/leaderboard` (public route, no auth required)

**How to Test**:
1. Public leaderboard shows:
   - Ranked teams (1-N)
   - Team names
   - Scores
   - Members (with GitHub links)
   - GitHub repo link
2. Can filter by track
3. Rankings read-only for public users

**Test Data**:
```
Public Leaderboard: "TechCorp Summer 2024"
🥇 PaymentPro - 89.5 Pts (FinTech)
   Members: Jane Doe, John Smith, Alice Cooper
   Repo: github.com/team1/payment-pro

🥈 ModelMaster - 84.2 Pts (AI/ML)
   Members: Bob Wilson, Carol White
   Repo: github.com/team2/model-master
```

**Expected Result**:
- Leaderboard displays correctly
- Rankings match finalized rankings
- Public access works
- No edit controls visible

**Edge Cases**:
- Rankings not yet finalized: Show "Rankings not yet available"
- No teams: Show "No teams in this hackathon"

---

#### Feature 42: View Teams & Team Members Detail
**Purpose**: See detailed team info and member contributions.

**Navigation Path**: 
1. From leaderboard `/hackathons/{id}/leaderboard`, click team name
2. OR `/hackathons/{id}/teams/{teamId}`

**How to Test**:
1. Team detail page shows:
   - Team name
   - Track
   - Members (name, GitHub username)
   - Repo URL (linked)
   - Submission details
   - Scores (if evaluated)
   - Ranking (if finalized)
2. For each member:
   - GitHub profile link
   - Contribution stats (if linked to candidate)
   - Avatar/profile pic
3. Can view repository (external link)
4. Can view presentation (if uploaded)

**Test Data**:
```
Team: PaymentPro (FinTech Track)
Ranking: 1st Place (Composite Score: 89.5)

Members:
1. Jane Doe (@jane.doe)
   - Candidate Profile: Link to /[jane-doe]
   - Contributions: 120 commits, 15 PRs, 45 stars

2. John Smith (@john.smith)
   - Contributions: 85 commits, 8 PRs

3. Alice Cooper (@alice.cooper)
   - Contributions: 95 commits, 12 PRs

Repository: https://github.com/team1/payment-pro
Submission:
- Judge Score: 85/100
- Pitch Score: 92/100
- Repo Quality: 88/100
```

**Expected Result**:
- Team details display
- Members listed with profiles
- Repo accessible
- Scores visible

**Edge Cases**:
- Team members not in candidate pool: Still show GitHub username
- Private repo: Show URL but explain private
- No scores yet: Show "Awaiting evaluation"

---

---

## JUDGE ROLE

### Feature Category: Hackathon Evaluation

#### Feature 43: View Judge Evaluation Queue
**Purpose**: See all submitted hackathon projects awaiting evaluation.

**Navigation Path**: 
1. Navigate to `/evaluations`

**How to Test**:
1. Queue displays list of submissions:
   - Team name
   - Hackathon name
   - Repo URL
   - Judge score status (Pending / Scored: X/10)
2. Submissions sorted by:
   - Hackathon (most recent first)
   - Team name (alphabetical within hackathon)
3. Each entry shows:
   - Team name
   - Hackathon
   - Current judge score (if any)
   - "Evaluate →" link
4. Filter options:
   - By hackathon
   - By status (pending only / scored / all)
5. Count of pending evaluations

**Test Data**:
```
Judge Queue:
🏁 TechCorp Summer 2024
- PaymentPro - Scored 85/100 | Evaluate →
- ModelMaster - Pending | Evaluate →
- SmartChain - Scored 78/100 | Evaluate →

🏁 University AI Hackathon 2024
- Team AI - Pending | Evaluate →
- Neural Team - Pending | Evaluate →
```

**Expected Result**:
- All submissions list
- Status clear (pending vs scored)
- Can navigate to evaluation page

**Edge Cases**:
- No submissions: Show "No submissions yet"
- All scored: Show "All submissions have been evaluated"
- Only 1 submission: Still show in list

---

#### Feature 44: Evaluate & Score Team Submission
**Purpose**: Review team repository code/project and score it on quality/innovation.

**Navigation Path**: 
1. From `/evaluations`, click "Evaluate →" on a submission
2. OR `/submissions/{submissionId}?hackathonId={hackathonId}`

**How to Test**:
1. Evaluation page loads with:
   - Team name
   - Hackathon name
   - Repository URL (linked, opens in new tab)
   - Team members list
   - Current judge score (if any)
   - Scoring rubric
   - Code analysis (if available)
2. Review repository (in separate tab):
   - Browse team's code
   - Check implementation
   - Assess quality
3. Return to evaluation page
4. Score on 0-100 scale:
   - Input score: 85
   - Add feedback: "Excellent architecture, well-documented code..."
5. Click "Submit Score"
6. Confirmation: "Score submitted"
7. Score persists in database
8. Can re-score later (overwrites)

**Test Data**:
```
Team Submission:
Team: PaymentPro
Hackathon: TechCorp Summer 2024
Repo: https://github.com/team1/payment-pro
Track: FinTech

Judge Scoring Rubric:
- Code Quality (0-25 points)
- Innovation (0-25 points)
- Completeness (0-25 points)
- Presentation (0-25 points)

Sample Score: 85/100
Feedback: "Excellent payment processing system with solid architecture. 
Good error handling and validation. Could improve with more test coverage. 
Great demonstration of system design principles."
```

**Expected Result**:
- Evaluation page displays with repo link
- Score and feedback can be entered
- Score persists
- Can re-score anytime

**Edge Cases**:
- Repo private: Show error or ask for access
- Repo URL broken: Show error
- No repo submitted yet: Show "No submission"
- Scoring again: Warning "Overwrite existing score?" then update
- Network error during submit: Show retry button

---

#### Feature 45: View Team & Repository Details
**Purpose**: Detailed view of team members, their profiles, and contribution analysis.

**Navigation Path**: 
1. From submission evaluation page, scroll down or click "View Team Details"
2. OR `/hackathons/{id}/teams/{teamId}`

**How to Test**:
1. Team details show:
   - Team name
   - Members:
     - GitHub username
     - Profile link (if candidate in system)
     - Contribution stats from GitHub snapshots
   - Track
   - Repo URL
   - Repository statistics:
     - Language breakdown
     - Commit count
     - PR count
     - Issues
     - README (if available)
2. For each member:
   - Candidate profile link (if they're in hiring system)
   - Talent Score (if available)
   - GitHub contribution breakdown

**Expected Result**:
- Team and member details visible
- Contribution stats display
- Profiles linkable

**Edge Cases**:
- Member not in candidate pool: Show GitHub username only
- Private repo: Show summary if available
- No readme: Still show stats

---

---

## ADMIN ROLE

### Feature Category: User & Role Management

#### Feature 46: User List & Role Assignment
**Purpose**: Manage all users in system, assign roles (candidate/recruiter/organizer/judge/admin).

**Navigation Path**: 
1. Navigate to `/users` (admin only)

**How to Test**:
1. User list displays all users:
   - Email
   - Full name
   - Current role
   - Organization (if assigned)
   - Created date
2. For each user, can click to edit:
   - Change role (dropdown)
   - Assign to organization
   - View account details
3. Click "Edit" on a user:
   - Select new role
   - Click "Update Role"
   - Confirmation: "User role updated"
4. Role changes take effect immediately

**Test Data**:
```
Users:
- jane@example.com - Jane Doe - Current Role: Candidate - Created Aug 1
- john@example.com - John Smith - Current Role: Recruiter - TechCorp Org - Created Jul 31
- alice@example.com - Alice Cooper - Current Role: Admin - Created Jul 1
```

**Expected Result**:
- All users listed
- Roles can be changed
- Changes persist
- User sees new permissions on next request

**Edge Cases**:
- User not found: 404
- Assigning to non-existent org: Error
- Admin assigning themselves different role: Warning "Careful!"

---

#### Feature 47: Manage Organizations & Users
**Purpose**: Create organizations and assign users to them (for multi-tenant support).

**Navigation Path**: 
1. Navigate to `/admin` → "Organizations" section
2. OR `/organizations`

**How to Test**:
1. Organizations list:
   - Org name
   - User count
   - Created date
2. Create org:
   - Form: org name, description
   - Click "Create"
3. Assign user to org:
   - From user edit page, select org from dropdown
   - Click "Assign"
4. Verify user can see org context

**Test Data**:
```
Organizations:
- TechCorp
  - 15 users (5 recruiters, 10 candidates)
  - Created Jul 1, 2024
  
- StartupXYZ
  - 8 users (2 recruiters, 6 candidates)
  - Created Jul 15, 2024
```

**Expected Result**:
- Orgs created and listed
- Users assigned correctly
- Org isolation works

**Edge Cases**:
- Duplicate org name: Allow or warn
- User already in org: Show "Already assigned"

---

#### Feature 48: View Audit Log
**Purpose**: View system-wide action log for compliance and debugging.

**Navigation Path**: 
1. Navigate to `/audit-log`

**How to Test**:
1. Audit log displays:
   - Action (e.g., "user_created", "user_role_updated", "fraud_flag_raised")
   - Actor (user who performed action)
   - Target (what was affected)
   - Timestamp
   - Details (JSON)
2. Log entries sorted by timestamp (newest first)
3. Can limit results (show last 100, 500, etc.)
4. Can filter by action type or actor

**Test Data**:
```
Audit Log:
[Aug 1 12:45:30] user_role_updated - Admin alice@example.com updated john@example.com role to recruiter
[Aug 1 12:30:15] fraud_flag_raised - System raised certificate_fraud flag on candidate jane@example.com
[Aug 1 12:00:00] hackathon_created - Organizer bob@example.com created hackathon "TechCorp Summer 2024"
[Jul 31 18:20:45] application_created - Candidate jane@example.com applied to job "Senior Backend Engineer"
```

**Expected Result**:
- All audit entries visible
- Can filter/search
- Timestamps accurate
- Action details clear

**Edge Cases**:
- Very large log (100k+ entries): Pagination needed
- Sensitive data (passwords): Should be masked
- No audit entries: Show empty log

---

#### Feature 49: Manage Trusted Certificate Issuers
**Purpose**: Maintain registry of trusted certificate issuers for fraud detection.

**Navigation Path**: 
1. Navigate to `/trusted-issuers`

**How to Test**:
1. Trusted Issuers list:
   - Issuer name
   - Aliases (alternate names)
   - Verification URL template
   - Trust tier (Tier 1 / Tier 2 / etc.)
2. Add new issuer:
   - Form: Issuer name, aliases, verification URL, trust tier
   - Click "Add Issuer"
3. Edit issuer:
   - Update details
   - Click "Save"
4. Delete issuer:
   - Click "Delete" with confirmation
5. System uses this registry for certificate verification

**Test Data**:
```
Trusted Issuers:
1. Amazon Web Services Training
   Aliases: AWS, AWS Training
   Verification URL: https://aw.certmetrics.com/amazon/public/verification.aspx?code={credential_id}
   Trust Tier: 1
   
2. Google Cloud Training
   Aliases: Google Cloud, GCP
   Verification URL: https://www.credential.net/profiles/{credential_id}
   Trust Tier: 1
   
3. Coursera Verified Certificate
   Aliases: Coursera
   Verification URL: https://www.coursera.org/verify/{credential_id}
   Trust Tier: 2
```

**Expected Result**:
- Issuers listed with details
- Can add/edit/delete
- Registry used by certificate verification agents

**Edge Cases**:
- Duplicate issuer name: Warn
- Invalid URL template: Validation error
- Delete issuer used by verified certs: Warning

---

### Feature Category: Fraud & Compliance

#### Feature 50: Fraud Flag Review Queue
**Purpose**: Review AI-raised fraud flags for certificates, plagiarism, duplicate profiles, and AI-generated content.

**Navigation Path**: 
1. Navigate to `/fraud-review`

**How to Test**:
1. Fraud queue displays:
   - Candidate name/GitHub username
   - Flag type (Certificate Fraud / Plagiarism / Duplicate Profile / AI Content)
   - Status (Raised / Under Review / Disputed)
   - Confidence level (High / Medium / Low)
   - Evidence summary
   - "Review →" link
2. Click "Review →" on a flag
3. Detailed review page shows:
   - Full evidence trail
   - AI reasoning
   - Links to affected data
   - Dispute (if candidate disputed)
   - Admin actions: "Uphold" or "Dismiss"
4. Click "Uphold":
   - Write review notes
   - Flag is marked "upheld"
   - Affects candidate's authenticity score
5. Click "Dismiss":
   - Mark as false positive
   - Flag status: "dismissed"
   - No impact on candidate

**Test Data**:
```
Fraud Flag:
Candidate: Jane Doe (@jane.doe)
Type: Certificate Fraud
Status: Raised
Confidence: High
Evidence:
- Certificate issuer "Amazon Web Services" not found in trusted registry
- Credential verification URL returns 404
- OCR extracted text doesn't match known AWS cert format
- User claims issued Jan 2024, but timestamp metadata shows July 2024

Admin Review Options:
[ Uphold ] [ Dismiss ] [ Request More Info ]

If Disputed:
Candidate Explanation: "I received this AWS Solutions Architect cert from AWS..."
```

**Expected Result**:
- Flags displayed with confidence
- Evidence clearly presented
- Admin can uphold/dismiss
- Decision persists

**Edge Cases**:
- Flag has active dispute: Show dispute alongside
- Candidate not found: Show "Candidate deleted"
- Evidence artifacts missing: Show "Evidence unavailable"

---

#### Feature 51: Review Fraud Dispute
**Purpose**: Review disputes from candidates contesting fraud flags.

**Navigation Path**: 
1. From `/fraud-review`, click on flagged candidate
2. If "Disputed" badge shown, click "View Dispute"
3. OR `/fraud-review/{flagId}` shows dispute section

**How to Test**:
1. Dispute details show:
   - Original flag evidence
   - Candidate's written explanation
   - Dispute status (submitted / accepted / rejected)
2. Review candidate's explanation:
   - Does it credibly counter the evidence?
   - Is there corroborating information?
3. Admin can:
   - "Dismiss Flag" (accept dispute as valid)
   - "Uphold Flag" (reject dispute, keep flag)
   - "Request More Info" (ask candidate for clarification)
4. Record decision and notes
5. Click "Resolve Dispute"

**Test Data**:
```
Flag: Certificate_Fraud (Jane Doe)
Evidence: Certificate issuer not verified, metadata timestamp mismatch

Dispute Submitted by Jane Doe:
"This certificate is legitimate. I earned the AWS Solutions Architect 
Professional certification on January 15, 2024. The credential ID is 
CERT-2024-123456. The timestamp in my upload (July 2024) is when I 
scanned/uploaded the image, not when I earned it. I can verify via 
AWS portal if needed."

Admin Decision: Dismiss Flag ✓
```

**Expected Result**:
- Dispute shown with full context
- Admin can dismiss or uphold
- Decision is final
- Candidate notified

**Edge Cases**:
- Candidate withdrew dispute: Show "Dispute withdrawn by candidate"
- No dispute on flag: Show "No dispute submitted"

---

---

## TECHNICAL FEATURES ACROSS ALL ROLES

### Feature: Fraud Detection System

#### Feature 52: Automated Certificate Verification
**Purpose**: AI agent automatically verifies uploaded certificates against trusted issuer registry and credential APIs.

**Technical Path**:
- User uploads certificate via `/ingest/certificate`
- Certificate OCR extracts text and metadata
- `cert_graph` (LangGraph agent) processes:
  - Issuer lookup against `TrustedIssuer` registry
  - Credential ID verification via issuer's API (if available)
  - Metadata validation (dates, format)
  - Confidence scoring
- System creates `VerificationRecord` with signals
- If suspicious: raises `FraudFlag` (certificate_fraud type)

**How to Test**:
1. Upload certificate image/PDF
2. Wait for processing (usually < 10 seconds)
3. Check `/dashboard` or admin fraud queue
4. If flag raised: check evidence for:
   - Issuer match (found / not found in registry)
   - Credential verification result
   - OCR confidence
5. Admin reviews flag
6. Certificate verification_status changes based on review

**Test Data**:
```
Certificate Image (AWS):
- Extract: "AWS Solutions Architect Professional"
- Credential ID: "CERT-2024-123456"
- Issue Date: "January 15, 2024"

Verification Process:
1. OCR extracts text (confidence: 95%)
2. Issuer lookup: "Amazon Web Services" → Found in Tier 1
3. Credential verification: API returns ✓ Valid
4. Metadata check: Format valid, dates reasonable
5. Result: PASSED - No flag raised
```

**Expected Result**:
- Certificate verified or flagged
- Verification records persist
- Fraud flag created if needed

---

#### Feature 53: Plagiarism Detection
**Purpose**: AI agent analyzes submitted code and generated documents for plagiarism by comparing against:
- Open-source repositories
- Shared codebase patterns
- Submission by other candidates in hackathon

**Technical Path**:
- User submits code/document
- `plagiarism_graph` agent:
  - Tokenizes code
  - Compares against plagiarism database
  - Calculates similarity scores
  - Identifies matched sources
- Creates `PlagiarismMatch` records
- If threshold exceeded: raises `FraudFlag` (plagiarism type)

**How to Test**:
1. Candidate submits code assignment
2. Admin views submission report
3. Check for plagiarism section:
   - Similarity score (%)
   - Matched sources (with links)
   - Overlap details
4. If > threshold (e.g., 30%): fraud flag raised
5. Admin reviews and decides

**Expected Result**:
- Plagiarism detected and reported
- Similarity score accurate
- Fraud flag created if needed

---

#### Feature 54: Duplicate Profile Detection
**Purpose**: AI detects duplicate or coordinated-fraud profiles (e.g., same person with multiple accounts).

**Technical Path**:
- `duplicate_graph` compares candidate profiles
- Signals: Similar names, same GitHub account, same resume text, same IP, etc.
- Creates `FraudFlag` (duplicate_profile type) if high confidence
- Prevents multiple accounts from same person

**How to Test**:
1. Create two profiles with same GitHub username (manually in DB for testing)
2. Run duplicate detection
3. System raises flag
4. Admin reviews and decides

**Expected Result**:
- Duplicate profiles detected
- Flag created with evidence
- Admin can merge or dismiss

---

#### Feature 55: AI-Generated Content Detection
**Purpose**: Detect if resume/cover letter/interview responses are AI-generated rather than authentic.

**Technical Path**:
- System monitors LLM-generated content (resume, cover letter)
- Compares writing style against candidate's actual work (interviews, past docs)
- Flags if inconsistency detected
- Creates `FraudFlag` (ai_content type)

**How to Test**:
1. Candidate generates resume via AI tool
2. System marks generated document with provenance
3. If candidate also takes interview, compare writing styles
4. If styles very different: raise flag
5. Admin reviews evidence

**Expected Result**:
- AI-generated docs tracked
- Style analysis performed
- Flag created if needed

---

### Feature: Talent Scoring System

#### Feature 56: Talent Score Calculation (Multi-Dimensional)
**Purpose**: Compute AI-powered talent score across 7 dimensions using resume, GitHub, LeetCode, and assessments.

**Technical Path**:
- `candidate_intelligence/graph.py` runs on profile ingestion:
  - Resume parsing extracts skills, experience, education
  - GitHub analysis: code quality, contribution patterns, community impact
  - LeetCode stats: problem-solving capability
  - Assessment scores: coding/MCQ performance
  - Talent scoring node computes 7 sub-scores using LLM
  - Overall score is weighted average
  - Confidence score tracks evidence completeness

**How to Test**:
1. Create candidate with:
   - Resume with experience
   - GitHub connected
   - LeetCode username
   - 1+ assessment submitted
2. Go to `/dashboard`
3. View Talent Score with:
   - Overall (0-100)
   - 7 sub-scores with values
   - Confidence (X/7 signals)
   - Computed timestamp
4. Edit resume or reconnect GitHub
5. Score recalculates
6. View history to see trend

**Test Data**:
```
Candidate Profile Build:
1. Upload resume: +2 signals (experience, education)
2. Connect GitHub: +2 signals (coding_ability, community_participation)
3. Connect LeetCode: +1 signal (problem_solving)
4. Complete coding assessment: +1 signal (assessment confirmation)
5. Talent Score: 78/100 (6/7 signals, 86% confidence)
```

**Expected Result**:
- Score computes after each data source
- Confidence score increases with more signals
- Score improves with better data
- History shows progression

---

#### Feature 57: Resume & Cover Letter Generation with Fact-Checking
**Purpose**: Generate tailored resume/cover letter with AI, then fact-check against candidate's actual profile to prevent hallucinations.

**Technical Path**:
- Document generation graph:
  - Runs `resume_graph` or `cover_letter_graph`
  - Generates content using LLM
  - Fact-check node validates each claim against profile data
  - If hallucination detected (e.g., "worked at Google" but profile doesn't mention it): fails
  - Can retry with guardrails or return error
- PDF rendering and storage

**How to Test**:
1. Go to `/resume-builder`
2. Enter target JD
3. Click "Generate Resume"
4. System generates with tailored bullets
5. Fact-check runs:
   - Validates all companies mentioned in profile
   - Validates all skills mentioned
   - Validates education dates
6. If all facts verified: shows "Fact-Check Passed" and renders PDF
7. If facts fail: shows error with specific findings (e.g., "Mentioned Google but profile shows TechCorp")
8. Can retry or edit profile and regenerate

**Test Data**:
```
Profile:
- Experience: TechCorp (2020-2023), StartupXYZ (2023-present)
- Skills: Python, React, AWS
- Education: Stanford BS CS (2020)

Generated Resume Claims:
✓ "Worked at TechCorp (2020-2023)" - Verified
✓ "Implemented Python microservices" - Verified (skills match)
✗ "Worked at Google" - HALLUCINATION - Not in profile!

Result: FAILED - Must fix before resume generated
```

**Expected Result**:
- Resume generates from accurate profile
- Hallucinations caught and prevented
- User can regenerate after fixing profile
- PDF download works

---

### Feature: Job Matching & Ranking

#### Feature 58: AI-Powered Job-to-Candidate Matching
**Purpose**: Rank all candidates for a posted job using Talent Score, skill similarity, experience level, and embeddings-based semantic matching.

**Technical Path**:
- `recruitment/matching_graph` runs on job creation:
  - Builds candidate pool from all profiles with skills
  - For each candidate computes:
    - Talent Score alignment (senior role needs 75+ score)
    - Skill embedding similarity (cosine distance between job skills and profile skills)
    - Experience years match (required vs actual)
    - Location match
  - Ranks by composite match score
  - Creates `MatchScore` records persisted in DB

**How to Test**:
1. Recruiter creates job: "Senior Backend Engineer"
   - Required: 7+ years, Python, Go, Kubernetes, AWS
   - Location: SF or Remote
2. System matches all candidates
3. Recruiter visits `/jobs/{id}/matches`
4. Sees ranked list:
   - Rank 1: Jane Doe (89/100) - all skills, 8 yrs, SF
   - Rank 2: John Smith (75/100) - missing Go, 6 yrs, Remote ok
   - Rank 3: Alice Cooper (68/100) - missing AWS, 5 yrs
5. Can click each for full reasoning

**Expected Result**:
- Top-ranked candidates are genuinely good fits
- Skill matching accurate
- Experience level appropriate
- Match scores consistent

---

#### Feature 59: Recruiter Copilot - Natural Language Queries
**Purpose**: Answer recruiter questions about candidates via LLM agent trained on candidate pool.

**Technical Path**:
- `recruitment/copilot_graph` processes queries:
  - NLU to parse intent (find_skilled_for_role, find_by_experience, etc.)
  - Queries candidate pool with filters
  - Ranks results
  - LLM generates natural summary with context
  - Returns with links to profiles

**How to Test**:
1. Recruiter navigates to `/copilot`
2. Asks: "Who's the best fit for a Go backend role?"
3. Copilot returns top 5 candidates with explanation:
   ```
   Top candidates with Go experience:
   1. Jane Doe (89) - 7 yrs backend, Go expert from TechCorp
   2. John Smith (76) - 5 yrs, Go newbie but strong fundamentals
   ```
4. Ask: "Show me leaders"
5. Returns candidates with leadership badges/scores
6. Ask: "Who's interviewing?"
7. Shows candidates currently in interview stage

**Expected Result**:
- Queries process and return relevant results
- Explanations are contextual
- Results match candidate data
- Works with ambiguous queries

---

### Feature: Hackathon Ranking & Scoring

#### Feature 60: Multi-Agent Presentation Analysis
**Purpose**: AI analyzes pitch deck for quality, innovation, presentation, and plagiarism, generating rubric scores.

**Technical Path**:
- Candidate uploads PowerPoint/PDF presentation
- `ppt_analyzer/graph` runs:
  - Slide extraction (convert slides to images)
  - OCR text from slides
  - Plagiarism check against known presentations
  - Content quality analysis (structure, clarity, depth)
  - Innovation scoring (novel ideas, technical depth)
  - Presentation quality (visuals, flow)
  - Generates `PresentationScore`

**How to Test**:
1. Team uploads pitch deck for hackathon
2. System processes:
   - Extracts all slides
   - Performs analysis
3. Judge views `/submissions/{id}` → "Presentation Analysis" section
4. Shows:
   - Slide count
   - Content quality score
   - Innovation score
   - Presentation quality score
   - Plagiarism check result
   - Extracted text samples
5. Judge incorporates scores into overall evaluation

**Test Data**:
```
Presentation: "PaymentPro - FinTech Platform"
Slides: 12
Analysis Results:
- Slide Quality: 85/100 (clear formatting, good visuals)
- Content Depth: 88/100 (thorough technical explanation)
- Innovation Score: 92/100 (novel payment routing algorithm)
- Presentation Quality: 80/100 (good flow, minor typos)
- Plagiarism Check: 2% similar (low risk)
Overall Presentation Score: 85/100
```

**Expected Result**:
- Presentation analyzed automatically
- Scores provide objective data
- Judge can incorporate into overall ranking

---

#### Feature 61: Hackathon Ranking with Composite Scoring
**Purpose**: Rank teams using multiple data sources (judge scores, presentation analysis, repository quality, novelty) with configurable weights.

**Technical Path**:
- `hackathon/graph` runs finalization:
  - Collects all scoring signals:
    - Judge score (manual, 0-100)
    - Presentation score (automated, 0-100)
    - Repository quality score (automated, code quality)
    - Novelty score (automated, code uniqueness)
  - Applies weights: judge 40%, pitch 30%, repo 20%, novelty 10%
  - Computes composite score
  - Ranks teams 1-N
  - Publishes top 3 to recruiter event stream

**How to Test**:
1. Organizer goes to `/hackathons/{id}/rankings`
2. Judge scores all submissions (0-100)
3. Pitch and repo analysis auto-completes
4. Organizer clicks "Finalize Rankings"
5. System computes composites:
   ```
   PaymentPro:
   - Judge: 85 (40% = 34 pts)
   - Pitch: 92 (30% = 27.6 pts)
   - Repo: 88 (20% = 17.6 pts)
   - Novelty: 90 (10% = 9 pts)
   - Composite: 88.2 (RANK 1)
   ```
6. Rankings finalize and display
7. Event triggers recruiter integration

**Expected Result**:
- Composites calculated correctly
- Weights applied accurately
- Rankings match expectations
- Event fired for downstream systems

---

---

## EDGE CASES & CROSS-ROLE SCENARIOS

### Feature 62: User Authentication & Authorization
**Purpose**: All users authenticate via Clerk, with role-based access control.

**How to Test**:
1. Try accessing `/profile/edit` without signing in → redirect to `/sign-in`
2. Sign in with candidate account
3. Try accessing `/fraud-review` (admin only) → forbidden
4. Sign out
5. Try accessing candidate-only routes → forbidden
6. Sign in as admin
7. Can access all routes except candidate-specific ones

**Expected Result**:
- Unauthenticated users redirected to login
- Role-based access enforced
- Proper error messages for forbidden access

---

### Feature 63: Concurrent Operations & Race Conditions
**Purpose**: Handle multiple users making simultaneous changes.

**How to Test**:
1. Candidate A and B upload resume simultaneously
2. Talent scores compute independently
3. Recruiter A and B update same job simultaneously
4. Verify both updates merge correctly
5. Judge A and B score same submission simultaneously
6. Later score overwrites earlier (or warn)

**Expected Result**:
- Concurrent operations don't corrupt data
- Scores consistent
- Last write wins or conflicts resolved

---

### Feature 64: Performance Under Load
**Purpose**: System remains responsive with 100+ concurrent users.

**How to Test** (manual observation):
1. Multiple users browse job listings simultaneously
2. Multiple recruiters query copilot
3. Multiple candidates upload resumes
4. Verify:
   - Response times < 2s for most requests
   - No timeouts
   - Graceful degradation if services slow

**Expected Result**:
- Response times acceptable
- Errors handled gracefully
- No data corruption under load

---

---

## KNOWN LIMITATIONS & INCOMPLETE FEATURES

### 1. Interview Scoring/Transcription
**Status**: Interview recording works, but audio transcription/automatic scoring NOT fully implemented
**Where**: `/interview/{sessionId}` - Records audio but doesn't transcribe
**Expected**: Audio should be transcribed and scored on communication, technical depth, etc.
**Workaround**: Manual review of audio by recruiter

### 2. Assessment Auto-Grading
**Status**: Coding assessments run test cases, but plagiarism check on code NOT implemented
**Where**: `/assessments/{id}` - Tests pass/fail but no similarity check against other submissions
**Expected**: Should detect code plagiarism across candidates
**Workaround**: Manual review by recruiter

### 3. Skill Taxonomy Matching
**Status**: Partial - Basic skill name matching works, but semantic skill synonym matching incomplete
**Where**: Job matching ranks by skill overlap, but "Python" and "Python3" treated as different
**Expected**: Should normalize and match skill synonyms
**Workaround**: Recruiters should use consistent skill names

### 4. Multi-language Support
**Status**: Not implemented - UI is English only
**Where**: All pages hardcoded in English
**Expected**: Support for Spanish, Chinese, etc.
**Workaround**: None - English required

### 5. Real-time Notifications
**Status**: Email notifications sent, but no in-app real-time notifications
**Where**: Status updates don't refresh UI in real-time
**Expected**: WebSocket-based live updates
**Workaround**: Users must refresh page to see updates

### 6. Detailed Interview Feedback
**Status**: Recruiter can schedule interviews and take notes, but auto-generated feedback NOT implemented
**Where**: `/reports/interview/{id}` - Shows notes but no LLM-generated summary
**Expected**: AI should analyze interview (if recorded) and generate strengths/gaps
**Workaround**: Recruiter writes manual feedback

### 7. Candidate Matching for Hackathon Teams
**Status**: Incomplete - Hackathon shows top candidates, but auto-team-formation NOT available
**Where**: `/hackathons/{id}/manage` - Manual team entry only
**Expected**: AI should suggest team formations based on complementary skills
**Workaround**: Recruiters manually suggest teaming during event

---

## HARDCODED / MOCK IMPLEMENTATIONS - FIXED

### 1. Hackathon Rankings Weights [FIXED]
**File**: `services/agents/hackathon/tools/ranking.py`
**Was**: Weights hardcoded as:
```python
_WEIGHTS = {
    "judge_score_component": 0.40,
    "pitch_score_component": 0.30,
    "repo_quality_component": 0.20,
    "novelty_component": 0.10,
}
```
**Now Fixed**: 
- Added `scoring_config` (JSONB) field to `Hackathon` model
- `compute_composite_score()` now accepts `weights` parameter (defaults to hardcoded if None)
- Router passes `hackathon.scoring_config` to ranking agent
- Organizers can now configure weights per hackathon without code changes

**How to test**: Create hackathon, configure weights via `Hackathon.scoring_config` JSONB, finalize rankings, verify scores reflect custom weights.

---

### 2. Interview Scoring Rubric [FIXED]
**File**: `packages/db/models/assessment.py`
**Was**: Judges manually scored interviews 0-100 with no structured framework
**Now Fixed**:
- Added `scoring_rubric` (JSONB) field to `InterviewDefinition` model
  - Structure: `{competencies: [{name: str, description: str, weight: float}], scale: {min: 0, max: 100}}`
- Added `rubric_scores` (JSONB) field to `InterviewReport` model
  - Structure: `{competencies: [{name: str, score: float, feedback: str}]}`
- Enables consistent, structured evaluation across all interviews from same definition

**How to test**: Create interview definition with scoring rubric, conduct interview, verify rubric_scores populated in report.

---

### 3. Mock Profile Data in Tests
**Status**: NOT APPLICABLE
**Reason**: Codebase review found no mock/fixture test data. All testing uses live production data. No fix needed.

---

### 4. Hardcoded Fraud Thresholds [FIXED]
**Files**: `services/agents/fraud/tools/structural_similarity.py`, `text_fingerprint.py`, `visual_forensics.py`
**Was**: Thresholds hardcoded scattered across agent code:
```python
SIMILARITY_FLAG_THRESHOLD = 0.75  # structural similarity
SIMILARITY_FLAG_THRESHOLD = 0.80  # text similarity
_LOW_OCR_CONFIDENCE_THRESHOLD = 0.55
```
**Now Fixed**:
- Created `FraudDetectionConfig` model (`packages/db/models/fraud.py`)
  - `code_similarity_threshold` (default 0.75)
  - `text_similarity_threshold` (default 0.80)
  - `ocr_confidence_threshold` (default 0.55)
  - `photo_hash_max_distance` (default 4)
  - `ai_content_perplexity_threshold` (default 50)
- Supports per-organization configuration (or global if `org_id` is null)
- Admins can now adjust fraud detection sensitivity without code/deploy

**How to test**: Create FraudDetectionConfig row, update thresholds, run fraud detection, verify flags use configured values instead of hardcoded ones.

---

---

## TESTING DATA SETUP GUIDE

To fully test all features, create test data in this order:

### 1. Admin Setup
- Create admin user via Clerk
- Assign role "admin" via admin panel
- Create trusted certificate issuers (AWS, Google Cloud, etc.)

### 2. Recruiter Setup
- Create recruiter user
- Assign role "recruiter"
- Create 3-5 job postings with various skills/levels

### 3. Candidate Setup (Create 5-10 Candidates)
```
Candidate 1 (Jane Doe):
- Full name, headline, location
- Upload resume (extract to skills/experience/education)
- Connect GitHub (e.g., "jane-doe" with 10+ repos)
- Connect LeetCode (e.g., "neetcode" or similar)
- Upload certificate
- Complete 1+ assessment
- Expected Talent Score: 80-85/100

Candidate 2 (John Smith):
- Basic profile, GitHub only
- Expected Talent Score: 65-70/100

Candidate 3 (Alice Cooper):
- Profile + Resume only
- Expected Talent Score: 70-75/100

... (Add 5+ more with various profiles)
```

### 4. Organizer Setup
- Create organizer user
- Create 1-2 hackathons with dates, tracks
- Import teams via CSV with 5-10 teams

### 5. Judge Setup
- Create judge user
- Verify judges can see hackathon submissions
- Judge scores 3-5 submissions

### 6. Recruiter/Candidate Interactions
- Candidates browse jobs and apply
- Recruiters move applications through pipeline
- Schedule interviews
- Assign assessments
- Add candidates to watchlist

### 7. Hackathon
- Teams submit repos
- Judges score
- Organizer finalizes rankings

---

## QUICK REFERENCE: KEY URLS BY ROLE

### Candidate Routes
```
/profile/edit                 - Edit profile, connect GitHub/LeetCode, upload resume/cert
/dashboard                    - View Talent Score and profile overview
/career                       - Career guidance and skill gaps
/resume-builder              - Generate resume/cover letter
/assessments                 - View assigned assessments
/interviews                  - Browse and practice interviews
/interview/{sessionId}       - Take an interview
/applications                - View job applications
/my-flags                    - View fraud flags against you
/jobs                        - Browse job postings
/pitch-deck                  - Upload pitch deck
/{username}                  - Public portfolio (if username set)
```

### Recruiter Routes
```
/job-postings               - Manage posted jobs
/jobs/new                   - Create new job
/jobs/{id}/matches          - AI-ranked candidates for job
/pipeline/{jobId}           - Kanban pipeline for job
/copilot                    - AI query assistant
/analytics                  - Hiring funnel analytics
/top-performers             - Hackathon winners and top candidates
/reports/submission/{id}    - Review coding challenge submission
/reports/interview/{id}     - Review interview recording/notes
/watchlist                  - Saved candidates
```

### Organizer Routes
```
/hackathons/new             - Create hackathon
/hackathons/{id}/manage     - Manage teams, ingestion, config
/hackathons/{id}/rankings   - View and finalize rankings
/hackathons/{id}/leaderboard - Public leaderboard
```

### Judge Routes
```
/evaluations                - Judge queue (submissions to score)
/submissions/{id}           - Score a submission, view repo
```

### Admin Routes
```
/users                      - Manage users and roles
/audit-log                  - System-wide action log
/fraud-review               - Fraud flag review queue
/fraud-review/{flagId}      - Detailed flag review with evidence
/trusted-issuers            - Manage certificate issuer registry
```

### Public Routes (No Auth)
```
/sign-in                    - Clerk auth
/sign-up                    - Clerk auth
/onboarding                 - Post-signup setup
/hackathons/{id}/leaderboard - Hackathon leaderboard
/{username}                 - Candidate public portfolio
/pitch-deck/{id}            - View public presentation (if shared)
```

---

## DEMO SCENARIOS

### Scenario 1: Complete Candidate Onboarding (15 minutes)
1. Sign up as new candidate
2. Complete onboarding profile
3. Upload resume
4. Connect GitHub (or use existing account)
5. View updated Talent Score
6. Generate targeted resume for job
7. Browse and apply to job
8. View application status

### Scenario 2: Recruiter Hiring Flow (20 minutes)
1. Sign in as recruiter
2. Create new job posting
3. View AI-ranked matches
4. Use Copilot to search for specific skills
5. Add top candidate to pipeline
6. Schedule interview
7. Candidate completes interview
8. Review interview notes
9. Move candidate to shortlist
10. View hiring analytics

### Scenario 3: Hackathon Event Management (25 minutes)
1. Sign in as organizer
2. Create hackathon event
3. Import teams via CSV
4. Sign in as judge
5. Score 3 submissions
6. Sign back in as organizer
7. Finalize rankings
8. View leaderboard
9. Check top performers in recruiter view

### Scenario 4: Fraud Detection & Review (10 minutes)
1. Candidate uploads suspicious certificate
2. System flags as fraud (issuer not in registry)
3. Admin reviews fraud queue
4. Views full evidence
5. Candidate disputes flag
6. Admin reviews dispute and dismisses
7. Candidate notified of resolution

---

## PERFORMANCE TESTING NOTES

- **Resume Parsing**: 5-10 seconds (depends on doc complexity)
- **GitHub Sync**: 10-15 seconds (API calls + data processing)
- **Talent Score Calculation**: 2-5 seconds (LLM calls)
- **Job Matching**: 1-3 seconds (candidate pool scan, embeddings)
- **Presentation Analysis**: 10-20 seconds (slide OCR + LLM)
- **Fraud Detection**: 2-5 seconds (parallel checks)

---

## APPENDIX: DATA MODEL RELATIONSHIPS

```
User (1) ──has── (1) CandidateProfile
         ──has── (1) Organization
         
CandidateProfile (1) ──has-many── (N) TalentScore (history)
                  ──has-many── (N) GithubSnapshot (per repo)
                  ──has-many── (N) Certification
                  ──has-many── (N) GeneratedDocument (resumes/covers)
                  ──has-many── (N) Badge
                  ──has-many── (N) Application
                  ──has-many── (N) InterviewSession
                  ──has-many── (N) Presentation (pitch decks)

Job (1) ──has-many── (N) Application
    ──has-many── (N) MatchScore
    
Application (1) ──belongs-to── (1) Job
            ──belongs-to── (1) CandidateProfile
            ──has-many── (N) InterviewSession
            
Hackathon (1) ──has-many── (N) HackathonTeam
          ──has-many── (N) HackathonRanking
          
HackathonTeam (1) ──has-many── (N) HackathonTeamMember
              ──has-many── (1) HackathonSubmission
              
HackathonSubmission (1) ──has-many── (N) PresentationScore
                    ──has-many── (N) PlagiarismMatch
                    
FraudFlag (1) ──has-many── (N) Dispute
          ──has-many__ (N) VerificationRecord
```

---

## END OF TESTING GUIDE

This guide covers all major features across all 5 roles. For quick reference during testing, refer to the URL quick reference section. For detailed feature information, locate the feature number in this guide.

**Last Updated**: August 1, 2026
**Document Status**: DRAFT - Comprehensive feature inventory based on codebase analysis

