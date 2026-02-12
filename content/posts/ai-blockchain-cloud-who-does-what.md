---
title: "Part 1: AI, Blockchain, and Cloud – Who Does What"
date: 2026-02-12
author: "Tom Wang"
tags: ["AI","Web3","Blockchain","Cloud","Engineering"]
series: "AI Meets Web3: Reality, Architecture, and the Future"
---

# AI, Blockchain, and Cloud — Who Actually Does What?

AI computes. Blockchain verifies. Cloud scales.

## Three-Layer Responsibility Model

| Layer | Responsibility | Why |
|-------|---------------|-----|
| AI | Prediction & learning | Intelligence |
| Blockchain | Immutability & verification | Trust |
| Cloud | Compute & orchestration | Scale |

---

## 🧩 Case Study: On-Chain Lending Risk Engine

A DeFi lending protocol used:
- Cloud ML model for wallet risk scoring
- SHA256 commitment of output
- Smart contract enforcement of borrowing caps

Hybrid allowed fast inference, on-chain verifiability, and audit-ready governance.

---

## ✅ Implementation Checklist

- [ ] Separate inference from settlement
- [ ] Hash outputs + model version
- [ ] Keep on-chain storage minimal
- [ ] Monitor gas costs
- [ ] Version models + features

---

## ⚖️ Tradeoffs

| Decision | Benefit | Cost |
|----------|---------|------|
| Off-chain inference | Scalable | Requires trust layer |
| On-chain commitment | Verifiable | Gas cost |
| Full output on-chain | Transparent | Expensive |

---

## 📚 Further Reading

- Ethereum Whitepaper  
- AWS Well-Architected Framework  
- Designing Data-Intensive Applications  
