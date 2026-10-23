---
title: "Ship mobile apps faster using Rails"
subtitle: "How Hotwire Native makes mobile app development fast, practical, and maintainable for web teams."
date: 2026-10-23T10:00:00+08:00
slug: hotwire-native-coscup
draft: false
author:
  name: Neba
  link: https://netale.et
  email: nebiyu@508.dev
  avatar: /neba.jpeg
description: A practical comparison of PWA, native, and cross-platform mobile development, and how Rails teams can ship iOS and Android apps with Hotwire Native and Strada.
keywords: Hotwire Native, Turbo Native, Strada, Ruby on Rails mobile app, build mobile app with Rails, Hotwire Native vs React Native, PWA vs native app, React Native vs native, cost to build a mobile app, COSCUP, iOS, Android
weight: 0
tags:
  - Ruby on Rails
  - Hotwire
  - Hotwire Native
  - Mobile Development
  - COSCUP
  - Open Source
categories:
  - technical
  - programming
hiddenFromHomePage: false
hiddenFromSearch: false
hiddenFromRelated: false
hiddenFromFeed: false
summary: At COSCUP, I gave a talk on "Building Native Mobile Apps Using Rails" in the Ruby Taiwan track. Here is a breakdown of why Hotwire Native and Strada are game-changers for solo developers and lean teams who want high-fidelity iOS and Android apps without maintaining separate codebases.
resources:
toc: true
math: false
lightgallery: false
password:
repost:
  enable: false
  url:
---

Most teams with a Rails app eventually ask the same question: how do we get onto our users' home screens without doubling, or tripling, our engineering effort?

