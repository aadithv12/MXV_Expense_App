import React from 'react';
import { ExpenseReport, ExpenseStatus, ExpenseEntry } from '../types';
import { BackIcon, PlusIcon, CheckCircleIcon, DocumentIcon } from './common/Icon';
import Spinner from './common/Spinner';
import { CURRENCIES } from '../constants';

interface ExpenseDetailProps {
  report: ExpenseReport;
  onBack: () => void;
  onAddNewEntry: () => void;
  onSubmitReport: () => Promise<void>;
  isSubmitting: boolean;
  submissionError: string | null;
}

const getCurrencySymbol = (currencyCode: string) => {
    return CURRENCIES.find(c => c.code === currencyCode)?.symbol || currencyCode;
}

const getEmojiForExpense = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('flight')) return '✈️';
    if (lowerTitle.includes('taxi') || lowerTitle.includes('auto')) return '🚕';
    if (lowerTitle.includes('meal') || lowerTitle.includes('dinner') || lowerTitle.includes('lunch') || lowerTitle.includes('breakfast') || lowerTitle.includes('beverages')) return '🍔';
    if (lowerTitle.includes('hotel')) return '🏨';
    if (lowerTitle.includes('subscription') || lowerTitle.includes('license')) return '💻';
    if (lowerTitle.includes('supplies') || lowerTitle.includes('office')) return '📎';
    return '🧾'; // Default
};

const ReceiptPreview: React.FC<{ entry: ExpenseEntry }> = ({ entry }) => {
    if (entry.receiptMimeType.startsWith('image/')) {
        return <img src={entry.receiptImageUrl} alt="Receipt" className="w-20 h-20 object-cover rounded-md bg-slate-100 flex-shrink-0"/>;
    }
    if (entry.receiptMimeType === 'application/pdf') {
        return (
            <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="w-20 h-20 bg-slate-100 rounded-md flex flex-col items-center justify-center text-center p-2 hover:bg-slate-200 transition-colors">
                <DocumentIcon className="w-8 h-8 text-red-500 mb-1" />
                <span className="text-xs font-semibold text-slate-700">View PDF</span>
            </a>
        );
    }
    // Fallback for other types or missing data
    return (
        <div className="w-20 h-20 bg-slate-100 rounded-md flex items-center justify-center">
            <DocumentIcon className="w-8 h-8 text-slate-400" />
        </div>
    );
};


const ExpenseDetail: React.FC<ExpenseDetailProps> = ({ report, onBack, onAddNewEntry, onSubmitReport, isSubmitting, submissionError }) => {
  const totalAmount = report.entries.reduce((sum, entry) => sum + entry.amount, 0);
  const currencySymbol = getCurrencySymbol(report.currency);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg animate-fade-in">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors mb-2">
            <BackIcon className="mr-2" />
            Back to List
          </button>
          <h2 className="text-3xl font-bold text-slate-900">{report.name}</h2>
          <p className="text-slate-500 mt-1">{report.entries.length} {report.entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div className="flex items-center space-x-3 flex-shrink-0">
          {report.status === ExpenseStatus.OPEN && (
            <button
              onClick={onAddNewEntry}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
            >
              <PlusIcon />
              Add Entry
            </button>
          )}
          {report.status === ExpenseStatus.OPEN && report.entries.length > 0 && (
            <button
              onClick={onSubmitReport}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Spinner/> : <CheckCircleIcon className="w-5 h-5"/>}
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          )}
        </div>
      </div>
      
      {submissionError && (
        <div className="my-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            <strong>Submission Failed:</strong> {submissionError}
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-lg mb-6">
        <p className="text-sm font-medium text-slate-600">Total Amount</p>
        <p className="text-3xl font-bold text-slate-800">{currencySymbol}{totalAmount.toFixed(2)}</p>
      </div>

      <h3 className="text-lg font-semibold text-slate-700 mb-4">Entries</h3>
      {report.entries.length > 0 ? (
        <ul className="space-y-4">
          {report.entries.map(entry => (
            <li key={entry.id} className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm flex items-start gap-4">
              <ReceiptPreview entry={entry} />
              
              <div className="flex-grow">
                <p className="font-semibold text-slate-800 text-lg flex items-center">
                  <span className="text-2xl mr-3 w-8 text-center">{getEmojiForExpense(entry.expense_title)}</span>
                  {entry.expense_title}
                </p>
                
                {entry.comment && (
                    <p className="mt-2 pl-11 text-sm text-slate-600 italic">"{entry.comment}"</p>
                )}

                <div className="mt-2 pl-11 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <p><strong className="font-medium text-slate-500">Merchant:</strong> {entry.merchant}</p>
                  <p><strong className="font-medium text-slate-500">Date:</strong> {entry.date}</p>
                  <p><strong className="font-medium text-slate-500">Category:</strong> {entry.category}</p>
                  <p><strong className="font-medium text-slate-500">Project:</strong> {entry.projectCode}</p>
                   {entry.numberOfPeople && entry.numberOfPeople > 1 && (
                    <p className="col-span-full"><strong className="font-medium text-slate-500">Shared by:</strong> {entry.numberOfPeople} people</p>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-bold text-xl text-slate-900">{currencySymbol}{entry.amount.toFixed(2)}</p>
                <a href={entry.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-end text-sm font-medium text-blue-600 hover:underline">
                  <DocumentIcon className="w-4 h-4 mr-1.5"/> View Receipt
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 rounded-lg">
          <p className="text-slate-500">No entries have been added to this report yet.</p>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetail;