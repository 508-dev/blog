---
title: "Microsoft Outage Keeping You Down? Try Self-Hosting"
date: 2026-11-12
author: "Caleb Rogers"
tags: ["Self-Hosting", "DevOps"]
summary: "Microsoft's 10-hour outage makes the case for going on-prem and choosing data sovereignty over cloud convenience."
slug: "microsoft-outage-self-hosting"
---

For ten hours now, people working at companies that use Microsoft services haven't been able to check their email. Microsoft's market cap is $3.8 trillion, and [according to them](https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q2), up to 450 million hapless employees could be sitting at work right now playing Angry Birds on their phone while they wait for Outlook to come back. At up to $60 a seat, I'm sure their employers are thrilled with this quality of service from Microsoft.

Other than convenience, one of the big pitches for cloud is enterprise-scale, five-nines reliability. Why risk managing software yourself when you can instead trust the guys whose entire business model is keeping your SaaS running? A good argument, if the cloud didn't keep going down, for all sorts of silly reasons: [DNS failure](https://www.aboutamazon.com/news/aws/aws-service-disruptions-outage-update?trk=public_post_comment-text) from one guy pushing an untested change, an [internal configuration error](https://blog.cloudflare.com/18-november-2025-outage/?utm_campaign=newsletter-030-november&utm_medium=email), or even just [the power going out](https://controlplane.com/blog/post/cloud-outage-tracker).

In fact, most reasons for choosing the cloud are starting to look moot in 2026, especially in the age of AI, when your company data is valuable not just to Russian hackers looking to win a quick buck, but to anyone training an AI model that's hungry for high-quality, human-generated text. This new market has led to some cloud providers giving in to their worse instincts and [training AI models on customer data](https://slack.com/trust/data-management/privacy-principles). Furthermore, LLMs are making hacking practically automated, leading to [catastrophic leaks of customer data](https://unit42.paloaltonetworks.com/threat-brief-compromised-salesforce-instances/?_wpnonce=62488fb76d&lg=en&pdf=print). It's making less and less sense to lump your business and your customers' data alongside everyone else's in the feeding trough. Better to go solo.

Luckily, the other outcome of this new AI world is that it's never been easier to go on-prem. Did you know that you don't need to trust Slack to ignore the siren call of your delicious data? You can just deploy your own instance of [Mattermost](https://mattermost.com/) or [Zulip](https://zulip.com/)! Worried about Microsoft going down again? Why not instead have [Nextcloud](https://nextcloud.com/) running on a server in the same building as your employees? At least then you don't need to worry about power outages in places on the other side of the world, just the ones at home that would have prevented you from working anyway.

Another bonus for these services is that you don't need to pay per-seat costs, which for small businesses means no more trying to get around cloud blocks on account sharing to save a couple bucks, and for large businesses means saving potentially tens of thousands a year (if not more). On-prem and self-hosted server costs do scale with seats, but stepwise: the same server or VPS will happily host 10 or 100 seats without a hiccup, and when you get to 1,000, just move things to a bigger server, and now you're good for the next ten thousand seats!

Worried about the IT cost of managing on-prem or self-hosted services? Never fear! That market has been more than covered with managed hosting providers all competing for margin, meaning for very reasonable pricing, you can get two-click deployment of a Salesforce replacement, and get DNS setup, backups, and even support with it. Examples include [Elestio](https://elest.io/) (who we use) or [PikaPods](https://www.pikapods.com).

At the co-op, we've spent the last six years building out on open-source self-hosted SaaS. This is especially useful for us since not every member is always revenue-generating, so per-seat costs could easily eat up the [small margin](https://508.dev/pricing) we have on our services. Another huge upside to this has been that we can easily customize the software to our needs: we can clone down the entire codebase, throw Claude at it, and then deploy our patches ourselves, tuning our software to exactly our needs. This has led to, for example, custom ERPNext modules, such as [erp_rules](https://github.com/508-dev/erp_rules), [books_assistant](https://github.com/508-dev/books_assistant), [books_health](https://github.com/508-dev/books_health), and [referral_fee](https://github.com/508-dev/referral_fee).

Other services we use:

- [Nextcloud](https://nextcloud.com/), replacing Google / Microsoft Calendar, Drive, Docs, Spreadsheets, and Mail (we use [Migadu](https://migadu.com/) as our mail provider)
- [ERPNext](https://frappe.io/erpnext), replacing QuickBooks
- [EspoCRM](https://www.espocrm.com/), replacing Salesforce
- [Outline](https://www.getoutline.com/), replacing Notion
- [cal.com](http://cal.com/), replacing Calendly
- [OpenProject](http://openproject.com/), replacing Linear / Jira
- [Vaultwarden](https://vaultwarden.com/), replacing Bitwarden / 1Password
- [DocuSeal](http://docuseal.com/), replacing DocuSign
- [Coolify](https://coolify.io/), replacing Heroku / AWS / Google Cloud / Vercel / Netlify / Cloudflare Workers

At about 100 engineers in our co-op, it would cost us something like $9,000/month to maintain seats for everyone in all of our SaaS, if we didn't self-host. As it stands, we currently pay about 100/month for various VPSes and managed hosting providers, and that will probably go down when we switch entirely to self-managed VPSes.

In a survey of 320 companies, [32% said they were moving to on-prem](https://blog.451alliance.com/data-sovereignty-and-egress-charges-reshape-migration-strategies-2). If you're considering it too or have made the jump yourself, I'd love to chat and trade notes! Email me at caleb at this domain.
