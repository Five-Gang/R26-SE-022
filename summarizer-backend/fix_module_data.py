"""
Fix script: 
  A) Add SE4040 weekly outline (13 weeks)
  B) Fix duplicated LO text (| text | text | text |)
  C) Clean LO topic_keywords
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

SE4040_WEEKS = [
    {"week_number": 1,  "topic": "Introduction to Software Security",           "subtopics": ["Security principles", "CIA triad", "Attack surfaces", "Security mindset"]},
    {"week_number": 2,  "topic": "Threat Modeling",                              "subtopics": ["STRIDE model", "DREAD scoring", "Attack trees", "Data flow diagrams"]},
    {"week_number": 3,  "topic": "Secure Software Development Lifecycle (SSDLC)","subtopics": ["Security requirements", "Design reviews", "Security gates", "OWASP SAMM"]},
    {"week_number": 4,  "topic": "Input Validation and Output Encoding",          "subtopics": ["SQL Injection", "XSS", "Input sanitisation", "Parameterised queries"]},
    {"week_number": 5,  "topic": "Authentication and Session Management",         "subtopics": ["Password hashing", "Multi-factor auth", "Session tokens", "JWT"]},
    {"week_number": 6,  "topic": "Authorisation and Access Control",              "subtopics": ["RBAC", "ABAC", "Least privilege", "IDOR vulnerabilities"]},
    {"week_number": 7,  "topic": "Cryptography in Applications",                  "subtopics": ["Symmetric vs asymmetric", "TLS/SSL", "Key management", "Hashing"]},
    {"week_number": 8,  "topic": "Secure API Design",                             "subtopics": ["REST security", "API authentication", "Rate limiting", "OWASP API Top 10"]},
    {"week_number": 9,  "topic": "Vulnerability Assessment",                      "subtopics": ["Static analysis (SAST)", "Dynamic analysis (DAST)", "Penetration testing", "CVE/CVSS"]},
    {"week_number": 10, "topic": "Secure Coding Practices",                       "subtopics": ["Memory safety", "Buffer overflow prevention", "Error handling", "Dependency management"]},
    {"week_number": 11, "topic": "Security Protocols and Standards",              "subtopics": ["OAuth 2.0", "OpenID Connect", "SAML", "ISO 27001"]},
    {"week_number": 12, "topic": "Enterprise Security Management",                "subtopics": ["Security policies", "Incident response", "Security governance", "Risk management"]},
    {"week_number": 13, "topic": "Case Studies and Review",                       "subtopics": ["SolarWinds attack", "Equifax breach", "Exam preparation", "Research findings"]},
]

SE4040_CLEAN_LOS = [
    {"lo_code": "LO1", "text": "Interpret secure software programming practices and apply them in real world to build secure software applications.", "bloom_level": "Understand", "bloom_verb": "interpret", "topic_keywords": ["secure programming", "software security", "secure applications", "programming practices"]},
    {"lo_code": "LO2", "text": "Design threat models for identifying security vulnerabilities in applications and formulate mitigation techniques.", "bloom_level": "Create",    "bloom_verb": "design",    "topic_keywords": ["threat modeling", "STRIDE", "vulnerabilities", "mitigation", "DREAD"]},
    {"lo_code": "LO3", "text": "Explain the use of standard security protocols in application programming and apply them in real world use cases.", "bloom_level": "Understand", "bloom_verb": "explain",   "topic_keywords": ["security protocols", "TLS", "OAuth", "authentication", "cryptography"]},
    {"lo_code": "LO4", "text": "Analyze security vulnerability assessment reports and recommend resolution strategies.",                          "bloom_level": "Analyze",    "bloom_verb": "analyze",   "topic_keywords": ["vulnerability assessment", "SAST", "DAST", "penetration testing", "CVE", "CVSS"]},
    {"lo_code": "LO5", "text": "Create policies and best practices for enterprise security management and governance within an organization.",    "bloom_level": "Create",    "bloom_verb": "create",    "topic_keywords": ["security policy", "governance", "risk management", "enterprise security", "ISO 27001"]},
]

MODULE_ID = "f0610160-0fc3-4208-ae90-6c15bb05ac69"

async def fix_all():
    from sqlalchemy import select, delete
    from app.core.database import async_session_factory
    from app.models import Module, LearningOutcome, Week
    from app.models.module import Week as WeekModel

    async with async_session_factory() as db:
        # ─── C: Fix / replace all Learning Outcomes ───────────────────────────
        print("📝 Step C: Replacing Learning Outcomes with clean data...")
        await db.execute(delete(LearningOutcome).where(LearningOutcome.module_id == MODULE_ID))
        await db.flush()

        for lo_data in SE4040_CLEAN_LOS:
            lo = LearningOutcome(
                module_id=MODULE_ID,
                lo_code=lo_data["lo_code"],
                text=lo_data["text"],
                bloom_level=lo_data["bloom_level"],
                bloom_verb=lo_data["bloom_verb"],
                topic_keywords=lo_data["topic_keywords"],
            )
            db.add(lo)
        print(f"   ✅ {len(SE4040_CLEAN_LOS)} clean LOs added")

        # ─── A: Add weekly outline ─────────────────────────────────────────────
        print("📅 Step A: Adding weekly outline...")
        await db.execute(delete(WeekModel).where(WeekModel.module_id == MODULE_ID))
        await db.flush()

        for w in SE4040_WEEKS:
            week = WeekModel(
                module_id=MODULE_ID,
                week_number=w["week_number"],
                topic=w["topic"],
                subtopics=w["subtopics"],
            )
            db.add(week)
        print(f"   ✅ {len(SE4040_WEEKS)} weeks added")

        await db.commit()
        print("\n✅ All done! Module SE4040 now has:")
        print(f"   - {len(SE4040_CLEAN_LOS)} clean Learning Outcomes")
        print(f"   - {len(SE4040_WEEKS)} weeks of outline")

asyncio.run(fix_all())