I explored one answer at [COSCUP](https://coscup.org/) (Conference for Open Source Coders, Users, and Promoters) in September. Speaking in the Ruby Taiwan track, I shared a topic close to my heart: **Building Native Mobile Apps Using Rails** with [Hotwire Native](https://native.hotwired.dev/) and [Strada](https://strada.hotwired.dev/). This article walks through the three routes most teams consider, what each actually costs in codebases and maintenance, and why Hotwire Native is the pragmatic option for Rails teams.

{{< youtube GGojT82JL-k >}}

Would you believe me if I told you that Ruby on Rails (Rails) could also be used to build native mobile apps? You read that right: you can turn an existing Rails web application into a functional mobile app. If you have built with Rails and are looking to expand into mobile, this article is for you.

Most internet traffic now comes from mobile devices, and users are accustomed to launching products from their home screen. Whatever platform you choose, you cannot ignore mobile.

## The Dilemma of Mobile Development

Once you have decided you need a mobile app, there are three routes most teams consider. Each one trades effort in a different place.

### 1. The Progressive Web App (PWA) Route

This is the easiest path from an existing web app: add a manifest file, and whenever users visit your app in their browser they can install it to their home screen.

The trade-off is discoverability. Your app is not listed on the App Store or Play Store, which is the biggest drawback. Push notification support is also limited on iOS.

### 2. The Pure Native Route (Swift/SwiftUI + Kotlin/Jetpack Compose)

Going fully native delivers the gold standard for performance, animation, and platform integration. But it means maintaining three separate codebases: your backend/web application, an iOS app, and an Android app.

Even with AI assistance this is cumbersome. You still split your attention across disparate languages, ecosystems, and toolchains, and every validation rule, business logic change, and UI tweak has to be implemented three times.

### 3. Cross-Platform Route (React Native, Flutter)

Cross-platform frameworks solve the duplication between iOS and Android, which is a step forward. But they still duplicate everything with your web backend.

You still need to build and maintain an API surface, re-implement state management, duplicate validation logic on both client and server, handle token refresh lifecycles, and rebuild entire screens from scratch. Keeping web and mobile at feature parity remains an ongoing coordination tax.

### Comparing the three routes

|                             | PWA                                    | Pure Native (Swift/Kotlin)                            | Cross-Platform (React Native/Flutter)                       |
| --------------------------- | -------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| **Codebases to maintain**   | 1 (your web app)                       | 3 (web + iOS + Android)                               | 2 (web + mobile)                                            |
| **App Store / Play Store**  | Not listed                             | Yes                                                   | Yes                                                         |
| **Performance & animation** | Good for content, limited for heavy UI | Gold standard                                         | Near-native, some overhead                                  |
| **Platform integration**    | Limited (especially iOS)               | Full access                                           | Good, via native modules                                    |
| **Push notifications**      | Limited on iOS                         | Full                                                  | Full                                                        |
| **Offline support**         | Service workers                        | Full control                                          | Full control                                                |
| **Time to first release**   | Fastest                                | Slowest                                               | Moderate                                                    |
| **Ongoing maintenance**     | Lowest                                 | Highest                                               | Moderate to high                                            |
| **Feature parity with web** | Automatic                              | Manual, per platform                                  | Manual, plus API work                                       |
| **Best fit**                | Content sites, simple utilities        | Graphics-heavy, offline-first, deeply integrated apps | Teams that need one mobile codebase but accept an API layer |

## Enter Hotwire Native: The Best of Both Worlds

If you are a solo founder or part of a lean team, the decision has to be pragmatic. Hotwire Native is a counter-intuitive but entirely practical option. It changes the game by asking a simple question: **what if your mobile app were powered directly by your existing Rails server-rendered views?** You reuse the HTML that already works on the web and keep most of the logic on the server, with very little duplication.

It combines native navigation with server-rendered web content:

- **Native where it counts:** The navigation container, navigation bar, back gestures, tab bars, drawer menus, modal sheet presentations, and screen transitions are 100% native iOS (Swift) and Android (Kotlin) components.
- **Web where it matters:** The inner content of each screen is your standard Rails view, rendered server-side and delivered as fast HTML over the wire via Turbo.

When a user taps a link inside the web view, Hotwire Native intercepts the navigation event, pushes a new native view controller or fragment onto the navigation stack, and fetches the Rails page. To the user, screen transitions feel completely native: swiping back slides the screen away with hardware-accelerated platform physics.

## Success Stories of Hotwire Native

Hotwire Native is a battle-tested approach to building mobile apps. It was built by the team at 37signals, who use it for the HEY and Basecamp mobile apps. That is your guarantee that you could also use it to build an app with over a million downloads.

### Case study: Divoora Rider

I have also personally built a greenfield project using this approach. [Divoora](https://divoora.ch) is a food delivery and logistics company based in Switzerland, and they needed a mobile app for their riders. I built it on Rails with Hotwire Native and shipped it to both the [Play Store](https://play.google.com/store/apps/details?id=com.divoora.rider&pcampaignid=web_share) and the [App Store](https://apps.apple.com/ch/app/divoora-rider/id6736853007?l=en-GB).

What made it fast:

- The rider-facing screens were standard Rails views, so web and mobile shared one codebase and one set of validations.
- Native navigation, tab bars, and gestures came from the Hotwire Native wrappers rather than custom mobile UI work.
- Fixes and feature changes shipped from the Rails server without waiting on App Store review.

I am also currently building an app for book clubs using Hotwire Native. I started with the Rails backend, and after onboarding the first book club I began the iOS and Android apps. It is currently in testing on the Play Store.

I hope by now I have convinced you that Hotwire Native can be used to build successful production mobile apps.

## Why This Matters for Velocity

In practice, the operational benefits of Hotwire Native are massive:

1. **Instant Updates & Zero App Review Friction:** When you fix a typo, update business logic, or launch a new feature in a Rails controller or template, you deploy it to your web server and it is live in your mobile apps instantly. You only need to submit an App Store update when you modify native Swift/Kotlin wrapper code or add new native bridge components.
2. **Single Source of Truth:** Your routes, models, authorization policies, and validations exist in one place. No drifting REST or GraphQL API contracts.
3. **Hyper-Lean Team Size:** A single developer or a two-person team can comfortably build, ship, and maintain desktop web, mobile web, iOS, and Android applications simultaneously without burning out.

## Reflections from COSCUP and Q&A

Presenting at COSCUP was a fantastic experience. The Ruby Taiwan community is vibrant, welcoming, and deeply interested in practical engineering solutions that increase developer happiness and efficiency.

During the Q&A and hallway discussions, several great questions came up:

- **What about offline support?** Turbo Native provides snapshot caching out of the box, showing the last-rendered state of a screen immediately while revalidating in the background. For richer offline flows, Service Workers or local SQLite databases can be integrated via bridge components.
- **When is Hotwire Native NOT the right tool?** If you are building a graphic-intensive game, a video editor with frame-by-frame canvas manipulation, or an app whose core value is 100% offline-first utility, pure native or specialized engines are better fits. But for 90% of business applications, SaaS dashboards, e-commerce, and community platforms, Hotwire Native is more than sufficient; it is superior in iteration speed.

## Slides and Resources

If you would like to explore the slides or dive into the code from my talk:

- **Slides:** [Building Native Mobile Apps Using Rails](https://nebiyuelias1.github.io/coscup-2026-talk/)
- **COSCUP Session Details:** [Ruby Taiwan Track @ COSCUP](https://coscup.org/2026/track/516?session=BKCVJK)
- **Official Documentation:** [Hotwire Native](https://native.hotwired.dev/) & [Strada](https://strada.hotwired.dev/)

## Work with 508.dev

[508.dev](https://508.dev) is a worker-owned software co-op that helps small teams ship web and mobile products. If you are weighing a mobile app for your Rails product, here is how to start:

- **Free 30-minute assessment:** Walk us through your app and we will tell you honestly whether Hotwire Native fits, what should stay native, and what it would take to ship.
- **Rails to App Store checklist:** Email [nebiyu@508.dev](mailto:nebiyu@508.dev) and we will send the checklist we use to take a Rails app from local development to both stores.
- **Build with us:** Learn more at [508.dev](https://508.dev).
