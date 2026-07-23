---
name: enforce-change-scope
description: Enforce bounded change delivery by measuring branch diffs, committing each independently verifiable feature or module slice, targeting 200–500 changed lines per PR, and requiring explicit user authorization before a branch exceeds 3000 handwritten-code changed lines. Use while planning, implementing, committing, or preparing PRs for code changes and refactors.
---

# Enforce Change Scope

Keep branches, commits, and PRs small enough to review and reverse safely.

## Measure scope

1. Identify the target branch before implementation.
2. Measure the current branch diff against that target, including uncommitted and untracked work.
3. Count handwritten-code additions plus deletions.
4. Include tests. Exclude generated files, lockfiles, vendored code, snapshots, and binary assets.
5. Recalculate before every commit and before PR delivery.

## Deliver in slices

1. Plan independently verifiable, reversible feature or module slices.
2. Complete one slice with its tests.
3. Review the diff and run relevant verification.
4. Commit the slice immediately as one local commit.
5. Repeat without accumulating multiple completed slices.

Keep implementation and its tests in the same commit. Do not create broken or unverifiable commits merely to reduce line counts.

Stage only files or hunks belonging to the current slice. Never include unrelated user changes. If changes cannot be isolated safely, pause and ask the user.

Create local commits automatically after verification. Never push automatically.

## Enforce thresholds

- Target 200–500 changed lines per PR.
- Allow a smaller PR when it is complete and atomic.
- For a PR above 500 lines, explain why further safe decomposition is impractical.
- Treat 3000 changed lines per branch as a hard limit unless the user explicitly authorizes an exception.
- Prefer separate or stacked PRs when a larger delivery can be split safely.

Before work would exceed 3000 lines, stop and request authorization. Provide:

- estimated total changed lines;
- the coupling that prevents safe branch decomposition;
- decomposition options already considered;
- risks of approving the larger branch.

Authorization waives only the branch line limit. Continue to create verified slice commits and split PRs wherever safe. Do not infer authorization from urgency or prior approval for another branch.
