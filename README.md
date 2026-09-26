# DRISHTI

**Explainable AI-Assisted Diabetic Retinopathy Screening & Referral System**

Government-scale public-health screening infrastructure for rural and semi-urban India.

---

## Purpose

DRISHTI is **not** a consumer healthcare app and **not** a generic medical dashboard.

It is designed for deployment across:

- Primary Health Centres (PHCs)
- Health and Wellness Centres (HWCs)
- Community Health Centres (CHCs)
- NCD / diabetes clinics
- Rural vision centres
- Mobile screening camps
- District hospitals
- Tertiary eye-care centres

The platform supports large-scale programmes involving hundreds of facilities, thousands of healthcare workers, district ophthalmologists, and 100,000+ screened patients annually.

**AI is decision support only.** It never independently diagnoses or treats. Final clinical decisions remain with qualified healthcare professionals.

---

## Clinical workflow

```
Patient identification → Registration → Visual acuity
→ Fundus image acquisition → Image quality assessment
→ (Recapture / enhance if needed) → AI-assisted analysis
→ Explainable findings + confidence → Ophthalmologist validation
→ Structured referral → Specialist examination → Treatment / follow-up
→ Longitudinal registry + programme analytics
```

---

## Hierarchy

```
National → State → District → Block → PHC / HWC / CHC / Vision Centre / Camp
                                              ↓
                                    Screening Operator
                                              ↓
                                    AI-assisted screening
                                              ↓
                                    Remote / District Ophthalmologist
                                              ↓
                                    District / Tertiary eye centre
```

---

## User roles

| Role | Primary responsibilities |
|------|--------------------------|
| **Screening Operator** | Patient ID & registration, visual acuity, fundus capture, quality guidance, submit for AI/ophthalmologist review |
| **Ophthalmologist** | Review AI-flagged cases, inspect images & explainability, accept / modify / reject AI classification, set urgency & referral |
| **District Program Manager** | Coverage, PHC performance, referral completion, workforce & equipment, aggregate KPIs |
| **State Program Administrator** | Cross-district comparison, resource gaps, bottlenecks, state trends |
| **System / IT Administrator** | Devices, users, permissions, sync health, audit, backups (no unnecessary PHI access) |

Use the **role switcher** in the header (demo) to explore each context.

---

## Key design principles

1. **Assistive AI** — Grad-CAM / lesion evidence, confidence, uncertainty flags; never autonomous diagnosis.
2. **Image quality loop** — Automatic quality assessment, operator feedback, recapture, optional enhancement, ungradable pathway.
3. **Longitudinal record** — Prior screening, prior classification, referral history, next due date.
4. **Referral tracking** — Generation → completion → specialist exam → treatment status.
5. **Offline / low-connectivity first** — Local storage, queue, sync when online (PWA).
6. **Role-based interfaces** — Operators see clinical workflow; managers see aggregates; IT sees systems.
7. **Secure records** — Encryption at rest for sensitive fields; least-privilege access.

---

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Express + better-sqlite3 (local encrypted store)
- PWA (vite-plugin-pwa) for offline
- Gemini (server-side) for structured retinal analysis assist

---

## Running locally

```bash
cp .env.example .env   # set GEMINI_API_KEY if using live AI
npm install
npm run dev            # Vite :3000 + API server
```

---

## Disclaimer

This software is a **screening decision-support** system intended for use within organised public-health programmes under clinical governance. It is not a substitute for examination by a qualified ophthalmologist or for definitive diagnosis and treatment of diabetic retinopathy or any other eye disease.
