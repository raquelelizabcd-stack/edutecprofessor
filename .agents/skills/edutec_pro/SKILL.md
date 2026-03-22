---
name: EduTecPro_Professor
description: A specialized framework for pedagogical records and teacher management.
---

# EduTecPro_Professor: System Architecture & Context

## Project Overview
EduTecPro_Professor is a specialized platform designed for Brazilian teachers to manage pedagogical records, student evolution, and lesson planning based on the **BNCC (Base Nacional Comum Curricular)** standards.

## Tech Stack
- **Frontend**: React (Typescript) + Vite
- **Styling**: Vanilla CSS + Tailwind CSS (mixed)
- **Database/Auth**: Supabase
- **Backend Logic**: Supabase Edge Functions (e.g., `sendExportEmail`)
- **UI Architecture**: Component-based with a central `Dashboard` that manages multiple modules through tabs.

## Core Data Structures

### BNCC (Base Nacional Comum Curricular)
The BNCC data is central to the project and is split into two main tracks:
1. **EI (Educação Infantil)**:
   - Organized by **Faixa Etária** (Bebês, Crianças bem pequenas, Crianças pequenas).
   - Contains **Campos de Experiência** (EO, TS, EF, ET, CG).
2. **EF (Ensino Fundamental)**:
   - Organized by **Bloco de Anos** (1º/2º, 3º/5º, 6º/7º, 8º/9º).
   - Contains **Componentes Curriculares** (LP, MA, HI, GE, CI, etc.).

### Database Schema (Supabase)
- `users`: Stores user profiles, plan (free/pro), trial status, and expiration dates.
- `alunos`: Student registry with names, birth dates, and special needs.
- `planejamento_diario`: Individual lesson plans with objectives and evaluation.
- `planejamento_semanal`: Grid-based weekly planning with BNCC integration.
- `relatorios`: General table for individual reports, PCD feedback, and monthly records.

## Implementation Patterns

### Dashboard Modules
Modules are accessible via the `NAV_ITEMS` array in `src/types.ts`. Each item defines:
- `id`: Unique identifier (e.g., `planejamento-semanal`).
- `roles`: Authorization levels required to see/access the module.
- `category`: Grouping label (Registros Pedagógicos, Relatórios, etc.).

### Export System
Supports PDF and CSV exports. 
- **PDF**: Generated client-side using `jsPDF` and `jsPDF-AutoTable`.
- **CSV**: Manual generation.
- **Email**: Integration via Edge Function `sendExportEmail`.

## Design System
- **Palette**: Emerald Green (#00A859), Deep Blue (#1A237E), Neutral Creams (#FDFCFB).
- **Typography**: Focused on readability for long-form reporting.
- **Components**: High usage of glassmorphism (`backdrop-blur`), smooth transitions (`framer-motion`), and rounded corners (32px).
