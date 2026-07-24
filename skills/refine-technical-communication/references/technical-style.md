# Technical communication rules

Use these rules for all technical content governed by the skill.

## Terminology

- Map one concept to one canonical English term and use it consistently.
- Prefer terms established by the relevant platform, standard, library, protocol, or domain.
- Preserve exact code tokens and case, including identifiers, CLI flags, HTTP methods, status codes, configuration keys, and file paths.
- Do not rotate synonyms for variety. If `request`, `job`, and `task` are different domain concepts, keep them distinct.
- Do not convert ordinary words into jargon when the technical term adds no precision.
- Define an acronym on first use unless it is already established for the audience or in the surrounding context.
- Follow a user-supplied glossary even when another term is more common; surface contradictions instead of silently replacing defined language.

For non-English prose, keep canonical technical terms in English. When a term may be unfamiliar, introduce it with a short local-language explanation:

> The operation must be idempotent. Subsequent retries use the same `idempotency key`.

Avoid repeating both languages after the term has been established.

## Technical accuracy

- Preserve the original claim and its degree of certainty.
- Separate observed behavior, documented behavior, assumptions, proposals, and recommendations.
- Name the evidence for a correction when practical.
- Preserve normative force. Do not interchange `MUST`, `SHOULD`, `MAY`, required, recommended, and optional.
- Keep quantities with their units, scope, aggregation, percentile, time window, and measurement conditions.
- State version, environment, or platform constraints when the source provides them.
- Do not infer causality from correlation or turn an example into a guarantee.
- Do not add unsupported performance, compatibility, availability, privacy, or security claims.
- Mark unresolved conflicts or missing evidence as needing verification.

## Clarity for software engineers

- Name the acting component instead of using vague subjects such as "it", "the system", or "this process" when multiple referents exist.
- Prefer explicit operations over abstract noun chains.
- State prerequisites before procedures.
- Present multi-step procedures in execution order.
- Identify inputs, outputs, state changes, side effects, and failure behavior when relevant.
- Make references local and explicit. Replace "as above", "normally", "properly", and "when needed" with the actual condition when known.
- Distinguish compile time from runtime, client from server, synchronous from asynchronous, and configuration from runtime state when the distinction matters.
- Use active voice when responsibility matters. Use passive voice when the actor is unknown or irrelevant.
- Split sentences that contain multiple independent conditions or effects.
- Use lists and tables only when readers need to compare or scan parallel information.

## Style

- Prefer direct, neutral language over ceremony, promotion, or conversational filler.
- Remove generic claims such as "robust", "seamless", "powerful", and "best practice" unless evidence or a concrete property follows.
- Replace vague claims with supported mechanisms, constraints, or outcomes.
- Keep headings descriptive and avoid repeating the heading in the first sentence.
- Preserve the established document template and Markdown semantics.
- Keep chat explanations concise, but include enough context for an engineer to act without guessing.

## Private second-pass checklist

- Does every source claim remain present with the same certainty?
- Are all code tokens, names, numbers, units, links, citations, and quotations intact?
- Does each concept use one canonical term?
- Are actors, conditions, state changes, and failure cases explicit where the source supports them?
- Did the edit introduce any unsupported fact or guarantee?
- Can a software engineer interpret each instruction in only one reasonable way?
- Does the result follow the selected language while retaining canonical English technical terms?
