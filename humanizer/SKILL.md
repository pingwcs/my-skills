---
name: humanizer
description: Rewrite or review prose that sounds generic, formulaic, over-polished, or recognizably AI-generated while preserving meaning, factual claims, formatting requirements, and the author's intended voice. Use for requests to humanize text, make writing sound natural, remove chatbot phrasing, reduce AI-writing signals, match a supplied voice sample, or review articles, documentation, emails, essays, and social copy for synthetic-sounding patterns. Apply the full pattern catalog to English; use only language-independent principles for other languages unless the user supplies language-specific guidance.
---

# Humanizer

Rewrite prose so it sounds authored rather than processed. Improve specificity, rhythm, and directness without inventing personality, facts, or imperfections.

## Load the pattern catalog

Read [references/patterns.md](references/patterns.md) before rewriting English prose or performing an AI-pattern review. For non-English prose, read its universal checks and genre guidance, then ignore English-specific word and punctuation heuristics unless they fit the target language.

## Choose the mode

- Use **rewrite mode** by default. Return a finished rewrite.
- Use **review mode** when the user asks for diagnosis, scoring, or feedback without requesting edits. Report likely patterns without claiming to determine authorship.
- Use **voice-match mode** when the user supplies an authentic writing sample. Treat its vocabulary, sentence rhythm, paragraph openings, punctuation, and level of formality as stronger evidence than generic style advice.

## Rewrite workflow

1. Extract the non-negotiables: claims, examples, names, citations, quotations, links, required structure, length, audience, and tone.
2. Diagnose the text privately. Look for clusters of patterns, not isolated words or punctuation marks.
3. Produce an internal first rewrite. Replace vague or inflated language with direct phrasing and preserve every substantive point.
4. Perform an internal second-pass review:
   - Compare the rewrite against the source for lost meaning or changed certainty.
   - Check facts, numbers, names, citations, and quotations character by character when practical.
   - Remove remaining formulaic phrasing and any new awkwardness introduced by the rewrite.
   - Read for rhythm, register, and consistency with the supplied voice sample.
   - Confirm that the result does not manufacture anecdotes, opinions, slang, errors, or personal experience.
5. Deliver only the final rewrite and a short change summary. Keep the first rewrite and second-pass review internal unless the user explicitly asks to see them.

Do not stop for clarification when the text and intended register are apparent. If no voice sample is available, preserve the source's level of formality and choose plain, natural phrasing.

## Preserve integrity

- Preserve meaning before style. Do not strengthen, weaken, or resolve claims merely to make them sound smoother.
- Never add facts, citations, quotes, lived experience, or concrete details that the source does not support.
- Preserve technical terms, legal qualifiers, academic caution, code, URLs, and proper nouns unless the user asks to change them.
- Preserve meaningful Markdown and document structure. Merge headings or lists only when they are empty scaffolding rather than required organization.
- Keep quotations faithful. Do not humanize quoted material unless the user explicitly includes it in scope.
- Do not make prose deliberately messy. Typos, random slang, fake uncertainty, and forced quirks do not create an authentic voice.
- Treat AI-pattern detection as editorial judgment, not proof of who wrote the text.

## Calibrate by genre

- For technical, legal, academic, medical, and reference writing, prefer precision and restraint. Do not inject first person, humor, or emotional reactions.
- For personal, editorial, and conversational writing, preserve genuine opinions, tension, asides, and uneven rhythm when the source supports them.
- For marketing copy, keep the intended persuasion while replacing unsupported superlatives and generic enthusiasm with concrete benefits or evidence.
- For workplace communication, remove ceremony and assistant chatter while keeping the sender's authority and relationship to the reader.

## Output contract

In rewrite mode, output:

1. The final rewritten text, preserving the input's language unless requested otherwise.
2. A concise change summary in the user's language, normally one to three bullets.

If the user asks for "text only," omit the summary. If the user requests alternatives, provide clearly differentiated versions without exposing internal drafts. In review mode, provide concise findings with specific excerpts and suggested fixes; do not rewrite the whole text unless asked.
