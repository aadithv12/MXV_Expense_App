
import { ExpenseEntry, ExtractedExpenseData } from '../types';

// The actual N8N webhook URL provided by the user.
const N8N_WEBHOOK_URL = 'https://avsmxv.app.n8n.cloud/webhook-test/47d70ffc-5531-4013-98e7-458e703e3e36';
const N8N_OTP_WEBHOOK_URL = 'https://avsmxv.app.n8n.cloud/webhook-test/8e4db7bf-ea4b-40a0-beb3-faa2ea28a3cc';

/**
 * Submits all entries for a report to the N8N webhook as a single JSON array.
 * @param entries The array of expense entries to submit.
 * @param tripIdentifier A unique identifier for the report this entry belongs to.
 * @param currency The currency code for the report (e.g., 'INR', 'USD').
 * @returns A promise that resolves when the submission is complete.
 */
export const submitReportToWebhook = async (
  entries: ExpenseEntry[],
  tripIdentifier: string,
  currency: string
): Promise<void> => {
  console.log(`Submitting ${entries.length} entries for trip ${tripIdentifier} as a single batch.`);

  // Format the payload as a JSON array with specific keys as requested.
  const payload = entries.map(entry => ({
    "Project Code": entry.projectCode,
    "Date": entry.date,
    "Amount": entry.amount,
    "Currency": currency,
    "Merchant": entry.merchant,
    "Expense Category": entry.category,
    "Title": entry.expense_title,
    "Comment": entry.comment,
    "Number of People": entry.numberOfPeople || 1,
  }));

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `Failed to submit report for trip ${tripIdentifier}.`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    console.error(`Error for report ${tripIdentifier}:`, errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`Successfully submitted report for trip ${tripIdentifier}`);
};

/**
 * Sends a 4-digit OTP and the associated expense data to a webhook for override approval.
 * @param otp The 4-digit code to send.
 * @param expenseData The details of the expense requiring override.
 * @param projectCode The selected project code for the expense.
 * @param currency The currency of the expense.
 * @returns A promise that resolves when the OTP is sent.
 */
export const sendOtpToWebhook = async (
  otp: string,
  expenseData: Partial<ExtractedExpenseData>,
  projectCode: string,
  currency: string
): Promise<void> => {
  console.log(`Sending OTP ${otp} to webhook with expense context.`);

  const payload = {
    otp,
    expenseDetails: {
      "Project Code": projectCode,
      "Date": expenseData.date,
      "Amount": expenseData.amount,
      "Currency": currency,
      "Merchant": expenseData.merchant,
      "Expense Category": expenseData.category,
      "Title": expenseData.expense_title,
      "Comment": expenseData.comment,
      "Number of People": expenseData.numberOfPeople || 1,
    }
  };

  const response = await fetch(N8N_OTP_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to send OTP to the approval webhook.');
  }
  console.log('Successfully sent OTP with context.');
};
