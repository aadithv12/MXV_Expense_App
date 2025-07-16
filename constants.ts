import { ExpenseReport, ProjectCode, ExpenseStatus, ExpenseCategory, Currency } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export const PROJECT_CODES: ProjectCode[] = [
  { id: 'PROJ-001', name: 'Project Alpha' },
  { id: 'PROJ-002', name: 'Project Bravo' },
  { id: 'PROJ-003', name: 'Project Charlie' },
  { id: 'MKT-001', name: 'Marketing Campaign Q3' },
  { id: 'R&D-001', name: 'Research & Development' },
];

export const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);

export const INITIAL_EXPENSE_REPORTS: ExpenseReport[] = [
  {
    id: 'rep-1',
    name: 'Mumbai Conference Trip',
    status: ExpenseStatus.OPEN,
    currency: 'INR',
    entries: [
      {
        id: 'ent-1a',
        expense_title: 'Flight (BOM-DEL)',
        merchant: 'Vistara Airlines',
        amount: 7550.75,
        date: '2023-07-20',
        category: ExpenseCategory.TRAVEL,
        receiptImageUrl: 'https://picsum.photos/seed/receipt1/400/600',
        receiptMimeType: 'image/jpeg',
        projectCode: 'PROJ-001',
        comment: 'Flight to Delhi for client meeting.',
        numberOfPeople: 1,
      },
      {
        id: 'ent-1b',
        expense_title: 'Client Dinner at Taj',
        merchant: 'The Taj Mahal Palace',
        amount: 7800.50,
        date: '2023-07-21',
        category: ExpenseCategory.FOOD,
        receiptImageUrl: 'https://picsum.photos/seed/receipt2/400/600',
        receiptMimeType: 'image/jpeg',
        projectCode: 'PROJ-001',
        comment: 'Dinner with client to discuss Q3 project goals.',
        numberOfPeople: 2,
      },
      {
        id: 'ent-1c',
        expense_title: 'Beverages at Namdhari Agro Fresh',
        merchant: 'NAMDHARI AGRO FRESH PVT LTD',
        amount: 310.00,
        date: '2023-07-22',
        category: ExpenseCategory.FOOD,
        receiptImageUrl: 'https://picsum.photos/seed/receipt4/400/600',
        receiptMimeType: 'image/jpeg',
        projectCode: 'PROJ-001',
        comment: 'Water and beverages for the team during conference.',
        numberOfPeople: 1,
      },
    ],
  },
  {
    id: 'rep-2',
    name: 'Team Lunch & Supplies',
    status: ExpenseStatus.OPEN,
    currency: 'INR',
    entries: [],
  },
  {
    id: 'rep-3',
    name: 'Draft Report for Q4 Marketing',
    status: ExpenseStatus.NEW,
    currency: 'USD',
    entries: [],
  },
    {
    id: 'rep-4',
    name: 'Software Subscriptions',
    status: ExpenseStatus.SUBMITTED,
    currency: 'USD',
    entries: [
        {
            id: 'ent-4a',
            expense_title: 'Figma License Renewal',
            merchant: 'Figma Inc.',
            amount: 150.00,
            date: '2023-08-01',
            category: ExpenseCategory.OFFICE,
            receiptImageUrl: 'https://picsum.photos/seed/receipt3/400/600',
            receiptMimeType: 'image/jpeg',
            projectCode: 'R&D-001',
            comment: 'Annual license renewal for the design team.',
            numberOfPeople: 1,
        }
    ]
  }
];