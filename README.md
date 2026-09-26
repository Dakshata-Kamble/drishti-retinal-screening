# drishti-retinal-screening
DrishtiAI — AI-powered diabetic retinopathy screening platform designed for rural and resource-constrained healthcare settings. It combines retinal image quality assessment, enhancement, DR severity classification, explainable AI (Grad-CAM), clinical review, and referral support in a human-in-the-loop workflow.

## Problem

Diabetic Retinopathy is a major cause of preventable vision loss. In rural areas, screening is affected by limited access to eye specialists, large screening requirements, and variable-quality images captured using portable fundus cameras.

Existing AI-based screening systems can also be difficult to interpret clinically. DrishtiAI addresses these challenges by combining **quality-aware screening, explainable AI, and human clinical review** in a single workflow.

## Proposed Workflow

```text
Patient / PHC Operator
          ↓
   Patient Details
          ↓
   Capture / Upload
   Retinal Image
          ↓
 Image Quality Assessment
          ↓
 Retinal Analysis & Segmentation
          ↓
   DR Severity Grading
          ↓
 Explainability (Grad-CAM)
          ↓
 Annotated Report
          ↓
 Ophthalmologist Review
          ↓
 Confirm / Refer
