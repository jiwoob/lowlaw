import React, { useState, useEffect, useCallback } from 'react';
import { ApiMode, Bill, SummaryStatus } from './types';
import { fetchAllPassedBills, fetchBillSummaryText, fetchRecentPassedBillDates, fetchBillProclamationDate } from './services/api';
import { summarizeText } from './services/ai';
import { downloadBillsAsCSV } from './utils/csv';
import { DownloadIcon, ExternalLinkIcon, SparklesIcon } from './components/Icons';
import Spinner from './components/Spinner';

// Hardcoded settings to hide configuration from the user
const API_KEY = '9a531d7e2ab74b81b7bd2043272da4cd';
const MODE: ApiMode = ApiMode.PROXY;
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [groupedDates, setGroupedDates] = useState<Record<string, number[]>>({});
  const [isDatesLoading, setIsDatesLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryStatus, setSummaryStatus] = useState<Record<string, SummaryStatus>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiSummaryStatus, setAiSummaryStatus] = useState<Record<string, SummaryStatus>>({});
  const [proclamationDates, setProclamationDates] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const loadAvailableDates = async () => {
      setIsDatesLoading(true);
      try {
        const dates = await fetchRecentPassedBillDates(MODE, { apiKey: API_KEY, proxyUrl: PROXY_URL });
        
        const groups: Record<string, number[]> = {};
        dates.forEach(dateStr => { // dateStr is 'YYYY-MM-DD'
          const [year, month, day] = dateStr.split('-');
          const monthKey = `${year}-${month}`; // e.g., '2024-10'
          if (!groups[monthKey]) {
            groups[monthKey] = [];
          }
          groups[monthKey].push(parseInt(day, 10));
        });

        // Sort days within each month, descending
        for (const key in groups) {
            groups[key].sort((a, b) => b - a);
        }

        setGroupedDates(groups);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`가결일 목록을 불러오는 데 실패했습니다: ${errorMessage}`);
      } finally {
        setIsDatesLoading(false);
      }
    };
    loadAvailableDates();
  }, []);

  const handleDateSelect = useCallback(async (date: string) => {
    setSelectedDate(date);
    setIsLoading(true);
    setError('');
    setBills([]);
    setSummaries({});
    setSummaryStatus({});
    setSummaryErrors({});
    setAiSummaries({});
    setAiSummaryStatus({});
    setProclamationDates({});

    try {
      const fetchedBills = await fetchAllPassedBills(date, MODE, { apiKey: API_KEY, proxyUrl: PROXY_URL });
      fetchedBills.sort((a, b) => (a.BILL_NAME || '').localeCompare(b.BILL_NAME || ''));
      setBills(fetchedBills);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bills.length === 0) return;

    const fetchSummaries = async () => {
      const initialStatus: Record<string, SummaryStatus> = {};
      bills.forEach(bill => {
        const key = bill.BILL_ID || bill.BILL_NO;
        if (!key) initialStatus[key] = 'unavailable';
        else initialStatus[key] = 'loading';
      });
      setSummaryStatus(initialStatus);
      setSummaries({});
      setSummaryErrors({});

      for (const bill of bills) {
        const key = bill.BILL_ID || bill.BILL_NO;
        if (initialStatus[key] === 'unavailable' || !key) continue;
        
        try {
          const summary = await fetchBillSummaryText(bill, MODE, { apiKey: API_KEY, proxyUrl: PROXY_URL });
          setSummaries(prev => ({ ...prev, [key]: summary }));
          setSummaryStatus(prev => ({ ...prev, [key]: 'loaded' }));
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`Failed to fetch summary for bill ${key}`, e);
          setSummaryStatus(prev => ({ ...prev, [key]: 'error' }));
          setSummaryErrors(prev => ({ ...prev, [key]: errorMessage }));
        }
      }
    };

    const fetchProclamationDates = async () => {
      for (const bill of bills) {
        const key = bill.BILL_ID || bill.BILL_NO;
        if (!bill.BILL_NO) continue;

        try {
          const date = await fetchBillProclamationDate(bill, MODE, { apiKey: API_KEY, proxyUrl: PROXY_URL });
          setProclamationDates(prev => ({ ...prev, [key]: date }));
        } catch (e) {
          console.warn(`Could not fetch proclamation date for bill ${key}:`, e);
          setProclamationDates(prev => ({ ...prev, [key]: null }));
        }
      }
    };

    fetchSummaries();
    fetchProclamationDates();
  }, [bills]);
  
  const handleGenerateAiSummary = useCallback(async (bill: Bill) => {
    const key = bill.BILL_ID || bill.BILL_NO;
    if (!key) return;

    const originalSummary = summaries[key];
    if (!originalSummary || summaryStatus[key] !== 'loaded') {
      setAiSummaryStatus(prev => ({ ...prev, [key]: 'error' }));
      setAiSummaries(prev => ({...prev, [key]: 'AI 요약을 생성하려면 먼저 원문 요약이 필요합니다.'}));
      return;
    }

    setAiSummaryStatus(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const aiSummary = await summarizeText(originalSummary, bill.BILL_NAME);
      setAiSummaries(prev => ({ ...prev, [key]: aiSummary }));
      setAiSummaryStatus(prev => ({ ...prev, [key]: 'loaded' }));
    } catch (e) {
      console.error(`Failed to generate AI summary for bill ${key}`, e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAiSummaries(prev => ({ ...prev, [key]: errorMessage }));
      setAiSummaryStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  }, [summaries, summaryStatus]);

  const handleDownloadCsv = () => {
    if (bills.length > 0 && selectedDate) {
      downloadBillsAsCSV(bills, selectedDate);
    }
  };

  const renderSummary = (bill: Bill) => {
    const key = bill.BILL_ID || bill.BILL_NO;
    if (!key) return null;
    
    const status = summaryStatus[key];
    const summaryText = summaries[key];
    const errorText = summaryErrors[key];

    switch (status) {
      case 'loading':
        return <span className="text-slate-400 italic">요약 불러오는 중…</span>;
      case 'loaded':
        return summaryText || <span className="text-slate-400 italic">(요약 없음)</span>;
      case 'error': {
        let displayError = '요약 불러오기 실패';
        if (errorText) {
            if (errorText.includes('Failed to fetch') || errorText.includes('Server responded with status') || errorText.includes('network error')) {
                displayError = '네트워크 또는 프록시 오류로 요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
            } else if (errorText.includes('API Error')) {
                displayError = 'API 키가 유효하지 않아 요약을 불러올 수 없습니다.';
            } else if (errorText.includes('Request failed: 4')) { // 4xx errors
                displayError = '잘못된 요청으로 요약을 불러올 수 없습니다.';
            } else {
                 // Truncate long messages
                displayError = `오류가 발생했습니다: ${errorText.length > 100 ? errorText.substring(0, 97) + '...' : errorText}`;
            }
        }
        return <span className="text-red-500 italic">({displayError})</span>;
      }
      case 'unavailable':
        return <span className="text-slate-400 italic">(BILL_ID/NO 없음 — 요약 불가)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900 font-sans">
      {/* Top Bar */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">L</span>
            <span className="font-semibold tracking-tight">lowlaw</span>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              국회 의안 한눈에
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-1">요약 베타</span>
            <span className="rounded-full bg-slate-100 text-slate-600 text-xs px-2 py-1">Open API</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">오늘 국회, 뭐가 바뀌었나요?</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
            복잡한 법안, <span className="underline decoration-emerald-300 underline-offset-4">쉽게</span> 보이도록.
          </h1>
          <p className="mt-2 text-slate-600">
            하루의 표결 결과를 모아 핵심만 요약해 드립니다. 출처는 공식 데이터, 표현은 일상어로.
          </p>

          {/* Controls */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700">최근 본회의 가결일</label>
            <div className="mt-2 flex min-h-[4rem] flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              {isDatesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Spinner size="sm" />
                  <span>가결일을 불러오는 중...</span>
                </div>
              ) : Object.keys(groupedDates).length > 0 ? (
                Object.keys(groupedDates)
                  .sort()
                  .reverse()
                  .map(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const monthLabel = `${year}년 ${parseInt(month, 10)}월`;
                    const days = groupedDates[monthKey];
                    return (
                      <div key={monthKey}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{monthLabel}</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          {days.map(day => {
                            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
                            return (
                              <button
                                key={dateStr}
                                onClick={() => handleDateSelect(dateStr)}
                                disabled={isLoading}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed ${
                                  selectedDate === dateStr
                                    ? 'bg-slate-900 text-white shadow-sm hover:bg-black disabled:bg-slate-500'
                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400'
                                }`}
                              >
                                {isLoading && selectedDate === dateStr ? <Spinner size="sm"/> : day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-slate-500">최근 가결된 의안이 없습니다.</p>
              )}
            </div>
             <div className="mt-4">
                 <button
                    onClick={handleDownloadCsv}
                    disabled={bills.length === 0 || isLoading || !selectedDate}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    CSV 내보내기
                  </button>
             </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        {isLoading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-2 p-6">
                <Spinner />
            </div>
            <p className="pb-6 text-center text-sm text-slate-500">선택한 날짜의 의안을 가져오는 중이에요…</p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-medium">문제가 발생했어요</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">
                {selectedDate && bills.length > 0 ? (
                  <>
                    {selectedDate} — 가결 의안 <span className="text-slate-500">{bills.length}건</span>
                  </>
                ) : (
                  '가결 의안'
                )}
              </h2>
              {bills.length > 0 && (
                <p className="text-xs text-slate-500">제목 기준 A–Z 정렬</p>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {!selectedDate ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-xl border border-slate-200 bg-slate-50" />
                  <p className="font-medium">확인할 날짜를 선택해주세요</p>
                  <p className="mt-1 text-sm text-slate-500">위에서 날짜를 선택하여 해당 일에 가결된 의안 목록을 확인하세요.</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-xl border border-slate-200 bg-slate-50" />
                  <p className="font-medium">결과가 없어요</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedDate}에 가결된 의안이 없습니다.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {bills.map((bill) => {
                    const key = bill.BILL_ID || bill.BILL_NO;
                    return (
                    <li key={key} className="p-5 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-slate-900">{bill.BILL_NAME || '(의안명 없음)'}</strong>
                        {bill.LINK_URL && (
                          <a
                            href={bill.LINK_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                          >
                            상세 보기
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {bill.PROC_RESULT_CD && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">본회의: {bill.PROC_RESULT_CD}</span>
                        )}
                        {proclamationDates[key] && (
                           <span className="rounded-full bg-sky-50 text-sky-700 px-2 py-1">공포일: {proclamationDates[key]}</span>
                        )}
                        {bill.COMMITTEE && (
                          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1">소관위: {bill.COMMITTEE}</span>
                        )}
                        {bill.PROPOSER && (
                          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1">제안자: {bill.PROPOSER}</span>
                        )}
                        {bill.BILL_NO && (
                          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1">BILL_NO {bill.BILL_NO}</span>
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <h4 className="text-[11px] font-semibold tracking-wide text-slate-700">주요 내용</h4>
                        <div className="mt-1 text-sm text-slate-700 leading-relaxed">
                          {renderSummary(bill)}
                        </div>
                        
                        {/* AI Summary Section */}
                        {summaryStatus[key] === 'loaded' && summaries[key] && (
                          <div className="mt-3 pt-3 border-t border-slate-200/80">
                            {aiSummaryStatus[key] === 'loading' && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Spinner />
                                    <span>AI 요약을 생성 중입니다...</span>
                                </div>
                            )}

                            {aiSummaryStatus[key] === 'error' && (
                                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    <p className="font-semibold">AI 요약 실패</p>
                                    <p className="mt-1">{aiSummaries[key]}</p>
                                  </div>
                            )}

                            {aiSummaryStatus[key] === 'loaded' && (
                                <div>
                                    <h5 className="font-semibold text-slate-800 mb-2 flex items-center text-xs">
                                        <SparklesIcon className="w-4 h-4 mr-1.5 text-blue-500" />
                                        Gemini AI 요약
                                    </h5>
                                    <div className="text-sm p-3 bg-white rounded-md whitespace-pre-wrap text-slate-800 leading-relaxed">{aiSummaries[key]}</div>
                                </div>
                            )}
                            
                            {(!aiSummaryStatus[key] || aiSummaryStatus[key] === 'error') && (
                                <button
                                    onClick={() => handleGenerateAiSummary(bill)}
                                    disabled={aiSummaryStatus[key] === 'loading'}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <SparklesIcon className="h-4 w-4 text-yellow-500" />
                                    {aiSummaryStatus[key] === 'error' ? 'AI 요약 재시도' : 'Gemini AI로 더 쉽게 요약하기'}
                                </button>
                            )}
                          </div>
                        )}

                        <p className="mt-2 text-[11px] text-slate-500">
                          * 공식 데이터 기반으로 요약되며, 원문 의미를 바꾸지 않아요.
                        </p>
                      </div>
                    </li>
                  )})}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            lowlaw — 법의 변화를 더 쉽게. 공공 데이터로 투명하게.
          </p>
          <p className="text-[11px] text-slate-400">
            Data: 대한민국 국회 의안정보시스템 Open API
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
