#!/usr/bin/env python3
"""Detect and redact personal names with stronger false-positive protection.

Upgrades vs the original version:
  - Detects and redacts full names, linked first names, and linked surnames.
  - Stronger job-title / role / business-term filtering to avoid false positives.
  - Better email-name extraction and person linking.
  - Signature, header, label, and greeting-aware detection.
  - Safer replacements using word boundaries instead of loose substring replacement.

Default behavior is intentionally conservative for standalone first names / surnames:
  they are only redacted when they are linked to a detected full person name.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Two or three adjacent capitalized tokens, allowing Nordic letters and apostrophes.
NAME_TOKEN = r"[A-ZÅÄÖ][a-zåäöA-ZÅÄÖ'’-]{1,24}"
FULL_NAME_RE = re.compile(rf"\b({NAME_TOKEN})(?:\s+)({NAME_TOKEN})(?:\s+({NAME_TOKEN}))?\b")

GREETING_NAME = re.compile(
    rf"(?:^|[\s,(])(?:Hi|Hello|Hey|Dear|Hej|Hallå)\s*,?\s+"
    rf"({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,2}})",
    re.IGNORECASE,
)

SIGNOFF_NAME = re.compile(
    rf"(?:^|\n)(?:Best|Regards|Kind regards|Thanks|Thank you|Cheers|Med vänlig hälsning|Mvh)"
    rf"[,\s]*\n\s*({NAME_TOKEN}(?:[ \t]+{NAME_TOKEN}){{0,2}})",
    re.IGNORECASE,
)

HEADER_NAME = re.compile(
    rf"^(?:From|To|Cc|Bcc|Sender|Reply-To)\s*:\s*"
    rf"(?:\"[^\"]+\"\s*)?(?:<?)?({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})(?:>?|\s*<)",
    re.IGNORECASE,
)

NAME_LABEL = re.compile(
    rf"(?:^|\b)(?:Name|Full Name|Customer Name|Client Name|Contact Person|Attn|Attention|Kontaktperson|Namn)"
    rf"\s*:\s*({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,2}})",
    re.IGNORECASE,
)

ATTRIBUTION = re.compile(
    rf"(?:^|\b)(?:by|author|client|posted by|sent by|from|owner|written by|contact(?!\s+person))"
    rf"\s*:?[ \t]+({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,2}})",
    re.IGNORECASE,
)

EMAIL_WITH_DISPLAY = re.compile(
    rf"\b({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{1,2}})\s*<([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{{2,20}})>",
    re.IGNORECASE,
)

EMAIL_NAME = re.compile(
    r"\b([a-z][a-z0-9]{1,24})[._-]([a-z][a-z0-9]{1,24})(?:[._-]([a-z][a-z0-9]{1,24}))?@[a-z0-9.-]+\.[a-z]{2,20}\b",
    re.IGNORECASE,
)

# Single-token name only in explicit contexts.
SINGLE_CONTEXT_NAME = re.compile(
    rf"(?:^|\b)(?:Hi|Hello|Hey|Hej|Dear|Thanks|Regards|Cheers|Attn|Name|Client|Customer|Kontaktperson|Namn)"
    rf"\s*[:,]?\s+({NAME_TOKEN})\b",
    re.IGNORECASE,
)

# For safe word-boundary replacement.
WORD_EDGE_TEMPLATE = r"(?<![\w@.-]){body}(?![\w@.-])"

# ---------------------------------------------------------------------------
# False-positive dictionaries
# ---------------------------------------------------------------------------

ROLE_WORDS = {
    "Senior", "Junior", "Lead", "Principal", "Staff", "Head", "Chief", "Director",
    "Manager", "Engineer", "Developer", "Designer", "Architect", "Analyst", "Consultant",
    "Coordinator", "Specialist", "Assistant", "Administrator", "Operator", "Recruiter",
    "Founder", "Co-Founder", "Cofounder", "Owner", "Partner", "President", "Vice",
    "Officer", "Executive", "Supervisor", "Representative", "Strategist", "Researcher",
    "Intern", "Freelancer", "Contractor", "Advisor", "Adviser", "Producer", "Editor",
    "Writer", "Accountant", "Lawyer", "Attorney", "Doctor", "Professor", "Teacher",
    "Scientist", "Technician", "Plumber", "Electrician", "Mechanic", "Cashier",
    "Sales", "Marketing", "Finance", "Operations", "Product", "Project", "People",
    "Growth", "Support", "Success", "Customer", "Client", "Business", "Talent", "HR",
    "Devops", "Platform", "Frontend", "Backend", "Fullstack", "Full-Stack", "Qa",
    "Security", "Cloud", "Data", "Mobile", "Web", "Brand", "Content", "Legal",
}

ORG_WORDS = {
    "Inc", "Ltd", "LLC", "GmbH", "AB", "AS", "ASA", "Oy", "BV", "Corp", "Company",
    "Group", "Team", "Studio", "Agency", "Solutions", "Systems", "Services", "Labs",
    "Lab", "Consulting", "Partners", "Ventures", "Capital", "Media", "Software",
}

TECH_WORDS = {
    "React", "Redux", "Angular", "Vue", "Svelte", "Next", "Nuxt", "Remix", "Python",
    "Rust", "Java", "Ruby", "Swift", "Kotlin", "Scala", "Perl", "Node", "Deno", "Bun",
    "Express", "Django", "Flask", "Rails", "Spring", "Docker", "Kubernetes", "Terraform",
    "Ansible", "Jenkins", "Github", "GitLab", "Bitbucket", "Vercel", "Netlify", "Heroku",
    "Render", "Cloudflare", "Firebase", "Supabase", "Postgres", "Mongo", "Redis", "Kafka",
    "Rabbit", "Elastic", "Grafana", "Sentry", "Datadog", "Tailwind", "Bootstrap",
    "Material", "Chakra", "Figma", "Sketch", "Stripe", "Twilio", "Sendgrid", "Slack",
    "Discord", "Telegram", "Chrome", "Firefox", "Safari", "Webpack", "Vite", "Rollup",
    "Turbo", "Linux", "Ubuntu", "Debian", "Alpine", "Windows", "Apple", "Android",
    "Hetzner", "Digital", "Ocean", "Linode", "Vultr", "Oracle", "Azure", "OpenAI",
    "Anthropic", "Claude", "Gemini", "Llama", "Mistral", "Typescript", "Javascript",
    "Graphql", "Prisma", "Drizzle", "FastAPI", "Tauri",
}

COMMON_NON_NAMES = {
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December", "Today", "Tomorrow", "Yesterday",
    "Morning", "Evening", "Night", "Hello", "Dear", "Thanks", "Thank", "Please",
    "Sorry", "Welcome", "Best", "Regards", "Sincerely", "Cheers", "Kind", "Warm",
    "Subject", "From", "Sent", "Received", "Reply", "Forward", "Message", "Email",
    "Inbox", "Thread", "Conversation", "Chat", "Call", "Looking", "Need", "Want",
    "Would", "Could", "Should", "Will", "Create", "Build", "Make", "Find", "Check",
    "Test", "Review", "Update", "Change", "Add", "Remove", "Delete", "Move", "Copy",
    "Start", "Stop", "Run", "Open", "Close", "Send", "Save", "Great", "Good", "Nice",
    "Sure", "Right", "Also", "Just", "Here", "There", "This", "That", "These", "Those",
    "Some", "Each", "Every", "Many", "Much", "More", "Most", "Less", "Before", "After",
    "During", "While", "Since", "Until", "Full", "Stack", "Front", "Back", "End", "High",
    "Low", "Small", "Large", "Long", "Short", "Fast", "Slow", "Simple", "Complex", "Easy",
    "Hard", "Quick", "Clean", "Mobile", "Desktop", "Web", "Native", "Cross", "Platform",
    "United", "States", "New", "York", "San", "Francisco", "Los", "Angeles", "North",
    "South", "East", "West", "Central", "Remote", "Global", "London", "Berlin", "Paris",
    "Tokyo", "Sydney", "Toronto", "Dubai", "Asia", "Europe", "Africa", "America", "Pacific",
    "Atlantic", "Section", "Chapter", "Part", "Step", "Phase", "Stage", "Level", "Table",
    "List", "Item", "Note", "Warning", "Error", "Info", "Summary", "Overview",
    "Introduction", "Conclusion", "Appendix", "Version", "Draft", "Final", "Current",
    "Previous", "Latest", "However", "Therefore", "Furthermore", "Additionally", "Moreover",
    "Example", "Sample", "Template", "Default", "Custom", "General", "Important", "Required",
    "Optional", "Recommended", "Preferred", "Available", "Included", "Excluded", "Supported",
    "Compatible", "Yes", "Per", "Via", "Pro", "Top", "All", "Any", "Hi", "By", "Contact", "Person",
}

ALL_FALSE_POSITIVE_WORDS = ROLE_WORDS | ORG_WORDS | TECH_WORDS | COMMON_NON_NAMES
LOWER_FALSE_POSITIVE_WORDS = {w.lower() for w in ALL_FALSE_POSITIVE_WORDS}

# Small list of common suffixes / honorifics to strip.
NOISE_TOKENS = {
    "Mr", "Mrs", "Ms", "Miss", "Mx", "Dr", "Prof", "Professor", "Sir", "Madam",
    "Jr", "Sr", "II", "III", "IV",
}

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    line: int
    name: str
    method: str
    context: str
    occurrences: int = 0
    confidence: str = "LOW (0%)"
    linked_person_id: str | None = None


@dataclass
class Person:
    person_id: str
    full_name: str
    first_name: str
    last_name: str
    middle: list[str] = field(default_factory=list)
    aliases: set[str] = field(default_factory=set)
    emails: set[str] = field(default_factory=set)
    evidence_methods: Counter = field(default_factory=Counter)

    def all_aliases(self) -> set[str]:
        return {self.full_name, self.first_name, self.last_name, *self.aliases}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_token(token: str) -> str:
    token = token.strip(" \t,;:()[]{}<>\"'`“”‘’")
    if not token:
        return token
    return token[0].upper() + token[1:].lower()


def normalize_name(name: str) -> str:
    parts = [normalize_token(p) for p in re.split(r"\s+", name.strip()) if normalize_token(p)]
    parts = [p for p in parts if p not in NOISE_TOKENS]
    return " ".join(parts)


def tokenize_name(name: str) -> list[str]:
    return [p for p in normalize_name(name).split() if p]


def is_false_positive_word(word: str) -> bool:
    if not word:
        return True
    if word in ALL_FALSE_POSITIVE_WORDS or word.lower() in LOWER_FALSE_POSITIVE_WORDS:
        return True
    if len(word) <= 1:
        return True
    if word.isupper() and len(word) > 1:
        return True
    return False


def looks_like_role_phrase(parts: list[str]) -> bool:
    if not parts:
        return True

    lowered = [p.lower() for p in parts]
    role_hits = sum(1 for p in parts if p in ROLE_WORDS or p.lower() in {w.lower() for w in ROLE_WORDS})
    org_hits = sum(1 for p in parts if p in ORG_WORDS or p.lower() in {w.lower() for w in ORG_WORDS})
    tech_hits = sum(1 for p in parts if p in TECH_WORDS or p.lower() in {w.lower() for w in TECH_WORDS})

    # Very strong filter for title-like phrases.
    if role_hits >= 1 and len(parts) <= 3:
        return True
    if org_hits >= 1 and len(parts) <= 3:
        return True
    if tech_hits >= 1:
        return True

    # Reject sequences like "Senior Product Manager" or "Lead Engineer".
    if sum(1 for p in parts if p in ROLE_WORDS) >= 2:
        return True

    # Reject mostly false-positive phrases.
    if sum(1 for p in parts if is_false_positive_word(p)) >= max(1, len(parts) - 1):
        return True

    # Common title-pair patterns.
    joined = " ".join(lowered)
    blocked_phrases = {
        "product manager", "project manager", "lead engineer", "software engineer",
        "senior developer", "frontend developer", "backend developer", "full stack",
        "customer success", "account manager", "marketing manager", "sales manager",
        "chief executive", "chief technology", "vice president", "human resources",
    }
    if joined in blocked_phrases:
        return True

    return False


def is_plausible_person_name(parts: list[str], require_multi: bool = False) -> bool:
    if not parts:
        return False
    if require_multi and len(parts) < 2:
        return False
    if len(parts) > 3:
        return False
    if any(is_false_positive_word(p) for p in parts):
        return False
    if looks_like_role_phrase(parts):
        return False
    return True


def title_case_email_part(part: str) -> str:
    return part.replace("-", " ").replace("_", " ").title().replace(" ", "")


def confidence_score(method: str, occurrences: int, linked: bool = False) -> int:
    base = {
        "greeting": 90,
        "header": 90,
        "signature": 88,
        "label": 88,
        "email_display": 87,
        "email": 84,
        "attribution": 78,
        "context_single": 74,
        "pattern": 52,
    }.get(method, 50)
    score = min(99, base + min(occurrences * 4, 16) + (6 if linked else 0))
    return score


def confidence_label(score: int) -> str:
    if score >= 85:
        return f"HIGH ({score}%)"
    if score >= 65:
        return f"MEDIUM ({score}%)"
    return f"LOW ({score}%)"


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def _add_finding(
    findings: list[Finding],
    name_counts: Counter,
    line_no: int,
    raw_name: str,
    method: str,
    context: str,
) -> None:
    name = normalize_name(raw_name)
    parts = tokenize_name(name)
    require_multi = method in {"header", "email", "email_display", "pattern"}
    if not is_plausible_person_name(parts, require_multi=require_multi):
        return
    name_counts[name] += 1
    findings.append(Finding(line=line_no, name=name, method=method, context=context[:160]))


def scan_text(text: str) -> list[dict]:
    findings: list[Finding] = []
    name_counts: Counter = Counter()

    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        for m in GREETING_NAME.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "greeting", stripped)

        for m in HEADER_NAME.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "header", stripped)

        for m in NAME_LABEL.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "label", stripped)

        for m in ATTRIBUTION.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "attribution", stripped)

        for m in EMAIL_WITH_DISPLAY.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "email_display", stripped)

        for m in EMAIL_NAME.finditer(line):
            parts_raw = [p for p in m.groups() if p]
            parts = [title_case_email_part(p) for p in parts_raw]
            if len(parts) >= 2 and is_plausible_person_name(parts[:3], require_multi=True):
                _add_finding(findings, name_counts, i, " ".join(parts[:3]), "email", stripped)

        for m in SINGLE_CONTEXT_NAME.finditer(line):
            _add_finding(findings, name_counts, i, m.group(1), "context_single", stripped)

        for m in FULL_NAME_RE.finditer(line):
            parts = [p for p in m.groups() if p]
            if not is_plausible_person_name(parts, require_multi=True):
                continue

            # More protection: do not trust generic capitalized pairs if immediately followed by role punctuation.
            window_end = min(len(line), m.end() + 25)
            trailing = line[m.end():window_end].lstrip(" ,:-")
            trailing_first = trailing.split(None, 1)[0] if trailing else ""
            if trailing_first and trailing_first in ROLE_WORDS:
                continue

            _add_finding(findings, name_counts, i, " ".join(parts), "pattern", stripped)

    for m in SIGNOFF_NAME.finditer(text):
        context = text[max(0, m.start() - 40): min(len(text), m.end() + 80)].replace("\n", " ")
        line_no = text[:m.start()].count("\n") + 1
        _add_finding(findings, name_counts, line_no, m.group(1), "signature", context.strip())

    linked_people = link_people(findings, text)

    # Enrich findings.
    person_by_alias = {}
    for person in linked_people.values():
        for alias in person.all_aliases():
            person_by_alias[alias] = person.person_id

    serialized = []
    for f in findings:
        linked_id = person_by_alias.get(f.name)
        score = confidence_score(f.method, name_counts[f.name], linked=linked_id is not None)
        f.occurrences = name_counts[f.name]
        f.confidence = confidence_label(score)
        f.linked_person_id = linked_id
        serialized.append({
            "line": f.line,
            "name": f.name,
            "method": f.method,
            "context": f.context,
            "occurrences": f.occurrences,
            "confidence": f.confidence,
            "linked_person_id": f.linked_person_id,
        })

    return serialized


def scan_file(path: Path) -> list[dict]:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as exc:
        print(f"  [skip] {path}: {exc}")
        return []
    return scan_text(text)


# ---------------------------------------------------------------------------
# Person linking + deduplication
# ---------------------------------------------------------------------------

def link_people(findings: list[Finding] | list[dict], text: str = "") -> dict[str, Person]:
    normalized_findings: list[Finding] = []
    for f in findings:
        if isinstance(f, Finding):
            normalized_findings.append(f)
        else:
            normalized_findings.append(Finding(**f))

    candidate_full_names = Counter()
    for f in normalized_findings:
        parts = tokenize_name(f.name)
        if len(parts) >= 2:
            candidate_full_names[f.name] += 1

    people: dict[str, Person] = {}
    person_index_by_full: dict[str, str] = {}
    person_index_by_part: defaultdict[str, set[str]] = defaultdict(set)

    seq = 1
    for full_name, _count in candidate_full_names.most_common():
        parts = tokenize_name(full_name)
        first, last = parts[0], parts[-1]
        middle = parts[1:-1]
        pid = f"person-{seq:03d}"
        person = Person(
            person_id=pid,
            full_name=full_name,
            first_name=first,
            last_name=last,
            middle=middle,
        )
        person.aliases.update({full_name, first, last})
        people[pid] = person
        person_index_by_full[full_name] = pid
        person_index_by_part[first].add(pid)
        person_index_by_part[last].add(pid)
        seq += 1

    # Link evidence methods.
    for f in normalized_findings:
        if f.name in person_index_by_full:
            people[person_index_by_full[f.name]].evidence_methods[f.method] += 1

    # Add email-derived aliases from the original text.
    for m in EMAIL_NAME.finditer(text):
        raw_parts = [p for p in m.groups() if p]
        parts = [title_case_email_part(p) for p in raw_parts][:3]
        if len(parts) < 2 or not is_plausible_person_name(parts, require_multi=True):
            continue
        full_name = " ".join(parts)
        pid = person_index_by_full.get(full_name)
        if not pid:
            continue
        people[pid].emails.add(m.group(0))
        people[pid].aliases.update({parts[0], parts[-1], full_name})

    return people


def deduplicate_names(findings: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}

    def score_key(item: dict) -> tuple[int, int]:
        conf = int(re.search(r"(\d+)", item["confidence"]).group(1))
        return conf, item.get("occurrences", 0)

    for f in findings:
        key = f["name"]
        if key not in seen or score_key(f) > score_key(seen[key]):
            seen[key] = f
    return sorted(seen.values(), key=score_key, reverse=True)


# ---------------------------------------------------------------------------
# Redaction map
# ---------------------------------------------------------------------------

def build_redaction_map(findings: list[dict], text: str, threshold: str = "MEDIUM") -> dict[str, str]:
    threshold_min = {"LOW": 0, "MEDIUM": 65, "HIGH": 85}.get(threshold, 65)

    people = link_people(findings, text)
    if not people:
        return {}

    def conf_value(item: dict) -> int:
        match = re.search(r"(\d+)", item["confidence"])
        return int(match.group(1)) if match else 0

    best_conf_by_name = {item["name"]: conf_value(item) for item in deduplicate_names(findings)}

    redaction_map: dict[str, str] = {}
    serial = 1
    for pid, person in people.items():
        full_conf = best_conf_by_name.get(person.full_name, 0)
        evidence_bonus = min(sum(person.evidence_methods.values()) * 2, 8)
        effective_conf = full_conf + evidence_bonus
        if effective_conf < threshold_min:
            continue

        client_tag = f"client-{serial:03d}"
        redaction_map[person.full_name] = client_tag

        # Only add standalone first/last names for linked real people.
        redaction_map.setdefault(person.first_name, client_tag)
        redaction_map.setdefault(person.last_name, f"[redacted-surname-{serial:03d}]")

        for email in person.emails:
            redaction_map[email] = f"{client_tag}@[redacted]"

        # Common email-local variants.
        first_last = f"{person.first_name.lower()}.{person.last_name.lower()}"
        first_last_us = f"{person.first_name.lower()}_{person.last_name.lower()}"
        first_last_dash = f"{person.first_name.lower()}-{person.last_name.lower()}"
        redaction_map[first_last] = client_tag
        redaction_map[first_last_us] = client_tag
        redaction_map[first_last_dash] = client_tag

        serial += 1

    return redaction_map


# ---------------------------------------------------------------------------
# Redaction
# ---------------------------------------------------------------------------

def compile_safe_pattern(term: str) -> re.Pattern[str]:
    escaped = re.escape(term)
    body = WORD_EDGE_TEMPLATE.format(body=escaped)
    return re.compile(body, re.IGNORECASE)


def redact_text(text: str, redaction_map: dict[str, str]) -> str:
    result = text

    # Redact email addresses first.
    email_keys = [k for k in redaction_map if "@" in k]
    for key in sorted(email_keys, key=len, reverse=True):
        result = re.sub(re.escape(key), redaction_map[key], result, flags=re.IGNORECASE)

    # Redact full names before single tokens.
    other_keys = [k for k in redaction_map if "@" not in k]
    for key in sorted(other_keys, key=lambda s: (s.count(" "), len(s)), reverse=True):
        replacement = redaction_map[key]
        if re.fullmatch(r"[a-z0-9._-]+", key, re.IGNORECASE):
            # Email local-part helper key.
            result = re.sub(
                rf"\b{re.escape(key)}(?=@[a-z0-9.-]+\.[a-z]{{2,20}})",
                replacement,
                result,
                flags=re.IGNORECASE,
            )
            continue

        pattern = compile_safe_pattern(key)
        result = pattern.sub(replacement, result)

    return result


def redact_file(path: Path, redaction_map: dict[str, str], output_dir: Path) -> Path:
    text = path.read_text(encoding="utf-8", errors="ignore")
    redacted = redact_text(text, redaction_map)
    out_path = output_dir / f"{path.stem}.redacted{path.suffix}"
    out_path.write_text(redacted, encoding="utf-8")
    return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def gather_target_files(targets: Iterable[str]) -> list[Path]:
    out: list[Path] = []
    for target in targets:
        p = Path(target)
        if p.is_file():
            out.append(p)
        elif p.exists():
            out.extend(sorted(p.rglob("*.md")))
            out.extend(sorted(p.rglob("*.txt")))
    # Keep order stable and unique.
    seen = set()
    unique = []
    for path in out:
        if path not in seen:
            unique.append(path)
            seen.add(path)
    return unique


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan files for personal names and optionally produce redacted copies."
    )
    parser.add_argument("targets", nargs="*", default=["."], help="Files or directories to scan")
    parser.add_argument("--redact", action="store_true", help="Generate redacted copies of scanned files")
    parser.add_argument(
        "--threshold",
        choices=["LOW", "MEDIUM", "HIGH"],
        default="MEDIUM",
        help="Minimum confidence to redact (default: MEDIUM)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory for redacted files (default: same as source)",
    )
    parser.add_argument("--map-file", type=str, default=None, help="Save the name→pseudonym mapping as JSON")
    args = parser.parse_args()

    files = gather_target_files(args.targets)
    if not files:
        print("No files found to scan.")
        return

    all_findings: dict[str, list[dict]] = {}
    text_by_file: dict[str, str] = {}

    for file_path in files:
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as exc:
            print(f"  [skip] {file_path}: {exc}")
            continue
        findings = scan_text(text)
        if findings:
            all_findings[str(file_path)] = findings
            text_by_file[str(file_path)] = text

    if not all_findings:
        print("No potential names found.")
        return

    total = 0
    combined_findings: list[dict] = []

    for filepath, findings in all_findings.items():
        print(f"\n--- {filepath} ---")
        for item in findings:
            marker = "*" if "HIGH" in item["confidence"] else " "
            print(
                f" {marker} Line {item['line']:>4} [{item['method']:<13}] "
                f"{item['confidence']:<12} {item['name']:<30} | {item['context'][:120]}"
            )
            total += 1
            combined_findings.append(item)

    unique = deduplicate_names(combined_findings)

    print(f"\n{'=' * 78}")
    print(f"Total detections: {total}")
    print(f"Unique candidate names: {len(unique)}")
    print("\nUnique names ranked by confidence:")
    for item in unique:
        print(f"  {item['confidence']:<12} {item['name']:<30} (via {item['method']})")

    merged_text = "\n".join(text_by_file.values())
    redaction_map = build_redaction_map(combined_findings, merged_text, threshold=args.threshold)

    if redaction_map:
        print(f"\n{'=' * 78}")
        print(f"Redaction map ({args.threshold}+ confidence):")
        for real_name, pseudo in sorted(redaction_map.items(), key=lambda x: (str(x[1]), -len(x[0]), x[0])):
            print(f"  {real_name:<35} → {pseudo}")

    if args.map_file:
        map_path = Path(args.map_file)
        map_path.write_text(json.dumps(redaction_map, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nMapping saved to: {map_path}")

    if not args.redact:
        if redaction_map:
            joined_targets = " ".join(args.targets)
            print("\nRun with --redact to generate redacted copies:")
            print(f"  python3 check_names_upgraded.py {joined_targets} --redact")
        return

    if not redaction_map:
        print("\nNo names to redact at this threshold.")
        return

    output_dir = Path(args.output_dir) if args.output_dir else None
    print("\nGenerating redacted files...")
    redacted_count = 0
    for file_path in files:
        file_key = str(file_path)
        if file_key not in all_findings:
            continue
        out_dir = output_dir or file_path.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = redact_file(file_path, redaction_map, out_dir)
        print(f"  {file_path} → {out_path}")
        redacted_count += 1

    print(f"\nDone. {redacted_count} file(s) redacted.")
    print("Review the .redacted files before using them in your pipeline.")


if __name__ == "__main__":
    main()
