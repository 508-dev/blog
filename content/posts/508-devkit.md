---
title: Introducing 508-devkit
subtitle: Opinionated sane defaults for starting AI-agent-friendly projects.
date: 2026-06-09T00:00:00+08:00
slug: 508-devkit
draft: false
author:
  name: Michael Wu
  link:
  email: michaelmwu@gmail.com
  avatar:
description: Why we started 508-devkit, a set of opinionated project defaults for repos that expect AI coding agents to contribute from day one.
keywords: 508-devkit, AI agents, coding agents, developer experience, project templates, Bun, pnpm, uv
license:
comment: false
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
message:
repost:
  enable: false
  url:
summary: 508-devkit is a collection of opinionated project defaults for repos that expect AI coding agents to contribute from day one. It captures the conventions we want in place before a new project grows around accidental omissions.

# See details front matter: https://fixit.lruihao.cn/documentation/content-management/introduction/#front-matter
---

We started something new: [508-devkit](https://github.com/508-dev/508-devkit).

At 508.dev, we have been working on a number of open source projects under the [508-dev GitHub organization](https://github.com/508-dev/), and one thing that keeps coming up is how much the first few hours of a repo shape everything that follows. Before there is much product code, the project has already made a lot of decisions: which package manager it expects, how local services should run, where environment files live, whether Docker is for infrastructure or the whole development loop, what CI should care about, and what instructions future contributors and agents are supposed to follow.

If those decisions are not written down, they still happen. They just happen by accident.

That matters more now because coding agents are part of our workflow. They are useful, but they are also happy to fill in blanks with something that looks reasonable in the moment. One agent might assume npm in a repo where we want Bun first. Another might add pnpm support in a slightly different way. A third might produce a Docker-first setup when the project is supposed to run app services on the host and use Docker Compose only for databases, queues, or caches. Each individual choice is easy to fix, but after a while the repo starts accumulating little inconsistencies that make it harder for both humans and agents to understand what "normal" looks like.

508-devkit is our attempt to write those defaults down before the project has a chance to drift.

## Defaults Are Part of the Project

This is not meant to be a universal template where every repo gets the same stack. We do not want that, and most real projects would outgrow it quickly. The goal is narrower: give a new project a clear starting shape, especially when we already know agents will be reading and modifying the codebase.

For JavaScript, that means treating Bun and pnpm as first-class examples, with Bun shown first because that is often what we want new projects to reach for. For Python, it means documenting optional `uv` workspace conventions instead of leaving every service to rediscover them. Across both ecosystems, it means including dependency cooldowns early, while the dependency policy is still easy to understand, rather than waiting until the project has already built habits around installing whatever was published five minutes ago.

The same idea applies to local development. We keep wanting host-run development services, Docker Compose examples for local infrastructure, deterministic ports for worktrees, framework-neutral frontend conventions, `.worktreeinclude` for copying local-only environment files into sibling worktrees, and a `.dockerignore` that keeps Docker build contexts small and avoids sweeping secrets into images. None of these things are exciting, but they are exactly the details that make a project feel calm when several people and several agents are working in it.

## Instructions for Agents, Not Just Humans

Most project setup still assumes the reader is a human with enough context to fill in gaps. That assumption is weaker now. If Codex, Claude Code, Cursor, and whatever comes next are going to work in a repo, they need instructions written for the way they actually operate.

That means telling them where local context belongs, which files are workspace-only, which commands are preferred, how worktrees should pick ports, and what conventions should not be overwritten just because a generated patch would be simpler without them. Agent instructions do not need to be long, but they do need to be specific. "Write good code" is not useful guidance. "Use Bun first, keep `.context/` gitignored, prefer host-run app services, and use Docker Compose for local infrastructure" is much harder to misinterpret.

508-devkit includes agent-native instructions for Codex, Claude Code, Cursor, and future agents, along with `.context/` conventions for Conductor and other agent workflows. The point is not to add process for its own sake; it is to give agents enough local knowledge that they stop inventing project policy from nearby files.

## The Boring Files Carry a Lot of Weight

The files people skip past during setup often matter more than they get credit for. A clear `.dockerignore` protects build contexts from becoming enormous or accidentally secret-filled. A simple Docker Compose example can make databases and caches predictable without forcing the app itself into a container. GitHub issue, PR, and CI hygiene makes agent-generated work easier to review because reviewers can tell what kind of evidence, tests, and description the project expects.

508-devkit also includes examples for the stacks we commonly reach for. On the Python side, that includes Pydantic settings and schemas, Alembic migrations, Ruff, MyPy, and Pytest. On the TypeScript side, it includes Drizzle ORM, Biome, and Vitest. There is also optional SOPS documentation, but SOPS is intentionally not forced into every repo. Some projects should keep encrypted secrets in git; many should not, and a starter kit should make that decision visible without pretending there is only one correct answer.

## A Better Starting Point

The bet behind 508-devkit is that setup is a communication layer. Humans read it, agents read it, CI reads it, and future contributors read it months later when nobody remembers why a convention exists. The more a repo can explain itself early, the less coordination it needs later.

We expect the kit to evolve as we use it across more projects. For now, it is a collection of the defaults we keep wanting whenever we start something new: agent instructions, local context conventions, package manager examples, dependency safety, worktree ergonomics, infrastructure examples, Docker hygiene, CI hygiene, and practical backend/frontend tooling.

If you are starting a project where AI agents are going to be part of the development workflow, 508-devkit is meant to give both the humans and the agents a better starting point.

You can check it out here: [github.com/508-dev/508-devkit](https://github.com/508-dev/508-devkit) 🙂
