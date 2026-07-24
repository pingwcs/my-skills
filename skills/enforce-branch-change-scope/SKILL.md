---
name: enforce-branch-change-scope
description: Enforce bounded production-code scope when planning or creating branches by measuring each branch diff, splitting independent feature or module slices into separate or stacked branches, targeting 200–500 changed lines per PR, excluding all test code and test files from commits and branch delivery, and requiring explicit user authorization before a branch exceeds 3000 handwritten-code changed lines. Use while planning branch boundaries, creating branches, implementing changes, committing, or preparing PRs for code changes and refactors.
---

# Enforce Branch Change Scope

Keep each branch limited to a reviewable, reversible production-code change.

## Define the branch boundary

1. Identify the target branch before implementation.
2. Plan independently verifiable, reversible feature or module slices.
3. Keep only coupled slices on the same branch.
4. Use separate or stacked branches when slices can be reviewed and delivered independently.
5. Estimate the handwritten production-code additions plus deletions assigned to the branch.

The boundary is complete when every planned change belongs to one branch and no branch combines independently deliverable slices.

## Measure scope

1. Measure the current branch diff against its target, including committed, uncommitted, staged, and untracked work.
2. Count handwritten production-code additions plus deletions.
3. Exclude generated files, lockfiles, vendored code, and binary assets from the line count.
4. Detect prohibited test content separately; exclusion from the line count does not permit delivery.
5. Recalculate before every commit and before PR delivery.

## Deliver in slices

1. Complete one production-code slice.
2. Run relevant verification, including existing tests when available.
3. Review the diff and pass the test-free delivery gate.
4. Commit the slice immediately as one local commit.
5. Repeat without accumulating multiple completed slices.

Temporary test changes may be used for local verification. Keep them unstaged and remove only agent-created temporary test changes before committing. Do not create broken or unverifiable commits merely to reduce line counts.

Stage only production files or hunks belonging to the current slice. Preserve unrelated user changes. If changes cannot be isolated safely, pause and ask the user.

Create local commits automatically after verification. Never push automatically.

## Enforce test-free delivery

Treat content as test content by purpose, not only by path or filename. Prohibited content includes:

- unit, integration, end-to-end, and performance test code;
- files or directories dedicated to tests or specs;
- test-only fixtures, mocks, stubs, snapshots, and test data;
- production hooks, switches, or exports that exist only to support tests.

Production-code changes that improve testability remain production code when they serve a production responsibility and add no test-only interface.

Before every commit, inspect the staged diff. Before PR delivery, inspect the complete diff against the target branch, including committed, uncommitted, staged, and untracked work. The gate passes only when neither diff contains prohibited test content.

If prohibited content is present, do not commit or deliver the branch. Safely remove agent-created temporary test changes or move them outside the branch. Preserve user-owned test changes; if they cannot be isolated safely, pause and ask the user.

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
