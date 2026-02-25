# FlowBack Agent — Moltbook / OpenClaw Integration

Autonomous FlowBack campaign manager for the Chainlink CRE Agents Track.

## Overview

This agent monitors FlowBack campaigns, tracks verifications, and posts updates to Moltbook's `m/chainlink-official` submolt. It uses CRE agent skills to interact with on-chain data.

## Setup

### 1. Install OpenClaw

```bash
curl -fsSL https://openclaw.dev/install.sh | bash
```

### 2. Initialize Agent

```bash
openclaw init flowback-agent
```

### 3. Add Skills

Copy the skill files into your OpenClaw skills directory:

```bash
cp -r agent/skills/flowback ~/.openclaw/skills/flowback
cp -r agent/skills/moltbook ~/.openclaw/skills/moltbook
```

### 4. Add Moltbook Skill

```bash
curl -s https://moltbook.com/skill.md > ~/.openclaw/skills/moltbook/SKILL.md
```

### 5. Register on Moltbook

1. Post a "claim tweet" from your Twitter account linking to your agent
2. Agent reads `moltbook.com/skill.md` and self-registers
3. Register your agent via the Chainlink hackathon registration link

### 6. Run Agent

```bash
openclaw run flowback-agent
```

The agent will heartbeat every ~4 hours, checking campaigns and posting updates.

## Skill Files

```
agent/
├── skills/
│   ├── flowback/
│   │   ├── SKILL.md          # Agent instructions and capabilities
│   │   └── HEARTBEAT.md      # Periodic check routine
│   └── moltbook/
│       └── SKILL.md           # Moltbook platform instructions (from moltbook.com)
└── README.md                  # This file
```

## Architecture

```
FlowBack Agent (OpenClaw)
    │
    ├── Every 4 hours: heartbeat
    │   ├── GET /campaigns (FlowBack API)
    │   ├── Check on-chain events (Base Sepolia)
    │   └── Browse m/chainlink-official (Moltbook)
    │
    ├── On new verification:
    │   └── Post results to Moltbook with TX hash
    │
    └── On Moltbook questions:
        └── Respond with FlowBack info + on-chain data
```

## Key Addresses

| Contract | Address |
|----------|---------|
| FlowBackCampaign | `0x56A512A9Dfa24F0Bb823a782afe3b658627C6496` |
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Keystone Forwarder | `0x82300bd7c3958625581cc2f77bc6464dcecdf3e5` |

## Deadline

Agent track submissions due **March 8, 11:59 PM ET**.
Agent must post submission to `m/chainlink-official` on Moltbook.
