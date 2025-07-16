
import React, { useState, useEffect, useRef } from 'react';
import { ExpenseReport, ExpenseStatus } from '../types';
import { EditIcon, DocumentIcon, CheckCircleIcon, ClockIcon, ThreeDotsIcon, TrashIcon } from './common/Icon';
import Modal from './common/Modal';

interface ExpenseListProps {
  title: string;
  reports: ExpenseReport[];
  onSelectReport: (report: ExpenseReport) => void;
  onRenameReport: (reportId: string, newName: string) => void;
  onDeleteReport: (reportId: string) => void;
}

const StatusIndicator: React.FC<{ status: ExpenseStatus }> = ({ status }) => {
  switch (status) {
    case ExpenseStatus.OPEN:
      return <div className="flex items-center text-sm text-blue-600"><ClockIcon className="w-4 h-4 mr-1.5" /> Open</div>;
    case ExpenseStatus.NEW:
      return <div className="flex items-center text-sm text-amber-600"><DocumentIcon className="w-4 h-4 mr-1.5" /> Draft</div>;
    case ExpenseStatus.SUBMITTED:
      return <div className="flex items-center text-sm text-green-600"><CheckCircleIcon className="w-4 h-4 mr-1.5" /> Submitted</div>;
    default:
      return null;
  }
};

const ExpenseList: React.FC<ExpenseListProps> = ({ title, reports, onSelectReport, onRenameReport, onDeleteReport }) => {
  const [renamingReport, setRenamingReport] = useState<ExpenseReport | null>(null);
  const [newName, setNewName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStartRename = (report: ExpenseReport) => {
    setActiveMenuId(null);
    setRenamingReport(report);
    setNewName(report.name);
  };

  const handleConfirmRename = () => {
    if (renamingReport && newName.trim()) {
      onRenameReport(renamingReport.id, newName.trim());
      setRenamingReport(null);
      setNewName('');
    }
  };
  
  const handleToggleMenu = (reportId: string) => {
    setActiveMenuId(prevId => (prevId === reportId ? null : reportId));
  };

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-slate-700 mb-4 pb-2 border-b border-slate-300">{title}</h2>
      {reports.length === 0 ? (
        <div className="text-center py-10 px-6 bg-white rounded-lg shadow">
          <p className="text-slate-500">No reports in this category.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map(report => (
            <li key={report.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-slate-800 truncate">{report.name}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <StatusIndicator status={report.status} />
                    <p className="text-sm text-slate-500">{report.entries.length} {report.entries.length === 1 ? 'entry' : 'entries'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button onClick={() => onSelectReport(report)} aria-label="View Report" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors">
                    <EditIcon />
                  </button>
                  { report.status !== ExpenseStatus.SUBMITTED && (
                  <div className="relative" ref={activeMenuId === report.id ? menuRef : null}>
                    <button onClick={() => handleToggleMenu(report.id)} aria-label="More options" className="p-2 text-slate-500 hover:text-gray-700 hover:bg-slate-100 rounded-full transition-colors">
                      <ThreeDotsIcon />
                    </button>
                    {activeMenuId === report.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
                        <button onClick={() => handleStartRename(report)} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                          <EditIcon className="w-4 h-4 mr-3" />
                          Rename
                        </button>
                        <button onClick={() => { onDeleteReport(report.id); setActiveMenuId(null); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
                          <TrashIcon className="w-4 h-4 mr-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {renamingReport && (
        <Modal onClose={() => setRenamingReport(null)} title="Rename Report">
          <div className="space-y-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-white text-slate-900 border border-blue-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new report name"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setRenamingReport(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition">Cancel</button>
              <button onClick={handleConfirmRename} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExpenseList;
