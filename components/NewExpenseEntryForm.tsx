



import React, { useState, useEffect } from 'react';
import { ProjectCode, ExtractedExpenseData, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES, CURRENCIES } from '../constants';
import { BackIcon, UploadIcon, AiIcon, AlertIcon, InfoIcon, DocumentIcon } from './common/Icon';
import Spinner from './common/Spinner';
import { extractExpenseDetailsFromImage } from '../services/aiService';
import { validateExpense } from '../services/validationService';
import { sendOtpToWebhook } from '../services/n8nService';
import { Tooltip } from './common/Tooltip';

interface NewExpenseEntryFormProps {
  reportName: string;
  reportCurrency: string;
  projectCodes: ProjectCode[];
  onSave: (imageFile: File, projectCode: string, expenseData: ExtractedExpenseData) => void;
  onBack: () => void;
}

type FormState = 'idle' | 'extracting' | 'validating' | 'ready' | 'error';

const NewExpenseEntryForm: React.FC<NewExpenseEntryFormProps> = ({
  reportName,
  reportCurrency,
  projectCodes,
  onSave,
  onBack,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [projectCode, setProjectCode] = useState<string>(projectCodes[0]?.id || '');
  
  const [formState, setFormState] = useState<FormState>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<ExtractedExpenseData>>({});

  // OTP Override State
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [userOtp, setUserOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [overrideActive, setOverrideActive] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === reportCurrency)?.symbol || reportCurrency;
  
  // Auto-verify OTP when user enters 4 digits
  useEffect(() => {
    if (userOtp.length === 4 && generatedOtp) {
      if (userOtp === generatedOtp) {
        setOverrideActive(true);
        setOtpError(null);
      } else {
        setOverrideActive(false);
        setOtpError('Invalid OTP. Please try again.');
        setUserOtp(''); // Clear the input for retry
      }
    }
  }, [userOtp, generatedOtp]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setFormState('error');
        setFormError('Please select a valid image or PDF file.');
        return;
      }
      setImageFile(file);
      
      if (file.type.startsWith('image/')) {
        setImagePreview(URL.createObjectURL(file));
      } else {
        setImagePreview(null); // No image preview for PDF
      }

      setFormState('extracting');
      setFormError(null);
      setValidationErrors([]);
      setFormData({});
      // Reset override state on new file upload
      setOverrideActive(false);
      setGeneratedOtp(null);
      setUserOtp('');
      setOtpError(null);

      try {
        const data = await extractExpenseDetailsFromImage(file);
        setFormData(data);
        
        setFormState('validating');
        const validationResults = await validateExpense(data, file);
        setValidationErrors(validationResults);
        
        setFormState('ready');

      } catch (err) {
        setFormState('error');
        setFormError(err instanceof Error ? err.message : 'Failed to analyze receipt. Please fill details manually.');
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            merchant: '',
            expense_title: '',
            category: ExpenseCategory.OFFICE,
            comment: '',
            numberOfPeople: 1,
        });
      }
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number | ExpenseCategory = value;

    if (name === 'amount') {
        parsedValue = parseFloat(value) || 0;
    } else if (name === 'numberOfPeople') {
        parsedValue = parseInt(value, 10) || 1;
    }

    setFormData(prev => ({ ...prev, [name]: parsedValue }));

    if (overrideActive) {
      setOverrideActive(false);
      setGeneratedOtp(null);
      setUserOtp('');
      setOtpError(null); // Quietly reset
    }
  };

  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    setOtpError(null);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp); // Show the input field immediately

    try {
      await sendOtpToWebhook(otp, formData, projectCode, reportCurrency);
      // On success, do nothing, the UI is already showing the input field.
    } catch (err) {
      // On failure, set an error but KEEP the OTP input field visible.
      const errorMessage = err instanceof Error ? err.message : 'Could not send OTP to webhook.';
      setOtpError(`Error: ${errorMessage} Please check the webhook connection and try again.`);
      // We intentionally do not setGeneratedOtp(null) here, to prevent the UI from flickering.
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageFile || formState === 'extracting' || formState === 'validating') return;
    
    // Do not re-validate if override is active
    if (!overrideActive) {
        setFormState('validating');
        setFormError(null);
        setValidationErrors([]);
        
        const finalValidationErrors = await validateExpense(formData, imageFile);
        setValidationErrors(finalValidationErrors);

        if (finalValidationErrors.length > 0) {
            setFormState('ready'); // Go back to ready state to show errors
            return;
        }
    }

    onSave(imageFile, projectCode, formData as ExtractedExpenseData);
  };
  
  const showPeopleCount = formData.category === ExpenseCategory.FOOD || formData.category === ExpenseCategory.TRAVEL;

  const renderFormFields = () => (
    <div className="space-y-4">
      <div>
        <Tooltip text="Must follow naming conventions like 'Flight (BLR-MAA)' or 'Meal at...'">
            <label htmlFor="expense_title" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Expense Title</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
            </label>
        </Tooltip>
        <input type="text" name="expense_title" id="expense_title" value={formData.expense_title || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <Tooltip text="The total amount from the receipt, including taxes and fees.">
            <label htmlFor="amount" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Amount ({currencySymbol})</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
            </label>
           </Tooltip>
          <input type="number" name="amount" id="amount" value={formData.amount || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" step="0.01" />
        </div>
        <div>
          <Tooltip text="The date the expense was incurred, as shown on the receipt.">
            <label htmlFor="date" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Date</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
            </label>
          </Tooltip>
          <input type="date" name="date" id="date" value={formData.date || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" />
        </div>
      </div>
      <div>
        <Tooltip text="The name of the vendor, restaurant, or service provider.">
            <label htmlFor="merchant" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Merchant</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
            </label>
        </Tooltip>
        <input type="text" name="merchant" id="merchant" value={formData.merchant || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Tooltip text="Select the category that best describes this expense.">
              <label htmlFor="category" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Category</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
              </label>
            </Tooltip>
            <select id="category" name="category" value={formData.category || ''} onChange={handleFormChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-900 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-md">
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
        {showPeopleCount && (
            <div>
              <Tooltip text="For shared expenses like meals or taxis, enter the total number of people.">
                <label htmlFor="numberOfPeople" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                    <span>Number of People</span>
                    <InfoIcon className="w-4 h-4 text-slate-400" />
                </label>
              </Tooltip>
              <input type="number" name="numberOfPeople" id="numberOfPeople" value={formData.numberOfPeople || 1} onChange={handleFormChange} min="1" className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" />
            </div>
        )}
      </div>

       <div>
          <Tooltip text="Select the project this expense should be billed against.">
            <label htmlFor="project-code" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                <span>Project Code</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
            </label>
          </Tooltip>
          <select id="project-code" name="project-code" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-900 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-md">
            {projectCodes.map(pc => <option key={pc.id} value={pc.id}>{pc.name} ({pc.id})</option>)}
          </select>
       </div>
       <div>
            <Tooltip text="A brief but clear description of the expense is mandatory (e.g., 'Lunch with Client X to discuss Project Y').">
                <label htmlFor="comment" className="flex items-center space-x-1.5 text-sm font-medium text-slate-700">
                    <span>Comment</span>
                    <InfoIcon className="w-4 h-4 text-slate-400" />
                </label>
            </Tooltip>
            <textarea name="comment" id="comment" value={formData.comment || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" placeholder="Describe the purpose of this expense..." />
       </div>
    </div>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-4xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors mb-4">
        <BackIcon className="mr-2" />
        Back to Report
      </button>
      <h2 className="text-2xl font-bold text-slate-800">Add New Entry</h2>
      <p className="text-slate-500 mb-6">For report: <span className="font-semibold">{reportName}</span></p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {formState === 'idle' && (
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">1. Upload Receipt</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,application/pdf" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>
          </div>
        )}

        {formState !== 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side: Image and Status */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Receipt Preview</label>
              {imagePreview ? (
                  <img src={imagePreview} alt="Receipt Preview" className="w-full h-auto rounded-lg shadow-md" />
              ) : imageFile && imageFile.type === 'application/pdf' ? (
                  <div className="p-4 bg-slate-100 rounded-lg flex items-center gap-4 border border-slate-200">
                      <DocumentIcon className="w-12 h-12 text-red-500 flex-shrink-0" />
                      <div>
                          <p className="font-semibold text-slate-700">PDF Document</p>
                          <p className="text-sm text-slate-500 truncate" title={imageFile.name}>{imageFile.name}</p>
                      </div>
                  </div>
              ) : null}
              {formState === 'extracting' && (
                <div className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg">
                  <AiIcon className="animate-pulse mr-3"/> Analyzing receipt with AI...
                </div>
              )}
              {formState === 'validating' && (
                <div className="flex items-center justify-center p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                  <Spinner/> Checking against expense policy...
                </div>
              )}
            </div>
            {/* Right side: Form */}
            <div className="space-y-4">
              {(formState === 'ready' || formState === 'validating' || formState === 'error') && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                  {formState === 'error' ? 'Enter Details Manually' : 'Confirm Extracted Details'}
                  </h3>
                  {renderFormFields()}
                </>
              )}
            </div>
          </div>
        )}
        
        {formError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {formError}
            </div>
        )}
        
        {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 mt-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">This expense violates company policy:</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                                {validationErrors.map((error, i) => <li key={i}>{error}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
                {/* OTP Override Section */}
                <div className="mt-4 pt-4 border-t border-red-200">
                    {overrideActive ? (
                        <div className="text-sm font-bold text-green-700">
                            Override Successful! You can now save the entry.
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-slate-700">Need to save this anyway? Request an override from your Project Leader.</p>
                            {!generatedOtp ? (
                                <button
                                    type="button"
                                    onClick={handleRequestOtp}
                                    disabled={isSendingOtp}
                                    className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 disabled:bg-slate-400 transition"
                                >
                                    {isSendingOtp ? <Spinner/> : 'Request Override OTP'}
                                </button>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    <p className="text-sm text-green-700">An OTP has been sent to the Project Leader for approval.</p>
                                    <div>
                                        <label htmlFor="otp-input" className="block text-sm font-medium text-slate-700">Enter 4-Digit OTP</label>
                                        <input
                                            type="text"
                                            id="otp-input"
                                            value={userOtp}
                                            onChange={(e) => setUserOtp(e.target.value)}
                                            maxLength={4}
                                            placeholder="1234"
                                            className="mt-1 w-32 px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    {otpError && <p className="text-sm text-red-600">{otpError}</p>}
                                </div>
                            )}
                            {/* Show error from webhook sending itself */}
                            {!generatedOtp && otpError && <p className="mt-2 text-sm text-red-600">{otpError}</p>}
                        </>
                    )}
                </div>
            </div>
        )}

        {(formState === 'ready' || formState === 'error' ) && (
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={(validationErrors.length > 0 && !overrideActive)}
              className="w-full sm:w-auto flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              Save Entry
            </button>
          </div>
        )}

        {formState === 'validating' && (
            <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled
              className="w-full sm:w-auto flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-400 cursor-not-allowed"
            >
              <Spinner/> Validating...
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default NewExpenseEntryForm;