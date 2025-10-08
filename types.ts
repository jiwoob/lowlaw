export enum ApiMode {
  DIRECT = 'direct',
  PROXY = 'proxy',
}

export interface Bill {
  BILL_NAME: string;
  PROC_RESULT_CD: string;
  PROC_DT: string;
  BILL_ID: string;
  BILL_NO: string;
  COMMITTEE: string;
  PROPOSER: string;
  LINK_URL: string;
  BILL_KIND: string;
  [key: string]: any; 
}

export type SummaryStatus = 'loading' | 'loaded' | 'error' | 'unavailable';

export interface SummaryState {
  isLoading: boolean;
  summary?: string | null;
  error?: string | null;
}