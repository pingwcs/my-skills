# Local skill collection

This repository stores reusable Codex skills as project-owned packages.

## Language

**Project-local skill**:
A self-contained skill folder placed directly under this repository root and versioned with the project. It is not a global skill installation.
_Avoid_: Installed skill, global skill, `.skill` file

**English-depth humanization**:
Apply the complete detection catalog to English text. For other languages, apply only language-independent editing principles unless the user supplies language-specific guidance.
_Avoid_: Language-agnostic humanization, universal pattern matching

**Internal second-pass review**:
A self-check performed after the first rewrite to catch remaining AI patterns and damage introduced during editing. Keep the draft and review internal; deliver only the final rewrite and a short change summary.
_Avoid_: Independent audit, visible audit trail, four-part rewrite

**Context-wide technical style**:
A communication style applied to every technical passage created or edited in the current conversation, including documents, code comments, plans, reviews, status updates, and technical chat responses. It does not persist into a new conversation.
_Avoid_: Document-only style, permanent global preference, cross-session style

**Target communication language**:
The language selected for the surrounding prose in technical communication. Canonical English technical terms and exact code tokens remain in English.
_Avoid_: Translation language, programming language

**Canonical English technical term**:
The established English name for one technical concept, taken from the relevant standard, platform, library, protocol, domain glossary, or common engineering usage. Use the same term consistently after introducing it.
_Avoid_: Literal English translation, stylistic synonym
