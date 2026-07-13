---
slug: fly-io-deployment
status: implemented
logged: 2026-07-13
plan: plan-fly-io-deployment-2026-07-13-20ad.md
tasks: tasks-fly-io-deployment-e2db.md
---

The app can be deployed to Fly.io: a Dockerfile and fly.toml exist so the Node/Socket.IO server (serving the built Svelte client) can be built and run as a Fly app.
Why: chosen hosting target for v1 since it supports long-lived WebSocket connections and persistent processes, unlike typical serverless platforms.
