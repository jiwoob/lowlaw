import React from 'react';

interface IconProps {
  className?: string;
}

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
  </svg>
);

// FIX: Correct the path data for ExternalLinkIcon to show a proper external link symbol.
export const ExternalLinkIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6.194 6.194a.75.75 0 011.06 0l6 6a.75.75 0 01-1.06 1.06l-6-6a.75.75 0 010-1.06z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M14.75 5.5a.75.75 0 01.75-.75h2a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0V6.207l-1.22 1.22a.75.75 0 01-1.06-1.06l1.5-1.5z" clipRule="evenodd" />
    </svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.868 2.884c.321-.772 1.415-.772 1.736 0l.08.192a.75.75 0 00.56.42l.214.032a.75.75 0 01.623.856l-.05.202a.75.75 0 00.228.618l.156.133a.75.75 0 01.206.94l-.07.2a.75.75 0 00.384.748l.19.083a.75.75 0 01.32.903l-.08.192a.75.75 0 00-.56.42l-.214-.032a.75.75 0 01-.623-.856l.05-.202a.75.75 0 00-.228-.618l-.156-.133a.75.75 0 01-.206-.94l.07-.2a.75.75 0 00.384-.748l.19-.083a.75.75 0 01.32-.903l-.08-.192a.75.75 0 00.56-.42l.214-.032a.75.75 0 01.623-.856l-.05-.202a.75.75 0 00.228-.618l.156-.133a.75.75 0 01.206-.94l-.07-.2a.75.75 0 00-.384-.748l-.19-.083a.75.75 0 01-.32-.903l.08.192zM15.5 5.5a1 1 0 100-2 1 1 0 000 2zM5.5 15.5a1 1 0 100-2 1 1 0 000 2zM5 5.5a.5.5 0 01.5-.5h.5a.5.5 0 010 1h-.5a.5.5 0 01-.5-.5zM15 14.5a.5.5 0 01.5-.5h.5a.5.5 0 010 1h-.5a.5.5 0 01-.5-.5z" clipRule="evenodd" />
  </svg>
);