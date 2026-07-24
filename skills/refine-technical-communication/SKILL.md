---
name: refine-technical-communication
description: Refine technical communication for terminology consistency, factual precision, and unambiguous understanding by software engineers. Use when a user wants technical content rewritten or reviewed, asks for clearer or more professional engineering language, supplies a glossary or style guide, or wants every technical document and technical chat response in the current conversation to follow one consistent style. Covers design documents, README files, ADRs, API documentation, runbooks, plans, reviews, code comments, implementation notes, and technical explanations in chat.
---

# Refine Technical Communication

Apply a precise, terminology-consistent engineering style without changing supported meaning or inventing technical facts.

## Establish the communication language

1. Use the target language when the user has already specified it.
2. Otherwise, ask which language to use before producing or editing technical content. Ask one concise question and wait for the answer.
3. Reuse the selected language throughout the current conversation. Ask again only when the user changes it or the prior choice is unavailable.
4. Keep code identifiers, API names, protocol names, product names, commands, paths, configuration keys, and canonical technical terms in English.
5. In non-English prose, introduce an unfamiliar term as a brief local-language explanation followed by the canonical English term in parentheses when that improves comprehension. Use the English term consistently afterward.

## Use Context mode by default

After activation, apply this skill to every technical passage created or edited in the current conversation, including:

- technical documents and code comments;
- plans, status updates, reviews, and implementation notes;
- technical explanations and recommendations in chat.

Keep non-technical conversation natural. Do not force engineering terminology into greetings, confirmations, or ordinary discussion.

Continue Context mode until the conversation ends or the user explicitly disables it, changes the language, or requests another style. Do not claim that the preference persists into a new conversation.

Within Context mode, use rewrite behavior by default for supplied content. Switch to review behavior only when the user asks for assessment, diagnosis, or suggestions without a full rewrite.

## Load the technical style rules

Read [references/technical-style.md](references/technical-style.md) before producing, rewriting, or reviewing technical content. Treat a user-supplied glossary, style guide, API schema, ADR, specification, or reference document as higher-priority evidence.

## Rewrite technical content

1. Extract the non-negotiables: factual claims, certainty, prerequisites, names, code, links, citations, quotations, structure, audience, and normative requirements.
2. Normalize each concept to one canonical term. Prefer the established English industry term over a literal or invented translation.
3. Replace vague actors and actions with explicit components, operations, inputs, outputs, state transitions, constraints, and failure behavior when the source supports them.
4. Correct a technical error only when reliable context or an authoritative source supports the correction. State the correction briefly in the change summary.
5. When a claim cannot be verified, preserve its intended certainty and identify the ambiguity, conflict, or verification need. Never fabricate architecture behavior, compatibility, performance, or security guarantees.
6. Preserve meaningful Markdown, document templates, code blocks, tables, links, citations, and quotations. Restructure locally only when it materially improves comprehension.
7. Perform a private second pass against the checklist in the reference. Do not expose drafts or internal analysis.

## Review technical content

Report concrete findings without rewriting the entire text unless asked. Quote only the smallest relevant excerpt and explain:

- what is ambiguous, inconsistent, unsupported, or technically misleading;
- why a software engineer could misinterpret it;
- the smallest precise correction.

Distinguish verified errors from questions that require more evidence.

## Return the result

For a direct rewrite request, return:

1. the final rewritten content;
2. a concise change summary in the user's language, normally one to three bullets.

Omit the summary when the user asks for text only. For ordinary technical chat replies governed by Context mode, answer directly without adding a change summary. For review requests, return concise findings and suggested corrections.
