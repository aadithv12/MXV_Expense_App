
import React, { useState, useCallback, useMemo } from 'react';
import { ExpenseReport, ExpenseStatus, View, ExpenseEntry, ExtractedExpenseData } from './types';
import { INITIAL_EXPENSE_REPORTS, PROJECT_CODES, CURRENCIES } from './constants';
import ExpenseList from './components/ExpenseList';
import ExpenseDetail from './components/ExpenseDetail';
import NewExpenseEntryForm from './components/NewExpenseEntryForm';
import { submitReportToWebhook } from './services/n8nService';
import { HeaderIcon, PlusIcon, TrashIcon } from './components/common/Icon';
import Modal from './components/common/Modal';

const App: React.FC = () => {
  const [reports, setReports] = useState<ExpenseReport[]>(INITIAL_EXPENSE_REPORTS);
  const [currentView, setCurrentView] = useState<View>(View.LIST);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportCurrency, setNewReportCurrency] = useState(CURRENCIES[0].code);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => reports.find(r => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const handleSelectReport = useCallback((report: ExpenseReport) => {
    // BUG FIX: When a 'New' report is selected, change its status to 'Open' so entries can be added.
    if (report.status === ExpenseStatus.NEW) {
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: ExpenseStatus.OPEN } : r));
    }
    setSelectedReportId(report.id);
    setCurrentView(View.DETAIL);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedReportId(null);
    setCurrentView(View.LIST);
  }, []);

  const handleGoToNewEntry = useCallback(() => {
    setCurrentView(View.NEW_ENTRY);
  }, []);

  const handleOpenNewReportModal = () => {
    setNewReportName('');
    setNewReportCurrency(CURRENCIES[0].code);
    setIsNewReportModalOpen(true);
  };

  const handleConfirmAddReport = () => {
    if (!newReportName.trim()) return;

    const newReport: ExpenseReport = {
      id: `rep-${Date.now()}`,
      name: newReportName.trim(),
      status: ExpenseStatus.NEW,
      currency: newReportCurrency,
      entries: [],
    };
    setReports(prev => [newReport, ...prev]);
    setIsNewReportModalOpen(false);
  };

  const handleRenameReport = (reportId: string, newName: string) => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, name: newName } : r))
    );
  };

  const handleStartDeleteReport = (reportId: string) => {
    setDeletingReportId(reportId);
  };

  const handleConfirmDeleteReport = () => {
    if (!deletingReportId) return;
    setReports(prev => prev.filter(r => r.id !== deletingReportId));
    setDeletingReportId(null);
  };
  
  const handleCancelDelete = () => {
    setDeletingReportId(null);
  };
  
  const handleSaveNewEntry = (imageFile: File, projectCode: string, expenseData: ExtractedExpenseData) => {
    if (!selectedReportId) return;

    const newEntry: ExpenseEntry = {
      id: `ent-${Date.now()}`,
      ...expenseData,
      receiptImageUrl: URL.createObjectURL(imageFile),
      receiptMimeType: imageFile.type,
      projectCode,
    };
    
    setReports(prev =>
      prev.map(r =>
        r.id === selectedReportId
          ? { ...r, entries: [...r.entries, newEntry], status: ExpenseStatus.OPEN }
          : r
      )
    );
    
    setCurrentView(View.DETAIL);
  };
  
  const handleSubmitReport = async () => {
    if (!selectedReport || selectedReport.entries.length === 0) return;

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      await submitReportToWebhook(selectedReport.entries, selectedReport.id, selectedReport.currency);

      setReports(prev =>
        prev.map(r =>
          r.id === selectedReport.id ? { ...r, status: ExpenseStatus.SUBMITTED } : r
        )
      );
      
      handleBackToList();
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'An unknown error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReports = useMemo(() => reports.filter(r => r.status === ExpenseStatus.OPEN), [reports]);
  const newReports = useMemo(() => reports.filter(r => r.status === ExpenseStatus.NEW), [reports]);
  const submittedReports = useMemo(() => reports.filter(r => r.status === ExpenseStatus.SUBMITTED), [reports]);

  const renderContent = () => {
    switch (currentView) {
      case View.DETAIL:
        return selectedReport && (
          <ExpenseDetail
            report={selectedReport}
            onBack={handleBackToList}
            onAddNewEntry={handleGoToNewEntry}
            onSubmitReport={handleSubmitReport}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
          />
        );
      case View.NEW_ENTRY:
        return selectedReport && (
          <NewExpenseEntryForm
            reportName={selectedReport.name}
            reportCurrency={selectedReport.currency}
            projectCodes={PROJECT_CODES}
            onSave={handleSaveNewEntry}
            onBack={() => setCurrentView(View.DETAIL)}
          />
        );
      case View.LIST:
      default:
        return (
          <>
            <ExpenseList
              title="Open Reports"
              reports={openReports}
              onSelectReport={handleSelectReport}
              onRenameReport={handleRenameReport}
              onDeleteReport={handleStartDeleteReport}
            />
            <ExpenseList
              title="Draft Reports"
              reports={newReports}
              onSelectReport={handleSelectReport}
              onRenameReport={handleRenameReport}
              onDeleteReport={handleStartDeleteReport}
            />
            <ExpenseList
              title="Submitted Reports"
              reports={submittedReports}
              onSelectReport={handleSelectReport}
              onRenameReport={handleRenameReport}
              onDeleteReport={handleStartDeleteReport}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <HeaderIcon />
              <h1 className="text-2xl font-bold text-slate-900">Expense Manager</h1>
            </div>
            {currentView === View.LIST && (
              <button
                onClick={handleOpenNewReportModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
              >
                <PlusIcon />
                New Report
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {isNewReportModalOpen && (
        <Modal onClose={() => setIsNewReportModalOpen(false)} title="Create New Expense Report">
          <div className="space-y-4">
            <div>
              <label htmlFor="report-name" className="block text-sm font-medium text-slate-700">Report Name</label>
              <input
                type="text"
                id="report-name"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Q4 Client Visit"
              />
            </div>
            <div>
              <label htmlFor="report-currency" className="block text-sm font-medium text-slate-700">Currency</label>
              <select
                id="report-currency"
                value={newReportCurrency}
                onChange={(e) => setNewReportCurrency(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-slate-900 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm rounded-md"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setIsNewReportModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
              <button onClick={handleConfirmAddReport} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition" disabled={!newReportName.trim()}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {deletingReportId && (
        <Modal onClose={handleCancelDelete} title="Confirm Deletion">
          <div className="space-y-4">
            <p className="text-slate-600">Are you sure you want to delete this report? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={handleCancelDelete} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
              <button onClick={handleConfirmDeleteReport} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center gap-2">
                  <TrashIcon className="w-4 h-4"/> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default App;