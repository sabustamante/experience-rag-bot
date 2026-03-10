---
type: project
id: rag-chatbot
name: Experience RAG Chatbot
companyId: personal
startDate: "2024-01"
endDate: ""
current: true
techStack:
  - TypeScript
  - NestJS
  - Next.js
  - React Native
  - pgvector
  - Amazon Bedrock
  - AWS CDK
  - Docker
url: https://github.com/SamuelBustamante/experience-rag-bot
---

# Experience RAG Chatbot

## Description

AI-powered chatbot that answers questions about professional experience using Retrieval-Augmented Generation.
Features a dynamic personal landing page that adapts content based on visitor profile
(Frontend, Backend, or Fullstack), and a CV generator that produces ATS-optimized resumes from job postings.

## Responsibilities

- Designed hexagonal architecture separating domain from infrastructure concerns
- Built RAG pipeline with embedding ingestion and semantic vector search
- Implemented streaming chat responses with Amazon Bedrock (Claude)
- Created adaptive landing page content generation based on visitor profile classification
- Developed CV generator that parses job postings and produces tailored PDFs

## Achievements

- Achieved sub-300ms P95 response time for vector search queries
- Designed infrastructure cost-efficient architecture (~$28-31/month on AWS)
- Built monorepo with Turborepo enabling shared types across web, mobile, and API
