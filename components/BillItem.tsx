import React, { useState } from 'react';
import { Bill, SummaryState } from '../types';
import { SparklesIcon } from './Icons';
import Spinner from './Spinner';

interface BillItemProps {
  bill: Bill;
  summaryState: SummaryState | undefined;
  onGetSummary: (bill: Bill) => void;
  isAiEnabled: boolean;
}

const BillItem: React.FC<BillItemProps> = ({ bill, summaryState, onGetSummary, isAiEnabled }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleSummary = () => {
    // If we haven't fetched the summary yet, fetch it.
    if (!summaryState) {
      onGetSummary(bill);
    }
    // Toggle the visibility
    setIsExpanded(!isExpanded);
  }

  return (
    <li className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{bill.BILL_NAME || '(의안명 없음)'}</p>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-medium">{bill.BILL_KIND}</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">{bill.PROC_RESULT_CD}</span>
            <span>|</span>
            <span>ID: {bill.BILL_ID || bill.BILL_NO}</span>
            {bill.LINK_URL && (
              <>
                <span>|</span>
                <a href={bill.LINK_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">상세보기</a>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={handleToggleSummary}
          disabled={summaryState?.isLoading}
          className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          { isAiEnabled && <SparklesIcon className="w-4 h-4 mr-1.5 text-yellow-500" /> }
          { summaryState?.isLoading ? '로딩중...' : (isExpanded ? '요약 닫기' : '요약 보기') }
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          {summaryState?.isLoading && <Spinner size="sm" />}
          {summaryState?.error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{summaryState.error}</p>}
          {summaryState?.summary && (
            <div className="text-sm max-w-none text-slate-600 whitespace-pre-wrap">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                {isAiEnabled ? <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" /> : null}
                {isAiEnabled ? 'AI 요약' : '내용 미리보기'}
              </h4>
              <p className="p-3 bg-slate-50 rounded-md">{summaryState.summary}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

export default BillItem;
