"""Data loading and emergency triage helpers for MedAlert Lucknow."""

from pathlib import Path
from typing import Any

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"


def load_data(filename: str) -> list[dict[str, Any]]:
    """Load a CSV from the local data directory as JSON-safe records."""
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")
    frame = pd.read_csv(path).fillna("")
    return frame.to_dict(orient="records")


def filter_hospitals(
    hospitals: list[dict[str, Any]],
    area: str = "",
    specialty: str = "",
    emergency_only: bool = False,
    facility_type: str = "",
    scheme: str = "",
    q: str = "",
) -> list[dict[str, Any]]:
    """Filter hospitals using case-insensitive partial matches across multiple fields."""
    area = area.strip().lower()
    specialty = specialty.strip().lower()
    facility_type = facility_type.strip().lower()
    scheme = scheme.strip().lower()
    q = q.strip().lower()

    filtered = []
    for hospital in hospitals:
        area_match = not area or area in str(hospital.get("area", "")).lower()
        specialty_match = not specialty or specialty in str(hospital.get("specialties", "")).lower()
        emergency_match = not emergency_only or str(hospital.get("emergency", "")).lower() == "yes"
        facility_match = not facility_type or facility_type in str(hospital.get("facility_type", "")).lower()
        scheme_match = not scheme or scheme in str(hospital.get("empanelled_schemes", "")).lower()
        
        query_text = " ".join([
            str(hospital.get("name", "")),
            str(hospital.get("area", "")),
            str(hospital.get("address", "")),
            str(hospital.get("specialties", "")),
            str(hospital.get("facility_type", "")),
            str(hospital.get("empanelled_schemes", "")),
        ]).lower()
        q_match = not q or q in query_text

        if area_match and specialty_match and emergency_match and facility_match and scheme_match and q_match:
            filtered.append(hospital)
    return filtered


def filter_donors(
    donors: list[dict[str, Any]],
    blood_group: str = "",
    organ: str = "",
    donor_type: str = "",
    area: str = "",
    q: str = "",
) -> list[dict[str, Any]]:
    """Filter blood and organ donors by group, organ type, area, or general query."""
    blood_group = blood_group.strip().lower()
    organ = organ.strip().lower()
    donor_type = donor_type.strip().lower()
    area = area.strip().lower()
    q = q.strip().lower()

    filtered = []
    for donor in donors:
        bg_match = not blood_group or str(donor.get("blood_group", "")).lower() == blood_group
        organ_match = not organ or organ in str(donor.get("organ", "")).lower()
        
        # Check donor category (Blood vs Organ)
        type_match = True
        if donor_type:
            if donor_type == "blood":
                type_match = str(donor.get("organ", "")).lower() == "blood"
            elif donor_type == "organ":
                type_match = str(donor.get("organ", "")).lower() != "blood"

        area_match = not area or area in str(donor.get("area", "")).lower()

        query_text = " ".join([
            str(donor.get("name", "")),
            str(donor.get("blood_group", "")),
            str(donor.get("organ", "")),
            str(donor.get("area", "")),
            str(donor.get("availability", "")),
        ]).lower()
        q_match = not q or q in query_text

        if bg_match and organ_match and type_match and area_match and q_match:
            filtered.append(donor)
    return filtered


def filter_schemes(
    schemes: list[dict[str, Any]],
    q: str = "",
    department: str = "",
) -> list[dict[str, Any]]:
    """Filter UP government medical schemes by department or search terms."""
    q = q.strip().lower()
    department = department.strip().lower()

    filtered = []
    for scheme in schemes:
        dept_match = not department or department in str(scheme.get("department", "")).lower()
        query_text = " ".join([
            str(scheme.get("name", "")),
            str(scheme.get("department", "")),
            str(scheme.get("eligibility", "")),
            str(scheme.get("benefit", "")),
        ]).lower()
        q_match = not q or q in query_text

        if dept_match and q_match:
            filtered.append(scheme)
    return filtered


