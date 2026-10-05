---
name: Telegram library choice
description: Why BattleChat uses grammY and how to handle Telegram API errors safely.
---

Use grammY for the BattleChat Telegram bot unless a secure, compatible alternative is deliberately selected.

**Why:** Replit's package firewall rejected a vulnerable transitive dependency of the legacy `node-telegram-bot-api` version. Its latest release installed but no longer exposed the constructor API the project used.

**How to apply:** Check compatibility and Replit package-firewall behavior before changing Telegram libraries. Do not log full Telegram API or network errors because they can contain the bot token in a request URL.