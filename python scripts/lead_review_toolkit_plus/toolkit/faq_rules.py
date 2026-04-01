from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class FAQRules:
    def answer(self, question: str, privacy_sensitive_mode: bool = False) -> str | None:
        q = question.lower()
        if "what is this" in q or "what is the platform" in q:
            return (
                "This is a private review tool built to assess projects, websites, repositories, and job posts "
                "so clients can get faster, clearer feedback before deciding on the next step."
            )
        if "free" in q or "cost" in q:
            return (
                "The review can be offered for free as an initial filter. If implementation or a deeper planning step is needed, "
                "that can move into a paid milestone or consultation."
            )
        if "privacy" in q or "sensitive" in q:
            if privacy_sensitive_mode:
                return (
                    "Privacy-sensitive mode is enabled. Submitted material is handled with reduced retention, tighter logging, "
                    "and a more restricted review flow."
                )
            return (
                "Submitted project details are used only for the review process. If a project is privacy-sensitive, "
                "a more restricted review mode can be used."
            )
        if "quote" in q or "estimate" in q or "price" in q:
            return (
                "The platform can generate structured estimate ranges based on scope, complexity, and requirements. "
                "Final pricing can still change if scope changes."
            )
        if "build" in q or "fix" in q:
            return "Yes. If the review shows a good fit, the same system can lead into a milestone-based implementation path."
        return None
