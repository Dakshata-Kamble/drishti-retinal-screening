# 👁️ Drishti. — Explainable AI for Diabetic Retinopathy Screening

> **Smart India Hackathon 2026 | Problem Statement: SIH26038**  
> **Theme:** MedTech / BioTech / HealthTech  
> **Category:** Software  
> **Team ID:** 133559  
> **Team:** Drishti.

Drishti. is a proposed **Explainable AI-based diabetic retinopathy (DR) screening system for rural India**. The solution is designed to support retinal screening by combining image quality assessment, retinal analysis, DR severity grading, explainable AI, and ophthalmologist review in an end-to-end workflow.

The project follows a **human-in-the-loop approach**, where AI provides screening support and visual evidence while the ophthalmologist remains involved in the final clinical review.

---

## 🎯 Problem Statement

Diabetic Retinopathy is a major cause of preventable vision loss. The project focuses on challenges that make retinal screening difficult in rural and underserved areas:

- High diabetes burden
- Limited access to ophthalmologists
- Time-consuming and resource-intensive manual screening
- Variable-quality images from portable fundus cameras
- Difficulty interpreting AI results when systems behave like black boxes

The proposed system aims to make screening more structured, explainable, and suitable for rural healthcare workflows.

---

## 💡 Proposed Solution

Drishti. provides an end-to-end retinal screening pipeline:

```text
Fundus Image Capture / Upload
            ↓
Image Quality Assessment
            ↓
Image Enhancement & Preprocessing
            ↓
Retinal Structure & Lesion Analysis
            ↓
DR Severity Grading (Level 0–4)
            ↓
Explainable AI / Grad-CAM
            ↓
Annotated Screening Report
            ↓
Ophthalmologist Review & Referral
```

### Key Features

- **Fundus image capture/upload**
- **Image quality assessment**
- CLAHE, denoising and image normalization
- Retinal structure segmentation
- Optic disc and fovea localization
- Retinal vessel analysis
- Lesion analysis including microaneurysms, exudates and hemorrhages
- **DR severity grading from Level 0–4**
- Confidence score
- **Grad-CAM attention maps**
- Visual evidence for clinical review
- Annotated PDF report generation
- Ophthalmologist review and referral support
- Telemedicine workflow simulation using Simulink

---

## 🧠 Explainable AI

A major focus of Drishti. is making AI-assisted screening easier to interpret.

Instead of presenting only an AI prediction, the system is designed to provide:

- Grad-CAM attention maps
- Visual evidence of potentially affected regions
- DR severity level
- Confidence score
- Annotated screening reports

This helps provide additional evidence for **ophthalmologist review** and addresses the black-box nature of deep learning systems.

---

## 🏗️ Technical Approach

### Technology Stack

| Module | Technology / Toolbox | Function |
|---|---|---|
| User Interface | React.js + Tailwind CSS | Patient input, image upload and dashboard |
| Image Processing | MATLAB Image Processing Toolbox | CLAHE, denoising and image quality assessment |
| Retinal Analysis | MATLAB Computer Vision Toolbox | Optic disc/fovea, vessels and lesion segmentation |
| DR Classification | MATLAB Deep Learning Toolbox | Feature extraction and Level 0–4 grading |
| Explainability | Grad-CAM | Attention maps and visual evidence |
| Data Storage | Database / Secure Storage | Patient data, images and results |
| Report Generation | PDF Report Generation | Annotated reports and confidence scores |
| System Simulation | Simulink | Telemedicine workflow and resource allocation |

---

## 🔄 System Architecture

The proposed architecture consists of the following stages:

1. **User / PHC Operator**
   - Login
   - Enter patient details
   - Capture or upload retinal image

2. **Preprocessing**
   - Image quality check
   - CLAHE
   - Denoising
   - Recapture/re-upload when image quality is inadequate

3. **Retinal Analysis**
   - Optic disc/fovea analysis
   - Vessel segmentation
   - Lesion detection

4. **DR Classification**
   - Deep learning based classification
   - ICDR Level 0–4 grading
   - Confidence score

5. **Explainability**
   - Grad-CAM
   - Lesion-level visual evidence
   - Attention maps

6. **Database & Reports**
   - Patient information
   - Images and predictions
   - Confidence scores
   - Annotated PDF reports

7. **Output & Dashboard**
   - Results
   - Heatmap
   - Report
   - Confirm / refer workflow

8. **Simulation**
   - Telemedicine workflow simulation
   - Bandwidth and throughput analysis
   - Resource allocation

---

## 🩺 Human-in-the-Loop Workflow

Drishti. is intended to **assist screening rather than replace ophthalmologists**.

