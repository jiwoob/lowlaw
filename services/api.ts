import { ApiMode, Bill } from '../types';

const BILL_LIST_API = "https://open.assembly.go.kr/portal/openapi/TVBPMBILL11";
const BILL_SUMMARY_API = "https://open.assembly.go.kr/portal/openapi/BPMBILLSUMMARY";

interface ApiOptions {
  apiKey: string;
  proxyUrl: string;
}

/* ------------------ COMMON UTILS ------------------ */

function buildRelayUrl(mode: ApiMode, targetUrl: string, proxyUrl: string) {
  if (mode === ApiMode.DIRECT) return targetUrl;
  if (!proxyUrl) throw new Error('Proxy URL is required.');
  // Format for corsproxy.io: https://corsproxy.io/?<encoded_target_url>
  return `${proxyUrl}?${encodeURIComponent(targetUrl)}`;
}

async function getJson(url: string) {
  const retries = 2; // Total 3 attempts
  let lastError: Error = new Error('The request failed after all retries.');

  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500 * i)); // Linear backoff
      }
      
      const res = await fetch(url); // Can throw "Failed to fetch" for network errors

      if (!res.ok) {
        const text = await res.text();
        // Check for non-retryable errors first
        if (text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
            throw new Error("API Error: The provided National Assembly API Key is invalid or not registered.");
        }
        if (res.status >= 400 && res.status < 500) {
            throw new Error(`Request failed: ${res.status} ${res.statusText}.`);
        }
        // For 5xx or other errors, throw a generic error to trigger a retry
        throw new Error(`Server responded with status ${res.status}`);
      }
      
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // A successful request that returns invalid JSON is a non-retryable error.
        throw new Error(`Failed to parse JSON. Server response: "${text.slice(0, 300)}..."`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`Attempt ${i + 1}/${retries + 1} failed: ${lastError.message}`);
      // If it's a specific non-retryable error, throw immediately.
      if (lastError.message.startsWith('API Error:') || lastError.message.startsWith('Request failed:') || lastError.message.startsWith('Failed to parse JSON')) {
        throw lastError;
      }
    }
  }

  throw lastError; // Throw the last error after all retries fail
}


/* ------------------ 1) Bill List Fetching ------------------ */

function extractBillList(data: any): Bill[] {
  const container = data?.TVBPMBILL11;
  if (!Array.isArray(container) || container.length < 2) {
    const result = container?.[0]?.head?.[1]?.RESULT;
    if (result?.CODE && result.CODE !== 'INFO-000') {
      throw new Error(`API Error: ${result.MESSAGE} (Code: ${result.CODE})`);
    }
    return [];
  }
  const rows = container[1]?.row;
  return Array.isArray(rows) ? rows : (rows ? [rows] : []);
}

async function fetchListPage(dateStr: string, pIndex: number, pSize: number, mode: ApiMode, options: ApiOptions): Promise<Bill[]> {
  if (!options.apiKey) throw new Error('API KEY를 입력하세요.');
  const params = new URLSearchParams({
    PROC_DT: dateStr,
    pIndex: String(pIndex),
    pSize: String(pSize),
    type: 'json',
    KEY: options.apiKey,
  });
  const target = `${BILL_LIST_API}?${params.toString()}`;
  const url = buildRelayUrl(mode, target, options.proxyUrl);
  const data = await getJson(url);
  return extractBillList(data);
}

export async function fetchAllPassedBills(dateStr: string, mode: ApiMode, options: ApiOptions): Promise<Bill[]> {
  let pIndex = 1;
  const pSize = 100;
  const out: Bill[] = [];
  while (true) {
    const page = await fetchListPage(dateStr, pIndex, pSize, mode, options);
    if (!page.length) break;
    out.push(...page);
    if (page.length < pSize) break;
    pIndex++;
  }
  // Filter for '가결' only
  return out.filter(b => 
    (b.PROC_RESULT_CD || '').includes('가결')
  );
}


/* ------------------ 1a) Recent Passed Bill Dates Fetching ------------------ */

