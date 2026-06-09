/**
 * Gmail Auto-Reply: "I will respond soon"
 * -----------------------------------------
 * Sends a one-time courtesy reply to people who email you, letting them
 * know you'll get back to them. Each thread is replied to only once
 * (tracked with a Gmail label) so senders are never spammed.
 *
 * Setup instructions are in README.md.
 */

// ----------------------------- Configuration -----------------------------

var CONFIG = {
  // The reply message. Plain text; {{name}} is replaced with the sender's name.
  REPLY_BODY:
    'Hi {{name}},\n\n' +
    'Thanks for your email — I\'ve received it and will respond soon.\n\n' +
    'Best regards,\n' +
    'Jan',

  // Label applied to threads we\'ve already auto-replied to (created if missing).
  REPLIED_LABEL: 'Auto-Replied',

  // Only consider messages received within this many minutes. Keeps the script
  // from replying to old mail the first time you run it. (60 = last hour.)
  LOOKBACK_MINUTES: 60,

  // Safety cap on how many threads to process per run.
  MAX_THREADS_PER_RUN: 25,

  // Skip auto-replies for these senders (substring match, case-insensitive).
  // Good for no-reply addresses, your own address, mailing lists, etc.
  SKIP_SENDERS: ['no-reply', 'noreply', 'donotreply', 'mailer-daemon'],

  // If true, don\'t reply to mass mail (anything with a List-Unsubscribe header,
  // e.g. newsletters and marketing).
  SKIP_BULK_MAIL: true,
};

// ------------------------------- Main entry ------------------------------

/**
 * Scans recent unread inbox mail and sends the auto-reply where appropriate.
 * Run this on a time-based trigger (see installTrigger / README).
 */
function autoReplyToNewEmails() {
  var label = getOrCreateLabel_(CONFIG.REPLIED_LABEL);
  var myEmail = Session.getActiveUser().getEmail().toLowerCase();

  // Unread inbox threads from the lookback window that we haven\'t replied to.
  var query =
    'in:inbox is:unread newer_than:' +
    Math.ceil(CONFIG.LOOKBACK_MINUTES / 60 / 24 || 1) +
    'd -label:' + quoteLabel_(CONFIG.REPLIED_LABEL);

  var threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_RUN);
  var cutoff = new Date(Date.now() - CONFIG.LOOKBACK_MINUTES * 60 * 1000);
  var repliedCount = 0;

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];

    try {
      var messages = thread.getMessages();
      var lastMessage = messages[messages.length - 1];

      // Only reply to genuinely recent inbound mail.
      if (lastMessage.getDate() < cutoff) continue;

      // Don\'t reply to threads where the most recent message is from us.
      var from = lastMessage.getFrom().toLowerCase();
      if (from.indexOf(myEmail) !== -1) continue;

      if (shouldSkipSender_(from)) continue;
      if (CONFIG.SKIP_BULK_MAIL && isBulkMail_(lastMessage)) continue;

      var senderName = extractName_(lastMessage.getFrom());
      var body = CONFIG.REPLY_BODY.replace(/\{\{name\}\}/g, senderName);

      thread.reply(body);
      thread.addLabel(label);
      repliedCount++;

      Logger.log('Auto-replied to: ' + lastMessage.getFrom());
    } catch (err) {
      Logger.log('Error processing thread "' + thread.getFirstMessageSubject() +
        '": ' + err);
    }
  }

  Logger.log('Done. Auto-replied to ' + repliedCount + ' thread(s).');
}

// ------------------------------- Helpers ---------------------------------

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// Gmail search needs multi-word labels quoted; spaces become hyphens internally.
function quoteLabel_(name) {
  return name.indexOf(' ') !== -1 ? '"' + name + '"' : name;
}

function shouldSkipSender_(fromLower) {
  for (var i = 0; i < CONFIG.SKIP_SENDERS.length; i++) {
    if (fromLower.indexOf(CONFIG.SKIP_SENDERS[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  return false;
}

// Newsletters/marketing typically set a List-Unsubscribe or Precedence: bulk header.
function isBulkMail_(message) {
  var raw = message.getRawContent().toLowerCase();
  return raw.indexOf('list-unsubscribe:') !== -1 ||
    raw.indexOf('precedence: bulk') !== -1 ||
    raw.indexOf('precedence: list') !== -1;
}

// Turns "Jane Doe <jane@x.com>" into "Jane", or falls back to the address.
function extractName_(fromHeader) {
  var match = fromHeader.match(/^\s*"?([^"<]+?)"?\s*</);
  if (match && match[1].trim()) {
    return match[1].trim().split(/\s+/)[0];
  }
  var emailMatch = fromHeader.match(/([^@<\s]+)@/);
  return emailMatch ? emailMatch[1] : 'there';
}

// ---------------------------- Trigger management -------------------------

/**
 * Run ONCE to install a time-based trigger that runs the auto-reply every
 * 5 minutes. Re-running won\'t create duplicates.
 */
function installTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('autoReplyToNewEmails')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('Trigger installed: runs every 5 minutes.');
}

/** Removes all triggers for this script. */
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoReplyToNewEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log('Removed existing auto-reply triggers.');
}
