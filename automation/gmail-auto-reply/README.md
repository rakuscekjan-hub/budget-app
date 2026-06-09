# Gmail Auto-Reply — "I will respond soon"

A small [Google Apps Script](https://developers.google.com/apps-script) that
automatically sends a courtesy reply ("I've received your email and will respond
soon") to people who email you.

It runs on Google's servers on a schedule — no server or hosting of your own
required — and replies to each conversation **only once** so senders are never
spammed.

## Features

- ✅ Replies once per conversation (tracked with an `Auto-Replied` Gmail label)
- ✅ Personalizes the greeting with the sender's first name
- ✅ Skips your own replies, `no-reply` addresses, and bulk/newsletter mail
- ✅ Only touches recent mail, so it won't blast your whole inbox on first run
- ✅ Fully configurable at the top of `Code.gs`

## Setup (5 minutes)

1. Go to **<https://script.google.com>** and click **New project**.
2. Delete the placeholder `Code.gs` content and paste in the contents of
   [`Code.gs`](./Code.gs) from this folder. Save.
3. (Optional) Edit the `CONFIG` block at the top — message text, signature
   name, lookback window, etc.
4. In the function dropdown at the top, select **`autoReplyToNewEmails`** and
   click **Run**. Google will ask you to authorize the script's access to Gmail:
   - Choose your Google account → **Advanced** → **Go to (project name)** →
     **Allow**.
   - This grants the script permission to read and send mail on your behalf.
     (The "unverified app" warning is normal for personal scripts you wrote
     yourself.)
5. Select **`installTrigger`** in the dropdown and click **Run** once. This
   schedules the auto-reply to run **every 5 minutes**, forever, automatically.

That's it. From now on, anyone who emails you gets a "will respond soon" reply
within ~5 minutes.

## Configuration

All settings live in the `CONFIG` object at the top of `Code.gs`:

| Setting | What it does |
| --- | --- |
| `REPLY_BODY` | The message sent. `{{name}}` becomes the sender's first name. |
| `REPLIED_LABEL` | Gmail label used to remember which threads were replied to. |
| `LOOKBACK_MINUTES` | Only reply to mail received within this window (default 60). |
| `MAX_THREADS_PER_RUN` | Safety cap on replies per run (default 25). |
| `SKIP_SENDERS` | Substrings of addresses to never reply to. |
| `SKIP_BULK_MAIL` | If `true`, skips newsletters/marketing mail. |

## Managing it

- **Change the schedule** — edit `everyMinutes(5)` in `installTrigger`, then
  run `installTrigger` again (it cleans up the old trigger first).
- **Turn it off** — run the `removeTriggers` function, or delete the trigger
  under the ⏰ **Triggers** tab in the Apps Script editor.
- **See what it did** — open the **Executions** tab in the Apps Script editor
  for logs of every run.

## How it works

On each run the script searches your inbox for **unread** messages received in
the lookback window that don't already carry the `Auto-Replied` label. For each
qualifying thread it replies with your message, then adds the label so the same
conversation is never replied to twice. Replies from yourself, no-reply
addresses, and bulk mail are skipped.

## Note on the Gmail vacation responder

Gmail has a built-in **Vacation responder** (Settings → General) that also
auto-replies. This script is preferable when you want it running *all the time*
(not just "on vacation"), want per-sender personalization, or want to exclude
newsletters and no-reply addresses — none of which the built-in responder
supports.
