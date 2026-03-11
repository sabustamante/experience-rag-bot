# Stage 6 — CV Generator

> **Goal:** Given a job posting URL or text, the system generates a personalized, ATS-optimized CV by selecting and prioritizing the most relevant experience, then exports it as a downloadable PDF.
>
> **Deliverable:** User pastes a job posting → clicks Generate → downloads a tailored PDF CV.
>
> **Depends on:** Stage 1 (backend RAG pipeline), Stage 3 (web frontend), Stage 4 (mobile, optional)

---

## Steps

### 6.1 — Domain: CVGeneratorService

- [ ] Create `src/domain/services/cv-generator.service.ts`:
  - Inject `ILLMProvider`, `IVectorStore`, `IEmbeddingProvider`, `IRelationalStore`, `ITemplateEngine`
  - `generateCV(jobPosting: JobPosting): AsyncIterable<CVGenerationEvent>` — streams progress events
  - Internal pipeline:
    1. `parseJobPosting(jobPosting)` → extract required skills, seniority, industry
    2. `matchExperience(parsedJob)` → vector search filtered by relevance score
    3. `optimizeForATS(experience, parsedJob)` → LLM structured output (ranked sections)
    4. `renderTemplate(optimizedData)` → HTML via `ITemplateEngine`
    5. `toPDF(html)` → `Buffer`
  - `getGeneratedCVs(filters: CVFilters): Promise<GeneratedCV[]>`
- [ ] Define `CVGenerationEvent` union type: `{ type: 'progress', step, percent }` | `{ type: 'done', cvId }` | `{ type: 'error', message }`
- [ ] Write unit tests mocking all ports, covering each pipeline step independently

---

### 6.2 — Infrastructure: HandlebarsTemplateAdapter

- [ ] Install `handlebars`, `puppeteer` (for PDF generation)
- [ ] Create `src/infrastructure/templates/handlebars.adapter.ts`:
  - Implement `ITemplateEngine`
  - `render(templateName, data)` → compile Handlebars template + inject data → HTML string
  - `toPDF(html)` → launch headless Chromium via Puppeteer → `page.pdf({ format: 'A4', printBackground: true })`
  - Templates live in `src/infrastructure/templates/views/`
- [ ] Create `src/infrastructure/templates/views/cv-default.hbs`:
  - ATS-friendly HTML layout: clean typography, single column, no tables
  - Sections: header, summary, experience (ordered by relevance), skills, education
  - CSS: print-optimized, no colors (ATS parsers prefer plain text)
- [ ] Handle Puppeteer in Docker: add `chromium-browser` to Dockerfile or use `puppeteer/puppeteer` base image
- [ ] Write integration test: render template + generate PDF → verify buffer size > 0

---

### 6.3 — Application Layer: CVController

- [ ] Create `src/application/cv-generator/dto/generate-cv.dto.ts`:
  - `jobPostingText?: string` (min 50 chars)
  - `jobPostingUrl?: string` (valid URL, optional — scrape via LLM)
  - At least one of the two must be provided (custom validator)
- [ ] Create `src/application/cv-generator/cv-generator.controller.ts`:
  - `POST /api/cv/generate` — SSE endpoint streaming `CVGenerationEvent`
  - `GET /api/cv/:id/download` — return PDF buffer with `Content-Type: application/pdf`
  - `GET /api/cv/history` — list previously generated CVs
- [ ] Protect `/api/cv/*` with an API key guard (simple `x-api-key` header check)
- [ ] Add `CVGeneratorModule` and wire `CVGeneratorService`, `HandlebarsAdapter` to module

---

### 6.4 — Web Frontend: CV Generator Page

- [ ] Create `app/cv-generator/page.tsx`
- [ ] Create `app/components/cv-generator/JobPostingInput.tsx`:
  - Textarea for pasting job description
  - Optional URL input (auto-fetch description)
  - Character count + validation feedback
- [ ] Create `app/components/cv-generator/GenerationProgress.tsx`:
  - Renders `CVGenerationEvent` stream as step-by-step progress bar
  - Steps: Parsing job → Matching experience → Optimizing for ATS → Generating PDF
- [ ] Create `app/components/cv-generator/CVPreview.tsx`:
  - Renders generated CV in an `<iframe>` (PDF embed) or HTML preview
  - Download button: `<a href="/api/cv/:id/download" download="cv.pdf">`
  - "Regenerate" button clears state
- [ ] Create `app/hooks/useCVGenerator.ts`:
  - Opens SSE connection to `POST /api/cv/generate`
  - Manages `step`, `percent`, `cvId`, `error` state
  - On `type: 'done'` → enables download button

---

### 6.5 — Mobile: CV Generator Screen (optional)

- [ ] Create `src/screens/CVGeneratorScreen.tsx`:
  - Text input for job description paste
  - Progress indicator (steps list with checkmarks)
  - "Download" button: opens PDF in native viewer via `expo-sharing` or `Linking.openURL`
- [ ] Install `expo-sharing` and `expo-file-system`
- [ ] Download PDF to device temp directory, then share via native share sheet
- [ ] Add CV Generator tab to mobile navigation

---

### 6.6 — PostgreSQL: Store Generated CVs

- [ ] Create `src/infrastructure/storage/postgres-relational.adapter.ts`:
  - Implement `IRelationalStore`
  - `saveGeneratedCV(cv: GeneratedCV)` — store metadata + PDF buffer reference (S3 key or base64)
  - `getGeneratedCVs(filters)` — query by date range, job title keyword
- [ ] Create SQL migration: `generated_cvs` table
  - `id uuid PRIMARY KEY`, `job_title text`, `job_posting_text text`, `pdf_s3_key text`, `created_at timestamptz`
- [ ] For PDF storage: upload to S3 bucket (reuse frontend bucket or dedicated one) and store S3 key
- [ ] Add pre-signed URL generation for downloads: `aws s3.getSignedUrl('getObject', { Key, Expires: 3600 })`

---

## Completion Checklist

- [ ] `pnpm --filter api test` — CVGeneratorService unit tests pass
- [ ] `POST /api/cv/generate` with a real job posting → PDF downloads correctly
- [ ] PDF opens in reader without corruption
- [ ] CV content is relevant to the job posting (LLM correctly prioritized sections)
- [ ] Web CV Generator page streams progress in real time
- [ ] Download button appears only after generation completes
- [ ] Generated CVs are saved and retrievable via history endpoint
