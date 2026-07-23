---
name: gitea-branch-scope
description: Manage the local and remote lifecycle of an already scoped change, including safe feature-branch creation, explicit commits, non-force push, and Gitea pull-request creation or update. Use after implementation or when another Skill needs local feature branches; never use it to edit product code.
---

# Gitea Branch Scope

Manage Git branches and pull requests without implementing or redesigning the change. Use only the pull-request and repository-label capabilities exposed by Gitea MCP initialization.

## Prepare branches

1. Inspect repository guidance, status, current branch, remotes, and worktrees.
2. Resolve the remote default branch dynamically and fetch its current commit. Stop and ask when the default cannot be proved.
3. Create a requested local branch ref from that commit without switching when the caller requests ref creation only. A dirty worktree does not block this operation; report it.
4. For an existing branch, verify its base and divergence. Never overwrite, reset, rename, or silently reuse a semantically conflicting branch.
5. Before switching branches, stop if uncommitted work could be carried across or overwritten. Never stash or discard user work.

## Commit an existing change

1. Inspect the complete diff and accept only caller-authorized changed paths.
2. Run only verification commands supplied by the caller or required by repository policy. Report failed and unrun checks distinctly; do not fix them.
3. Stage explicit paths and create the smallest coherent commit set. Do not amend published commits.
4. Verify the scoped status, commits, and local head.

Do not edit product code, tests, planning artifacts, or unrelated files.

## Authorize remote publication

Before any push or pull-request create/update, ask only whether the user permits automatic push and PR creation or update. Treat an explicit instruction to “Automate PR options” as authorization for the already scoped branches in the current task, including required pushes. Do not reuse authorization across tasks or unscoped branches.

If authorization is absent, stop after local branch and commit work. Authorization never includes merge, force-push, branch deletion, history rewriting, credential changes, or direct issue closure.

## Push and deliver the PR

1. Push with a normal upstream-setting push and verify that the remote head equals local `HEAD`.
2. Read the actual diff, commits, and verification evidence. Render [assets/pr-body-template.md](assets/pr-body-template.md) with exactly four visible sections: Purpose, Reason, What changed, and Impact. Do not list filenames, symbols, code, commands, test logs, workflow metadata, or implementation inventories.
3. Invoke `$gitea-issue-scope` to verify a linked issue when needed. When one PR fully resolves an open same-repository issue, append one standalone `Closes #<number>` line. Omit it for partial work, trackers, unrelated repositories, or unlinked changes.
4. Read existing repository labels and independently select only clear semantic matches for the actual PR. Add existing labels only; preserve current PR labels. If no label clearly matches, add none. Never create a repository label.
5. Find an existing open PR for the head branch. Create one when absent or update the matching PR when present, using the remote default branch as base.
6. Re-read and verify the PR title, body, labels, head, base, status, and remote SHA. Correct one mismatch once, then report any persistent discrepancy.
