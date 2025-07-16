export enum ExpenseStatus {
  OPEN = 'OPEN',
  NEW = 'NEW',
  SUBMITTED = 'SUBMITTED',
}

export enum ExpenseCategory {
  FOOD = 'Food Expense',
  TRAVEL = 'Travel',
  ACCOMMODATION = 'Accommodation',
  OFFICE = 'Other office expenses',
}

// Represents the data extracted by the AI or entered by the user.
export interface ExtractedExpenseData {
  date: string;
  amount: number;
  merchant: string;
  expense_title: string;
  category: ExpenseCategory;
  comment: string; // Mandatory comment
  numberOfPeople?: number; // Optional, for meals/travel
}

export interface ExpenseEntry extends ExtractedExpenseData {
  id: string;
  receiptImageUrl: string;
  receiptMimeType: string;
  projectCode: string;
}

export interface ExpenseReport {
  id:string;
  name: string;
  status: ExpenseStatus;
  entries: ExpenseEntry[];
  currency: string; // e.g., 'INR', 'USD'
}

export interface ProjectCode {
  id: string;
  name: string;
}

export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

export enum View {
  LIST = 'LIST',
  DETAIL = 'DETAIL',
  NEW_ENTRY = 'NEW_ENTRY',
}