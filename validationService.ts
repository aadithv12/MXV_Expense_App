import { ExtractedExpenseData } from '../types';
import { validateExpenseWithAI } from './aiService';


/**
 * Validates an expense entry by calling the AI validation agent.
 * @param expenseData The data extracted from the receipt.
 * @param imageFile The uploaded receipt image file.
 * @returns A promise that resolves to an array of validation error messages.
 */
export const validateExpense = async (
  expenseData: Partial<ExtractedExpenseData>,
  imageFile: File | null
): Promise<string[]> => {
  // First, perform basic synchronous checks to avoid unnecessary API calls
  if (!imageFile) {
    return ['A supporting invoice/receipt image is required.'];
  }
  
  if (!expenseData.date || !expenseData.amount || !expenseData.category || !expenseData.expense_title || !expenseData.comment?.trim()) {
    return ['All fields are required. Please ensure the AI has extracted all data or fill it in manually.'];
  }

  // If basic checks pass, proceed with AI validation
  try {
    const result = await validateExpenseWithAI(expenseData as ExtractedExpenseData, imageFile);
    if (result.isValid) {
      return []; // No errors
    } else {
      return [result.reason]; // Return the reason for failure from the AI
    }
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred during validation."
      return [message];
  }
};