```text
Screening Staff
      ↓
Retinal Image
      ↓
AI-Assisted Screening
      ↓
Result + Grad-CAM + Confidence
      ↓
Ophthalmologist Review
      ↓
Confirm / Refer
```

This workflow is intended to combine automated screening support with specialist oversight.

---

## 📊 Feasibility & Viability

### Technical Feasibility

- Uses existing image-processing and AI tools
- Supports rapid retinal image analysis
- Uses standard MATLAB toolboxes
- Designed to integrate image quality checks and AI-assisted grading

### Operational Feasibility

The proposed workflow is designed for use in rural PHCs and screening settings with:

- Portable fundus cameras
- Limited ophthalmologist availability
- Built-in image quality checking
- Screening staff operating the workflow

### Challenges & Mitigation

| Challenge | Proposed Mitigation |
|---|---|
| Variable image quality | Automatic image quality assessment |
| AI prediction may be incorrect | Confidence score and specialist review |
| Limited labelled data | Public datasets and additional data augmentation |
| Need for clinical validation | Testing with eye specialists before real-world use |
| Internet/system limitations | Offline-capable workflow and simulated cloud options |
| Staff unfamiliarity | Simple step-by-step workflow and training material |

---

## 📈 Expected Impact

The project is intended to support:

### Rural Patients
- Earlier screening and referral closer to home
- Reduced dependence on repeated long-distance travel

### Screening Staff
- Image-quality feedback
- Automated grading support
- Faster and more consistent screening

### Ophthalmologists
- Lesion evidence
- Grad-CAM explanations
- Severity grading
- Confidence scores for clinical review

### Healthcare Programs
- Telemedicine-supported screening workflows
- Referral support
- Simulink-based resource planning at district level

### Project Targets

The PPT identifies the following initial targets:

- **>80% initial sensitivity target**
- **>80% initial specificity target**
- **1,000+ patients** in future pilot/initial screening
- **<2 minutes** target processing time per case

These are **project targets**, not validated clinical performance results.

---

## 🗂️ Datasets & Benchmarking Resources

The project references retinal datasets for training, severity classification, lesion analysis and validation:

- **IDRiD — Indian Diabetic Retinopathy Image Dataset**
- **APTOS 2019 Blindness Detection — Kaggle**
- Combined DR Dataset — APTOS / IDRiD / Messidor / EyePACS
- Diagnosis of Diabetic Retinopathy dataset
- Kaggle Diabetic Retinopathy Detection dataset

---

## 📚 Research & References

The project research references include:

### Diabetic Retinopathy & Healthcare
- WHO — Blindness and Vision Impairment
- Vashist et al. (2022) — SMART India Survey
- Das et al. (2022) — DR Prevalence in Urban & Rural India
- IDF Diabetes Atlas, 11th ed. (2025)
- Jain et al. (2024) — Rural & Tribal DR in Maharashtra
- Gurudas et al. (2024) — SMART-India Vision Impairment & Blindness Study

### AI / Deep Learning
- Gulshan et al. (2016) — Deep Learning Algorithm for DR Detection
- Ting et al. (2017) — Deep Learning System for DR
- Gargeya & Leng (2017) — Automated DR Identification
- Krause et al. (2018) — Grader Variability & Reference Standards
- The Lancet Digital Health (2020) — AI for DR Screening

### Explainable AI
- Selvaraju et al. (2017) — Grad-CAM
- Ribeiro et al. (2016) — LIME
- Lundberg & Lee (2017) — SHAP

### Rural Healthcare & Responsible AI
- Ayushman Bharat Digital Mission (ABDM)
- Indian DR Guidelines (2020)
- AIOS–VRSI DR Screening Consensus
- MoHFW Operational Guidelines for DR
- NPCBVI — Government of India

---

## 🔗 Project Links

**GitHub Repository:**  
https://github.com/Dakshata-Kamble/drishti-retinal-screening

**Prototype Demo:**  
https://drive.google.com/file/d/1lbfquwzlhFatQ2_iNbvPSQMAWCSww423/view?usp=drivesdk

---

## ⚠️ Disclaimer

Drishti. is a **Smart India Hackathon 2026 project/prototype** developed for educational, research and demonstration purposes.

The system is intended as a screening-support solution and **does not replace professional medical diagnosis**. AI-generated results require appropriate clinical review and validation before any real-world medical deployment.

---

## 👥 Team

**Team Name:** Drishti.  
**Smart India Hackathon:** 2026  
**Problem Statement:** SIH26038 — Explainable AI for Diabetic Retinopathy Screening in Rural India
