import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedExpenseData, ExpenseCategory } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const billCheckerPrompt = `
Data required to be pulled:
1. **date** – the date of the expense (YYYY-MM-DD).  
2. **amount** – the total billed amount, as a number.  
3. **merchant** – the restaurant, operator, or vendor name.  
4. **expense_title** – a human-readable label using our standardized naming conventions, for example:  
   - “Meal (Breakfast) at Maa Airport”  
   - “Taxi (to) Hyd airport”  
   - “Flight (Hyd-Maa)”  
   - “Auto to Jubilee Hills”  
   - “Hotel stay (01-02 Sep)”  
5. **category** – one of: **Food Expense**, **Travel**, **Accommodation**, or **Other office expenses**.
6. **comment** - A meaningful description of the expense. This is mandatory.
7. **numberOfPeople** - If this is a shared expense like a meal or a taxi, extract the number of people involved. If not specified or not applicable, return 1.

Instructions:
- Analyze the provided receipt image.
- Identify the transaction date and format it as YYYY-MM-DD.
- Extract the exact total billed amount as a number, without currency symbols or commas.
- Detect the merchant/operator name.
- Create expense_title by mapping the bill type to one of the examples.
- Assign category based on the type.
- Generate a concise but descriptive comment for the expense.
- Determine the number of people for shared expenses. Default to 1.
- Return the data as a JSON object. If a value cannot be determined, use a default (empty string, 0, 1 for people).
`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: 'The date of the expense in YYYY-MM-DD format.' },
        amount: { type: Type.NUMBER, description: 'The total billed amount as a number.' },
        merchant: { type: Type.STRING, description: 'The name of the vendor or merchant.' },
        expense_title: { type: Type.STRING, description: 'A standardized, human-readable title for the expense.' },
        category: { type: Type.STRING, enum: Object.values(ExpenseCategory) },
        comment: { type: Type.STRING, description: 'A meaningful comment describing the purpose of the expense.' },
        numberOfPeople: { type: Type.INTEGER, description: 'Number of people sharing the expense. Defaults to 1.' },
    },
    required: ['date', 'amount', 'merchant', 'expense_title', 'category', 'comment', 'numberOfPeople'],
};

export const extractExpenseDetailsFromImage = async (imageFile: File): Promise<ExtractedExpenseData> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: billCheckerPrompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonString = response.text;
        const parsedJson = JSON.parse(jsonString);

        if (!Object.values(ExpenseCategory).includes(parsedJson.category)) {
            console.warn(`AI returned invalid category: ${parsedJson.category}. Defaulting to 'Other'.`);
            parsedJson.category = ExpenseCategory.OFFICE;
        }
        
        // Ensure amount is a number
        parsedJson.amount = Number(parsedJson.amount) || 0;
        parsedJson.numberOfPeople = Number(parsedJson.numberOfPeople) || 1;
        parsedJson.comment = parsedJson.comment || '';

        return parsedJson as ExtractedExpenseData;

    } catch (error) {
        console.error("Error extracting expense details from Gemini:", error);
        throw new Error("Could not analyze the receipt. Please check the console for details and enter the information manually.");
    }
};

const validationPrompt = `
You are an Expense Validation Agent. Your task is to check if a given expense, based on its extracted data and receipt image, complies with the company's expense policy.

**Expense Policy Rules:**

1.  **Timeliness & Documentation**
    *   **Monthly cutoff:** The expense must be filed before the last day of the month it was incurred. The current date is ${new Date().toISOString().split('T')[0]}.
    *   **Invoice Required:** The receipt image must be a proper invoice. UPI/CC statements alone are not sufficient.
    
2.  **GST Usage**
    *   For 'Accommodation' (hotels) and 'Travel' (flights), the invoice in the image **must** show the company GST #: "29AADPG5907F1ZU".

3.  **Flights**
    *   **Class:** Must be Economy. Assume it is unless the receipt explicitly states otherwise (Business, First Class).
    *   **Cost cap:** Short-haul (e.g., BLR–MAA) should be ₹2,000–5,000; medium-haul (e.g., BLR–DEL) should be ₹4,000–8,000. Reject if the amount seems excessively high (e.g., > ₹12,000) for a domestic flight.
    *   **Add-ons:** Meal charges up to ₹500 and seat fees up to ₹500 are acceptable within the total.

4.  **Local Conveyance (Taxis, Autos)**
    *   Autos are only allowed if the amount is less than ₹500.

5.  **Meals**
    *   **Limits:** The cost per person (amount / numberOfPeople) must not exceed ₹500.
    *   **Disallowed Items:** Tobacco items are strictly disallowed. Check the receipt for items like cigarettes, tobacco, etc.

6.  **Hotels**
    *   **Budget:** Cost per night cannot exceed ₹5,000 (including GST).
    *   **Eligibility:** Must be for multi-day trips. This is hard to verify here, so focus on the budget.

7.  **Filing Standards**
    *   **Expense Title:** Must follow standard templates (e.g., “Meal (Lunch) at...”, “Taxi to...”, “Flight (HYD–MAA)”, “Hotel stay (DD-DD Mon)”). Check if the title is reasonably formatted.

**Your Task:**
Review the provided expense JSON data and the receipt image. Determine if the expense is valid according to the rules above.

**Output:**
Respond with a JSON object with two fields:
- "isValid": boolean (true if it passes all checks, false otherwise).
- "reason": string (If "isValid" is false, provide a single, clear, user-friendly reason for the rejection. If "isValid" is true, this should be "Expense is compliant.").
`;

const validationResponseSchema = {
    type: Type.OBJECT,
    properties: {
        isValid: { type: Type.BOOLEAN, description: 'Whether the expense is valid or not.' },
        reason: { type: Type.STRING, description: 'The reason for validation failure, or a success message.' },
    },
    required: ['isValid', 'reason'],
};


/**
 * Validates an expense against company policy using an AI agent.
 * @param expenseData The data extracted from the receipt.
 * @param imageFile The receipt image file.
 * @returns A promise that resolves to an object with `isValid` and `reason`.
 */
export const validateExpenseWithAI = async (
    expenseData: ExtractedExpenseData,
    imageFile: File
): Promise<{ isValid: boolean; reason: string }> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const expenseDataPart = { text: `Expense Data JSON: ${JSON.stringify(expenseData)}` };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [imagePart, { text: validationPrompt }, expenseDataPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: validationResponseSchema,
            },
        });

        const jsonString = response.text;
        return JSON.parse(jsonString) as { isValid: boolean; reason: string };

    } catch (error) {
        console.error("Error during AI validation:", error);
        // Default to a failed validation in case of an error to be safe.
        return {
            isValid: false,
            reason: "Could not perform AI validation due to a system error. Please try again."
        };
    }
};
