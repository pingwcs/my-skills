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
