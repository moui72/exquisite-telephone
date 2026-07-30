---
status: open
created: 2026-07-30
plan: null
---

# Feedback

## Bugs
- [ ] F001 The real-socket server integration tests in `server/src/socket/server.test.ts` flake under load — observed repeatedly tripping the pre-commit full-suite hook and passing on retry across the 2026-07-27/29 sessions. Two recurring signatures: `> reconnect tolerance (onRejoin / disconnect) > a dropped connection can resume the same seat with its session token` (fails as `waitForEvent: timed out after 2000ms waiting for "connect"`, server.test.ts:322) and `> onPlayAgain > gives the host a new room/player, pushes the other client its own new roomChanged, ...` (server.test.ts:673). Root cause is timing-sensitivity, not a product bug — the whole suite runs in parallel and the 2000ms default poll/connect budget in `server/src/test-support/waitFor.ts` (`timeoutMs = 2000`) is too tight when the machine is loaded, so a genuinely-correct reconnect/connect just doesn't win the race in time. Cost: every commit that runs the hook risks a spurious red and a manual retry. Candidate fixes for the plan to weigh — raise/loosen `waitForEvent`'s connect budget for these socket tests, await an explicit `connect` event instead of polling, serialize the heaviest socket integration tests, or otherwise de-flake them so the pre-commit hook is deterministic again (`server/src/socket/server.test.ts`, `server/src/test-support/waitFor.ts`).
</content>
