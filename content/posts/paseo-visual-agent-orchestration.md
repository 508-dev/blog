---
title: Why I Switched to Paseo to Orchestrate Coding Agents
subtitle: Conductor still has my favorite UI, but Paseo better fits the way I coordinate coding agents across my own devices.
date: 2026-07-25T00:00:00+09:00
slug: paseo-visual-agent-orchestration
draft: false
author:
  name: Michael Wu
  link: https://www.michaelmwu.com/
  email: michael@508.dev
  avatar:
description: I recently switched from Conductor to Paseo for my multi-device agentic development environment. Paseo is fully open source, has Linux and Windows apps, mobile apps, and can itself be orchestrated through a CLI.
keywords: Paseo, agentic development environment, ADE, agent orchestration, coding agents, Conductor, Hermes, CLI, open source
weight: 0
tags:
  - AI
  - tooling
  - developer experience
  - open source
categories:
  - technical
hiddenFromHomePage: false
hiddenFromSearch: false
hiddenFromRelated: false
hiddenFromFeed: false
resources:
toc: true
math: false
lightgallery: false
password:
repost:
  enable: false
  url:
summary: >-
  I recently switched from Conductor to Paseo for my multi-device agentic development environment. Conductor still has the best UI and flow in my view, but Paseo better fits my setup because it is fully open source, has Linux and Windows apps, mobile apps, and can itself be orchestrated through a CLI.
---

If you are looking for an agentic development environment (ADE), I would check out [Paseo](https://paseo.sh/).

There has been an explosion of tools in this category. I have been looking at a small mix of GUI-based and terminal-first options. This is not a feature matrix or a ranking—just the short list I considered and the details that stood out to me while I was deciding what to use.

## Other Tools I Looked At

### GUI-Based

- [Agentastic](https://www.agentastic.dev/): not open source yet.
- [Agents Room](https://agentsroom.dev/): supports remote use, but is not open source.
- [Conductor](https://www.conductor.build/): what I was using previously.
- [Orca](https://www.onorca.dev/): supports remote use, is open source, and has a mobile app.
- [Emdash](https://emdash.ai/): open source and appears to support remote use.

### Terminal-First

- [cmux](https://cmux.com/)
- [Herdr](https://herdr.dev/)

For a broader overview, see Ryan Walker’s [comparison of Mac coding-agent apps](https://rywalker.com/research/mac-coding-agent-apps). I encourage people to try out various tools to see how they work for you!

I had previously recommended [Conductor](https://www.conductor.build/), and I still think it has the best UI and flow for making development more automatic. It is a genuinely polished experience, and that matters when the goal is to make agent work easier to follow and manage.

Paseo is the better fit for me right now because I am optimizing for something slightly different: control over the devices I already run, the ability to work across them, and the option to bring agent orchestration into my own command-line workflows.

## What I Am Optimizing For

This is not a claim that one tool is better at everything. Conductor’s interface and workflow are still the bar for me when I think about how this kind of environment should feel to use.

The deciding constraint in my own setup is remote control. At the time I made this decision, Remote was available only through paid Conductor Cloud, which means I could not use it to remotely control my own devices in the way I wanted. That is a mismatch with my setup, not a dismissal of Conductor.

For Paseo, the practical checklist is straightforward:

- It is fully open source.
- It has Linux and Windows apps.
- It has mobile apps.
- It can itself be orchestrated through a CLI.

Those are the things I need from an ADE more than a broad feature-by-feature comparison. The CLI point is especially important to me: I do not want the visual layer to be isolated from the rest of my workflow. I want the option to include agent orchestration itself in the way I automate and coordinate work.

## The ADE I Actually Need

I have Paseo instances running on both my MacBook and a mini PC at home. I can control them through my Hermes agent or the mobile app.

To give an agent the same access, I wrote [Paseo Agent Orchestration](https://github.com/508-dev/paseo-agent-orchestration), an Agent Skills-compatible package for safely coordinating trusted coding agents through Paseo. Install its `skills/paseo-agent-orchestration` directory using your client’s Agent Skills mechanism, then point the client at the Paseo daemon it will manage. Keep the endpoint and authentication details in the client’s deployment configuration, separate from an untracked, read-only repository alias map that identifies the repositories the skill may target. Those aliases identify targets, not what the skill can do; it can still use its permitted Paseo tools to create and manage work. On the same machine, that can be the local daemon the desktop app has already started; for a remote host, the client needs a secure route to the relevant daemon’s MCP endpoint. I use it with Hermes, but I intentionally kept the core skill agent-neutral, so it can also be used with OpenClaw or another compatible client.

![Paseo mobile app showing MacBook and home mini PC remote hosts](/images/paseo-mobile-remote-control.png)

That is the difference that makes Paseo practical for me. I am not choosing an ADE only by how it feels on one machine at one desk. I want it to fit the way I already split work across my MacBook and a machine at home, while still being reachable when I am away from either one.

The visual interface still matters, of course. But in my setup, the requirement that changes the decision is being able to operate my own devices.

## Adding Workflows with Hub

[Paseo Hub](https://github.com/getpaseo/hub) is a self-hosted automation layer for Paseo. It can start coding agents from GitHub, Slack, Discord, or a manual run, then dispatch them to the Paseo daemons on the machines you already own.

That is an interesting extension of the setup I want: not just a visual tool I open when I sit down, but a way for work that arrives in Discord or GitHub to trigger the right workflow on the right machine. Hub keeps its triggers, environments, permissions, and prompts in version-controlled `.paseo/hub.yml` and `.paseo/workflows/` files.

It is still in early development; Hub’s README warns that breaking changes and data loss are possible. I would treat it as something to experiment with rather than production infrastructure for now.

## Why Open Source Changes How I Use It

The maintainer is also serious about keeping Paseo open source. As he has described it, the plan is to keep everything open source—including the relay—while fully supporting self-hosting and offering paid hosted services for people who want that option. That combination matters to me: it keeps self-hosting as a first-class option without taking away the convenience of a hosted service.

I am actively making improvements to Paseo and seeing whether they will get merged. These are things like support for `.worktreeinclude`, importing sessions from other ADEs, and more automatic development. That is another meaningful part of the appeal for me: I can participate in improving the tool I use instead of treating it as a fixed service.

The maintainer has been responsive in my experience. That does not guarantee that every contribution will be accepted, but it makes experimentation and upstream collaboration feel worthwhile.

## Bottom Line

If polished UI and flow are your first priority, I still think [Conductor](https://www.conductor.build/) is worth a close look. It remains my reference point for making development feel more automatic.

If you share my priorities—an ADE for coordinating coding agents across your own devices, access through Hermes or a mobile app, an open source project, and orchestration that can fit into CLI-based workflows—[Paseo](https://paseo.sh/) is worth trying.

For me, it is not about declaring a universal winner. It is about choosing the ADE that fits the way I actually work.
