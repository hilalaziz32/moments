/**
 * Every sentence Moments sends, in one place.
 *
 * The worker sends these and the web app previews them, so what HR sees on the
 * moment page is word for word what their people receive. Pure: no I/O, no clock.
 *
 * SMS copy stays short: a single 160-character segment where possible, with the
 * link last so it survives truncation on older handsets.
 */

export function renderAnnouncement(
  key: string, name: string, years: number | null, department: string | null,
): string {
  const dept = department ? ` from ${department}` : "";
  switch (key) {
    case "birthday":
      return `It's ${name}'s birthday today. Wishing you a brilliant one from all of us.`;
    case "work_anniversary":
      return years
        ? `${name}${dept} is ${years} ${years === 1 ? "year" : "years"} with us today. Thank you for all of it.`
        : `${name}${dept} marks another year with us today.`;
    case "new_hire":
      return `${name} joins us${dept} today. Say hello when you get a moment.`;
    case "promotion":
      return `${name} has been promoted. Thoroughly deserved.`;
    case "marriage":
      return `${name} is getting married. Every happiness to you both.`;
    case "new_baby":
      return `${name} has welcomed a new arrival. Congratulations to the whole family.`;
    case "farewell":
      return `Today is ${name}'s last day${dept}. Thank you for everything, and good luck.`;
    case "eid_ul_fitr":
    case "eid_ul_adha":
      return "Eid Mubarak from all of us. Wishing you and your families a joyful one.";
    case "ramadan":
      return "Ramadan Kareem. Wishing everyone a peaceful and blessed month.";
    default:
      return `Celebrating ${name} today.`;
  }
}

/** Words the manager can send themselves. We never send them as the manager. */
export function renderManagerNote(key: string, name: string, years: number | null): string {
  switch (key) {
    case "birthday":
      return `Happy birthday, ${name}. Hope you get a proper break today.`;
    case "work_anniversary":
      return years
        ? `${years} ${years === 1 ? "year" : "years"} today, ${name}. Genuinely glad you're on this team.`
        : `Another year today, ${name}. Genuinely glad you're on this team.`;
    case "new_hire":
      return `Welcome aboard, ${name}. Shout if you need anything in these first weeks.`;
    case "promotion":
      return `Congratulations, ${name}. You earned this one.`;
    case "marriage":
      return `Congratulations, ${name}! Wishing you both every happiness.`;
    case "new_baby":
      return `Congratulations, ${name}! Enjoy every moment with the little one.`;
    case "farewell":
      return `Thank you for everything, ${name}. Keep in touch.`;
    default:
      return `Thinking of you today, ${name}.`;
  }
}

export const smsText = {
  addressRequest: (first: string, orgName: string, url: string) =>
    `Hi ${first}, ${orgName} has something on the way for you. Confirm your delivery address: ${url}`,

  addressReminder: (first: string, url: string) =>
    `Hi ${first}, we still need your delivery address for something your team planned. 30 seconds: ${url}`,

  managerNote: (name: string, suggestion: string) =>
    `${name} is being celebrated today. A line from you means a lot. Try: "${suggestion}"`,

  approvalRequest: (amount: string, name: string, label: string, url: string) =>
    `Approve a ${amount} gift for ${name}'s ${label.toLowerCase()}? ${url}`,

  approvalCode: (code: string) =>
    `Your Moments approval code is ${code}. Don't share it.`,

  /** Monday morning, to HR: what's coming and whether anything is stuck. */
  weeklySummary: (orgName: string, items: string[], needsYou: number, url: string) => {
    const shown = items.slice(0, 3).join(", ");
    const more = items.length > 3 ? ` +${items.length - 3} more` : "";
    const lead = items.length ? `${orgName} this week: ${shown}${more}.` : `${orgName}: nothing to celebrate this week.`;
    const ask = needsYou ? ` ${needsYou} ${needsYou === 1 ? "needs" : "need"} you.` : "";
    return `${lead}${ask} ${url}`;
  },

  /** First of the month, to HR: the moments no spreadsheet has. */
  monthlyNews: (orgName: string, url: string) =>
    `Any promotions, weddings, new babies or people leaving at ${orgName} this month? Log it in 20 seconds: ${url}`,
};
