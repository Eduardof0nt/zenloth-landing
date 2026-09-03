# Zenloth Landing — Agent Guide

Review this file before starting any task. Keep it updated when repository or delivery rules change.

## Branch Source Of Truth

- `dev` is the canonical source-of-truth branch and must contain every change present in `staging` and `main`.
- **CRITICAL RELEASE-ANCESTRY RULE — the required commit graph after every promotion is `dev` → `staging` → `main`. `origin/dev` must be an ancestor of `origin/staging`, and `origin/staging` must be an ancestor of `origin/main`. Before merging to staging, the promotion branch must descend from the current `origin/dev`; before merging to production, create a production release branch from the verified current `origin/staging`. Verify both relationships with `git merge-base --is-ancestor` after each merge. If either relationship fails, STOP and report the divergence. Never force-push, use an `ours` merge, or merge a whole branch merely to manufacture ancestry.**
- Changes must land in `dev` first, then be promoted to `staging`, and finally to `main`, using a dedicated feature/fix branch and PR. This ordering does not authorize direct environment-branch merges.
- Before promotion or reconciliation, fetch all environment branches and verify both commit ancestry and patch equivalence. If `staging` or `main` contains a change missing from `dev`, stop and report the exact commits, affected files, and conflict risk before reconciling it into `dev`.
- Do not merge `main` or `staging` into `dev`, or create a missing environment branch, without explicit user approval.
- Report any missing `dev`, `staging`, or `main` branch as a repository-topology gap.
