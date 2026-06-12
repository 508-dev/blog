---
title: How to Use clawpatch to Fix Your Vibecoded AI Slop
subtitle: A small guide for cleaning up the mess after vibecoding.
date: 2026-06-12T11:43:00+02:00
slug: how-to-use-clawpatch-to-fix-your-vibecoded-ai-slop
draft: false
author:
  name: Emilio Haataja
  link: https://haataja.dev/
  email:
  avatar:
description: You vibecoded something useful, but now the repo is a bit of a mess. Here is how I used clawpatch to start cleaning it up.
keywords: AI, AI agents, coding agents, clawpatch, vibecoding, deslopify
weight: 0
tags:
  - AI
  - clawpatch
  - vibecode
  - vibecoding
  - tooling
categories:
  - technical
  - programming
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
summary: I vibecoded something useful, then had to deal with the usual mess that comes after. This is a short guide to using clawpatch to review the repo, fix one thing at a time, and slowly make the codebase a bit less cursed.
---

# How to Use clawpatch to Fix Your Vibecoded AI Slop

So, you have been vibecoding.

You managed to create a useful, maybe even awesome, tool. But now you have realised something slightly uncomfortable: the thing has become a bit of a monster.

The repo works, sure. But it is also full of code debt, strange decisions, duplicated logic, and the kind of “I’ll clean this up later” code that somehow never gets cleaned up later.

So what can you do now?

You could go through the whole codebase yourself. You could also ask an agent directly to clean things up, which can be fine for smaller fixes.

But for this kind of repo cleanup, I like using **[clawpatch](https://clawpatch.ai/)**. It gives me the loop I want for this kind of thing: map the repo, review it in `deslopify` mode, fix one finding, review the diff, revalidate, and repeat.

So instead of making my own workflow with prompts or custom skills, I can just use something that is already built around cleaning up a messy codebase.

It also helps that clawpatch comes from the [OpenClaw](https://github.com/openclaw/openclaw) world and is made by [Peter Steinberger](https://github.com/steipete). That gives it a bit more weight for me, since it comes from someone already deep in this kind of AI coding workflow.

Here is a short guide on how to use it.

## Install clawpatch

Start by installing clawpatch globally:

```bash
npm install -g clawpatch
```

## Initialise Your Project

Next, initialise your project with clawpatch:

```bash
clawpatch init
```

## Build a Semantic Map

Then build a semantic map of your codebase:

```bash
clawpatch map
```

This gives clawpatch a better understanding of how your project is structured and how the different parts of the code relate to each other.

## Run Your First Review

Now you can run a review. Since this post is about cleaning up vibecoded code, start with `deslopify` mode:

```bash
clawpatch review --mode deslopify --limit 3
```

The `--limit 3` part keeps the first run small and manageable. You can increase it later when you feel more comfortable with the workflow.

`deslopify` means that clawpatch focuses on cleanup findings that can be justified from the local codebase. Instead of broad opinions, it looks for concrete cleanup work.

If you want a broader review later, you can run:

```bash
clawpatch review --limit 3
```

You can find the raw findings here:

```text
.clawpatch/findings/
```

clawpatch should also generate a report that is easier to read. The report is basically a human-readable summary of the findings.

If the report was not generated automatically, you can generate it manually:

```bash
clawpatch report
```

The reports can be found here:

```text
.clawpatch/reports/
```

## Pick a Finding to Fix

To fix a finding, you need to look for its ID.

You can find this in the report as the `id` field, or in one of the `.json` files inside `.clawpatch/findings/` as `findingId`.

Take a read through the report and make a judgement on what you want to fix first. No need to fix everything at once. Pick one finding, copy the ID, and run:

```bash
clawpatch fix --finding <finding-id>
```

This will run the AI and let it try to fix the issue.

Important thing to know: `clawpatch fix` changes your worktree, but it does not mean the fix is automatically accepted. You still need to manually review the diff before you keep it, commit it, or continue building on top of it.

As an example, in one of my runs, clawpatch found some buggy CSV parsing code. It fixed the code and added a test to validate the solution. Quite nice, actually.

## Revalidate the Finding

This is not the end of the process. After fixing a finding, you should revalidate it:

```bash
clawpatch revalidate --finding <finding-id>
```

This makes clawpatch look at the same finding again and update its status.

So if the issue is no longer relevant after the fix, the report can reflect that. If it is still there, you know you may need to take another look.

## Repeat the Process

After that, you can continue finding more issues:

```bash
clawpatch review --mode deslopify --limit <limit-amount>
```

Then fix a finding:

```bash
clawpatch fix --finding <finding-id>
```

Manually review the diff, then revalidate it:

```bash
clawpatch revalidate --finding <finding-id>
```

That is the basic loop.

Review, fix, manually review the diff, revalidate. Then repeat.

This gives you a pretty straightforward way to chip away at the mess without turning it into a big refactoring project. You can read the findings, pick what looks useful, let clawpatch do the fix, review the diff, and then move on to the next thing.

Very reasonable.

## Further Reading

For further reading, check out:

- [Official clawpatch documentation](https://clawpatch.ai/)
- [clawpatch on GitHub](https://github.com/openclaw/clawpatch)

The GitHub README also includes a more complete workflow with commands like `clawpatch next`, `clawpatch show`, `clawpatch triage`, `clawpatch ci`, and `clawpatch open-pr`. That is useful if you want to go beyond this basic introduction and use clawpatch in a more structured or CI/CD-style workflow.