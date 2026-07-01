# Working the project with agents

Two scripts let people put spare AI subscription tokens to work — one to *do*
the work, one to *review* it. Both are thin, deterministic wrappers around your
own `codex` or `claude` CLI: **the scripts own every status change and the merge
gate; the agent only does the actual work.** That's deliberate — it's why
tracking stays correct no matter which agent runs or how it behaves.

## The status lifecycle

```
status: available  ──claim──▶  status: claimed  ──PR opened──▶  status: in-review  ──review passes + merge──▶  status: done
        ▲                                                              │
        └───────────────── agent opened no PR (released) ◀────────────┘
```

`start_work.sh` moves `available → claimed → in-review`. `review_work.sh` (plus
branch protection) governs `in-review → merged/done`. No agent is trusted to set
these itself.

## `start_work.sh` — do the work

Claims the next available issue, runs your agent on it following the project
method, and moves it to **in review** once the agent opens a PR.

```bash
./start_work.sh                 # work the queue until it's empty
AGENT=claude ./start_work.sh    # use `claude -p` instead of the default `codex`
STAGE=research ./start_work.sh  # only pick up research-stage issues
MAX=1 ./start_work.sh           # one issue, then stop
DRY_RUN=1 ./start_work.sh       # show what it would do, change nothing
```

It claims (assigns you + `status: claimed`), resets to a clean `main`, hands the
issue to the agent with the method baked into the prompt, then finds the PR the
agent opened (via GitHub's closing-issue link) and flips the issue to
`status: in-review`. If the agent opened no PR, the issue is released back to
`available`.

## `review_work.sh` — review before merge

**Every PR must pass an adversarial review, and the review may NOT be done by the
PR's author.** This script runs an agent whose job is to *refute* the work
against the method, then posts the review and sets the required
`for-good/adversarial-review` status check.

```bash
REVIEW_GITHUB_TOKEN=<bot-pat> ./review_work.sh              # review all open PRs
REVIEW_GITHUB_TOKEN=<bot-pat> AGENT=claude ./review_work.sh
REVIEW_GITHUB_TOKEN=<bot-pat> AUTO_MERGE=1 ./review_work.sh # merge on PASS
PR=7 ./review_work.sh                                       # one PR
```

### The different-identity rule (important)

You cannot adversarially review your own work. The script **refuses** to review a
PR whose author is the reviewer identity, and branch protection **requires a
non-author approval** (GitHub blocks approving your own PR). So the reviewer has
to be a *distinct GitHub identity*. Pick one:

- **A bot / second GitHub account** with write access to the repo. Put its token
  in `REVIEW_GITHUB_TOKEN`; the script posts the review and approval as that
  account. This is the simplest local setup.
- **A GitHub App** installation token (App reviews count as a distinct actor).
- **CI** (`.github/workflows/review.yml`): a workflow reviews as
  `github-actions[bot]`, which is inherently not the author. Opt-in; needs a
  model-auth secret (`CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`).

If you run `review_work.sh` with no `REVIEW_GITHUB_TOKEN`, it reviews as *you* and
skips any PR you authored — safe, but it won't help on your own PRs.

## The merge gate (branch protection on `main`)

`main` is protected so nothing merges without a clean, independent review:

- ✅ a passing `for-good/adversarial-review` status check (an agent actually reviewed), and
- ✅ at least one approving review **from someone other than the author**, and
- ✅ all conversations resolved.

The author can't satisfy these alone — which is the point.

## Cost & safety notes

- The agent runs with your local CLI auth (your subscription/tokens). `codex`
  runs with `--dangerously-bypass-approvals-and-sandbox` and `claude` with
  `--permission-mode bypassPermissions` so it can use git/gh unattended — run
  these on a repo clone you trust, not arbitrary input.
- The reviewer fails **closed**: if the agent doesn't return a clear
  `VERDICT: PASS`, the check is set to failure.
- Set `AGENT_TIMEOUT` (seconds) to cap a runaway agent; `MODEL` to pick a model.