async function fetchRecentBills(pIndex: number, pSize: number, mode: ApiMode, options: ApiOptions): Promise<Bill[]> {
  if (!options.apiKey) throw new Error('API KEY를 입력하세요.');
  const params = new URLSearchParams({
    pIndex: String(pIndex),
    pSize: String(pSize),
    type: 'json',
    KEY: options.apiKey,
  });
  const target = `${BILL_LIST_API}?${params.toString()}`;
  const url = buildRelayUrl(mode, target, options.proxyUrl);
  const data = await getJson(url);
  return extractBillList(data);
}

export async function fetchRecentPassedBillDates(mode: ApiMode, options: ApiOptions): Promise<string[]> {
  const pSize = 100;
  const allRecentBills: Bill[] = [];
  
  // Fetch more pages to get a wider range of recent dates
  for (let pIndex = 1; pIndex <= 30; pIndex++) { 
    try {
        const page = await fetchRecentBills(pIndex, pSize, mode, options);
        if (!page.length) break;
        allRecentBills.push(...page);
    } catch (e) {
        console.error(`Failed to fetch page ${pIndex} of recent bills.`, e);
        // If the first page fails, it's a critical error, so re-throw it.
        if (pIndex === 1) {
            throw e;
        }
        // For subsequent pages, we can break and work with what we have.
        break;
    }
  }
  
  const passedBills = allRecentBills.filter(b => 
    (b.PROC_RESULT_CD || '').includes('가결') && b.PROC_DT
  );
  
  const dates = passedBills.map(b => b.PROC_DT);
  const uniqueDates = [...new Set(dates)];
  
  // Sort dates descending (YYYY-MM-DD format sorts correctly as strings)
  uniqueDates.sort((a, b) => b.localeCompare(a));
  
  return uniqueDates;
}


/* ------------------ 2) Summary Text Fetching ------------------ */

function extractSummaryFlexible(data: any): string {
  const container = data?.BPMBILLSUMMARY;
  if (!Array.isArray(container) || container.length < 2) {
    const result = container?.[0]?.head?.[1]?.RESULT;
    if (result?.CODE && result.CODE !== 'INFO-000') {
      throw new Error(`Summary API Error: ${result.MESSAGE} (Code: ${result.CODE})`);
    }
    throw new Error('요약 정보를 찾을 수 없습니다. (No summary data)');
  }

  const rowBlock = container[1]?.row;
  const rows = Array.isArray(rowBlock) ? rowBlock : (rowBlock ? [rowBlock] : []);
  if (!rows.length) throw new Error('요약 내용이 비어있습니다. (Empty summary rows)');

  // Try various possible field names for summary
  const CANDIDATE_KEYS = ['SUMMARY', 'SUMMRY', 'MAIN_CONTENTS', 'CONTENT', 'EXPLAIN'];

  for (const row of rows) {
    for (const key of CANDIDATE_KEYS) {
      const value = row?.[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  throw new Error('요약 필드를 찾지 못했습니다. (Could not find a valid summary field)');
}

async function tryFetchSummary(params: URLSearchParams, mode: ApiMode, options: ApiOptions): Promise<string> {
  params.set('KEY', options.apiKey);
  params.set('type', 'json');
  const target = `${BILL_SUMMARY_API}?${params.toString()}`;
  const url = buildRelayUrl(mode, target, options.proxyUrl);
  const data = await getJson(url);
  return extractSummaryFlexible(data);
}

export async function fetchBillSummaryText(bill: Bill, mode: ApiMode, options: ApiOptions): Promise<string> {
  if (!options.apiKey) throw new Error('API KEY를 입력하세요.');
  const billId = bill.BILL_ID || '';
  const billNo = bill.BILL_NO || '';
  
  const attempts = [];
  if (billId) attempts.push(new URLSearchParams({ BILL_ID: billId }));
  if (billNo) attempts.push(new URLSearchParams({ BILL_NO: billNo }));
  
  if (attempts.length === 0) {
    throw new Error('Bill ID와 Bill No.가 모두 없어 요약 조회가 불가능합니다.');
  }

  let lastError: Error | null = null;
  for (const params of attempts) {
    try {
      const summary = await tryFetchSummary(params, mode, options);
      if (summary && summary.length > 10) return summary;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  
  throw lastError || new Error('모든 방법으로 요약 정보를 가져오는데 실패했습니다.');
}