def assess_triage(
    symptoms: list[str],
    vitals: dict[str, Any] | None = None,
    hospitals: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Return a transparent, rule-based urgency assessment with hospital recommendations."""
    symptoms_cleaned = [symptom.strip().lower() for symptom in symptoms if isinstance(symptom, str) and symptom.strip()]
    vitals = vitals or {}
    
    critical_terms = {"unconscious", "severe bleeding", "chest pain", "not breathing", "stroke"}
    urgent_terms = {"breathing difficulty", "severe pain", "fracture", "burn", "head injury", "high fever"}
    
    critical_hits = [term for term in symptoms_cleaned if term in critical_terms]
    urgent_hits = [term for term in symptoms_cleaned if term in urgent_terms]

    vital_warnings = []

    try:
        oxygen = float(vitals.get("oxygen", 98))
        if oxygen < 90:
            vital_warnings.append(f"Critical hypoxia detected: SpO2 at {oxygen}% (Normal > 95%)")
        elif oxygen < 94:
            vital_warnings.append(f"Low oxygen saturation: SpO2 at {oxygen}%")
    except (TypeError, ValueError):
        oxygen = 98

    try:
        heart_rate = float(vitals.get("heart_rate", 75))
        if heart_rate > 140:
            vital_warnings.append(f"Severe tachycardia: Heart rate at {heart_rate} BPM")
        elif heart_rate < 40:
            vital_warnings.append(f"Severe bradycardia: Heart rate at {heart_rate} BPM")
        elif heart_rate > 120:
            vital_warnings.append(f"Elevated heart rate: {heart_rate} BPM")
    except (TypeError, ValueError):
        heart_rate = 75

    try:
        sys_bp = float(vitals.get("sys_bp", 120))
        if sys_bp > 180:
            vital_warnings.append(f"Hypertensive crisis range: Systolic BP {sys_bp} mmHg")
        elif sys_bp < 90 and sys_bp > 0:
            vital_warnings.append(f"Hypotension alert: Systolic BP {sys_bp} mmHg")
    except (TypeError, ValueError):
        sys_bp = 120

    is_critical = bool(critical_hits or oxygen < 90 or heart_rate > 140 or heart_rate < 40)
    is_urgent = bool(urgent_hits or oxygen < 94 or heart_rate > 120 or heart_rate < 50 or sys_bp > 160 or sys_bp < 90)

    if is_critical:
        level = "RED"
        level_label = "CRITICAL EMERGENCY - IMMEDIATE DISPATCH NEEDED"
        score = 95
        action_steps = [
            "Call emergency response (112 or 108) immediately.",
            "Keep patient calm, lying down, and clear the surrounding area.",
            "Do NOT offer food, drink, or oral medications if unconscious or chest pain is present.",
            "Prepare patient medical history and current medications for paramedics."
        ]
    elif is_urgent:
        level = "AMBER"
        level_label = "URGENT MEDICAL CARE REQUIRED"
        score = 70
        action_steps = [
            "Proceed to the nearest hospital emergency department or trauma center.",
            "Monitor vital signs continuously (Oxygen SpO2 and Heart Rate).",
            "Keep patient hydrated and supported in a comfortable seated position.",
            "Contact hospital prior to arrival if special trauma facilities are needed."
        ]
    else:
        level = "GREEN"
        level_label = "ROUTINE / MONITORED CARE"
        score = 30
        action_steps = [
            "Schedule a clinical consultation or visit an outpatient clinic.",
            "Rest, maintain fluid intake, and monitor symptom progression.",
            "Seek immediate urgent care if symptoms suddenly deteriorate."
        ]

    # Select recommended hospitals if available
    recommended_hospitals = []
    if hospitals:
        if is_critical or is_urgent:
            # Pick emergency ready hospitals
            emerg_hospitals = [h for h in hospitals if str(h.get("emergency", "")).lower() == "yes"]
            # Prioritize trauma/cardiology specialists
            recommended_hospitals = sorted(
                emerg_hospitals,
                key=lambda h: (
                    0 if ("trauma" in str(h.get("specialties", "")).lower() or "cardiology" in str(h.get("specialties", "")).lower()) else 1,
                    -int(h.get("beds", 0)) if str(h.get("beds", "")).isdigit() else 0
                )
            )[:3]
        else:
            recommended_hospitals = hospitals[:3]

    formatted_hospitals = []
    for h in recommended_hospitals:
        formatted_hospitals.append({
            "id": h.get("id", ""),
            "name": h.get("name", ""),
            "area": h.get("area", ""),
            "phone": h.get("phone", ""),
            "specialties": h.get("specialties", ""),
            "beds": h.get("beds", ""),
            "address": h.get("address", ""),
            "facility_type": h.get("facility_type", "")
        })

    return {
        "level": level,
        "level_label": level_label,
        "score": score,
        "action_steps": action_steps,
        "matched_symptoms": critical_hits + urgent_hits,
        "vital_warnings": vital_warnings,
        "recommended_hospitals": formatted_hospitals,
        "disclaimer": "⚠️ DISCLAIMER: MedAlert Lucknow provides automated triage decision support based on entered symptoms and vitals. It does NOT constitute medical diagnosis or replace emergency medical professionals. In case of severe illness or life-threatening emergency, call 112 or visit the nearest emergency room immediately.",
    }


def rag_chat_query(
    user_message: str,
    hospitals: list[dict[str, Any]],
    schemes: list[dict[str, Any]],
    donors: list[dict[str, Any]],
) -> dict[str, Any]:
    """Perform pandas context retrieval across local datasets and synthesize an answer."""
    query = user_message.strip().lower()
    retrieved_contexts = []
    answer_parts = []

    # 1. Hospital retrieval
    matched_hospitals = filter_hospitals(hospitals, q=query)
    if matched_hospitals:
        top_h = matched_hospitals[:3]
        h_names = ", ".join(h["name"] for h in top_h)
        answer_parts.append(f"Found {len(matched_hospitals)} matching hospital(s) in Lucknow: {h_names}.")
        for h in top_h:
            retrieved_contexts.append({
                "source": "Lucknow Hospitals Directory",
                "title": h["name"],
                "snippet": f"Area: {h['area']} | Beds: {h['beds']} | Specialties: {h['specialties']} | Emergency: {h['emergency']} | Phone: {h['phone']}"
            })

    # 2. Scheme retrieval
    matched_schemes = filter_schemes(schemes, q=query)
    if matched_schemes:
        top_s = matched_schemes[:2]
        s_names = ", ".join(s["name"] for s in top_s)
        answer_parts.append(f"Found relevant UP Government health scheme(s): {s_names}.")
        for s in top_s:
            retrieved_contexts.append({
                "source": "UP Government Health Schemes",
                "title": s["name"],
                "snippet": f"Department: {s['department']} | Benefit: {s['benefit']} | Eligibility: {s['eligibility']}"
            })

    # 3. Donor retrieval
    matched_donors = filter_donors(donors, q=query)
    if matched_donors:
        top_d = matched_donors[:2]
        answer_parts.append(f"Matched {len(matched_donors)} active donor record(s) in the Lucknow registry.")
        for d in top_d:
            retrieved_contexts.append({
                "source": "Lucknow Donor Registry",
                "title": f"{d['name']} ({d['blood_group']} - {d['organ']})",
                "snippet": f"Area: {d['area']} | Availability: {d['availability']} | Contact via coordinator"
            })

    # 4. Emergency / First Aid fallback & synthesis
    if "emergency" in query or "chest pain" in query or "112" in query or "trauma" in query:
        answer_parts.append("For immediate life-threatening medical emergencies in Lucknow, dial 112 or 108 immediately. Major trauma centers include KGMU (Chowk) and Lohia Institute (Gomti Nagar).")
        retrieved_contexts.append({
            "source": "UP Emergency Services",
            "title": "National Emergency Helpline 112",
            "snippet": "24/7 centralized dispatch for ambulance, police, and fire response in Uttar Pradesh."
        })

    if not answer_parts:
        # Fallback informative guide
        answer = f"I retrieved information regarding your query '{user_message}'. For medical facilities in Lucknow, you can check KGMU, Lohia Institute, or Medanta. For UP schemes, Ayushman Bharat PM-JAY provides up to ₹5 lakh cover per family for eligible residents."
        retrieved_contexts.append({
            "source": "MedAlert Lucknow Care Guide",
            "title": "Lucknow Health Services Summary",
            "snippet": "KGMU Trauma Center (Chowk), Lohia Institute (Gomti Nagar), Balrampur Hospital (Hazratganj)."
        })
    else:
        answer = " ".join(answer_parts)

    return {
        "answer": answer,
        "retrieved_context": retrieved_contexts,
        "disclaimer": "⚠️ DISCLAIMER: MedAlert Care AI provides automated context retrieval from UP health records. It does NOT provide formal medical diagnosis or prescription. Always consult a certified medical professional or call 112 for urgent care."
    }


def process_prescription_ocr(file_name: str | None = None) -> dict[str, Any]:
    """Simulate OCR processing on an uploaded prescription image/document."""
    display_name = file_name or "uploaded_prescription.jpg"
    return {
        "status": "success",
        "file_name": display_name,
        "prescription_info": {
          "doctor": "Dr. A. K. Sharma, MD (Internal Medicine)",
          "reg_no": "UP-MMC/58912",
          "clinic": "Lucknow Clinical Diagnostics, Gomti Nagar",
          "date": "2026-08-21",
          "patient": "Demo Patient (Age: 42, Male)"
        },
        "medications": [
          {
            "name": "Paracetamol 650mg",
            "type": "Analgesic / Antipyretic",
            "dosage": "1 tablet twice daily after meals (1-0-1)",
            "duration": "3 - 5 days",
            "uses": "Reduces high fever, body aches, and joint discomfort.",
            "side_effects": "Mild nausea; avoid exceeding 4,000mg/day to prevent liver toxicity.",
            "precautions": "Take with water after food; do not combine with alcohol."
          },
          {
            "name": "Amoxicillin 500mg",
            "type": "Broad-Spectrum Antibiotic",
            "dosage": "1 capsule every 8 hours (1-1-1)",
            "duration": "5 days (Complete full course)",
            "uses": "Treats bacterial throat, sinus, and respiratory tract infections.",
            "side_effects": "Mild stomach discomfort, diarrhea, skin rash.",
            "precautions": "Complete the entire prescribed course even if symptoms improve."
          },
          {
            "name": "Pantoprazole 40mg",
            "type": "Proton Pump Inhibitor (Antacid)",
            "dosage": "1 tablet early morning before breakfast (1-0-0)",
            "duration": "7 days",
            "uses": "Prevents gastric acidity and protects stomach mucosal lining.",
            "side_effects": "Mild headache or abdominal gas.",
            "precautions": "Take on an empty stomach at least 30 mins before food."
          }
        ],
        "instructions": [
          "Maintain adequate hydration (2.5L water daily).",
          "Rest and monitor body temperature twice daily.",
          "Follow up with clinic if fever persists beyond 3 days."
        ],
        "disclaimer": "⚠️ DISCLAIMER: OCR text extraction is an automated assistive tool for prescription digitization. Always verify dosages with your physician or pharmacist."
    }


