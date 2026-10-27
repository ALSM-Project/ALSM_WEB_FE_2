import React from 'react';

const CheckIcon = ({ variant = 'fail' }: { variant?: 'fail' | 'progress' }) => {
  const isFail = variant === 'fail';

  return (
    <div
      className={[
        'flex h-7 w-7 items-center justify-center rounded-full border',
        isFail ? 'border-[#d1242f] bg-[#fff1f2]' : 'border-[#d4a72c] bg-[#fff8db]',
      ].join(' ')}
      aria-hidden="true"
    >
      {isFail ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#cf222e]" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#a17200]" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M10 3.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Z" strokeLinecap="round" />
          <path d="M10 5.5v5.2l3.2 1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
};

const GitHubCircle = () => (
  <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2328] shadow-sm">
    <svg viewBox="0 0 32 32" className="h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
      <path d="M16 3.5a12.5 12.5 0 0 0-3.95 24.35c.63.12.86-.27.86-.6v-2.1c-3.51.76-4.25-1.49-4.25-1.49-.58-1.46-1.42-1.85-1.42-1.85-1.15-.79.09-.78.09-.78 1.27.09 1.94 1.31 1.94 1.31 1.13 1.94 2.96 1.38 3.68 1.05.12-.82.44-1.38.8-1.7-2.8-.32-5.74-1.4-5.74-6.22 0-1.37.49-2.5 1.29-3.38-.13-.32-.56-1.62.12-3.37 0 0 1.05-.34 3.45 1.28a11.83 11.83 0 0 1 6.28 0c2.39-1.62 3.44-1.28 3.44-1.28.68 1.75.25 3.05.12 3.37.81.88 1.29 2.01 1.29 3.38 0 4.84-2.95 5.9-5.76 6.22.45.39.86 1.15.86 2.33v3.45c0 .33.23.72.87.6A12.5 12.5 0 0 0 16 3.5Z"/>
    </svg>
    <span className="absolute inset-x-0 bottom-0 mx-auto h-1.5 w-1.5 rounded-full bg-[#fdba74]" />
  </div>
);

const StatusRow = ({
  variant,
  title,
  detail,
}: {
  variant: 'fail' | 'progress';
  title: string;
  detail: string;
}) => (
  <div className="flex items-center justify-between gap-4 border-t border-[#d8dee4] px-6 py-5">
    <div className="flex min-w-0 items-center gap-4">
      <CheckIcon variant={variant} />
      <div className="flex min-w-0 items-center gap-3">
        <GitHubCircle />
        <div className="min-w-0">
          <div className="truncate text-[22px] font-medium leading-snug text-[#1f2328]">{title}</div>
          <div className="mt-1 text-[17px] leading-relaxed text-[#57606a]">{detail}</div>
        </div>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-3 pl-6">
      <span className="inline-flex items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] px-3 py-1 text-[15px] font-medium text-[#57606a]">
        Required
      </span>
      <button type="button" aria-label="More actions" className="flex h-8 w-8 items-center justify-center rounded-md text-[#57606a] hover:bg-[#f6f8fa]">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="10" r="1.3" />
          <circle cx="10" cy="10" r="1.3" />
          <circle cx="15" cy="10" r="1.3" />
        </svg>
      </button>
    </div>
  </div>
);

export const PullRequestStatusPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f6f8fa] px-4 py-8 text-[#24292f] antialiased sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="overflow-hidden rounded-[12px] border border-[#d0d7de] bg-white shadow-[0_1px_0_rgba(27,31,36,0.04)]">
          <div className="flex items-center justify-between border-b border-[#d8dee4] px-6 py-5 sm:px-7">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] ring-8 ring-[#f6f8fa]">
                <svg viewBox="0 0 80 80" className="h-10 w-10 text-[#d0d7de]" fill="none" aria-hidden="true">
                  <circle cx="40" cy="40" r="25" stroke="currentColor" strokeWidth="4" />
                  <path d="M24 48c0-8.8 7.2-16 16-16h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="25" cy="27" r="7" stroke="currentColor" strokeWidth="4" />
                  <circle cx="55" cy="54" r="7" stroke="currentColor" strokeWidth="4" />
                  <circle cx="58" cy="22" r="7" stroke="currentColor" strokeWidth="4" />
                  <path d="M40 60v-5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 rounded-full border-[6px] border-[#d97706] border-t-[#d97706] border-r-transparent border-b-transparent border-l-[#d97706]" />
              </div>

              <div>
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#1f2328] sm:text-[30px]">
                  Some checks were not successful
                </h1>
                <p className="mt-2 text-[18px] text-[#57606a]">1 failing, 1 in progress checks</p>
              </div>
            </div>

            <button type="button" aria-label="Expand checks" className="flex h-10 w-10 items-center justify-center rounded-md text-[#57606a] hover:bg-[#f6f8fa]">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="px-5 pb-4 pt-5">
            <div className="mb-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-[17px] font-medium text-[#57606a]">
                <span>1 failing check</span>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#57606a]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <button type="button" aria-label="Check settings" className="flex h-8 w-8 items-center justify-center rounded-md text-[#57606a] hover:bg-[#f6f8fa]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M10.5 3.5h3l.6 2.4 2.5.8 2.4.6v3l-2.4.6-.8 2.5-.6 2.4h-3l-.6-2.4-2.5-.8-2.4-.6v-3l2.4-.6.8-2.5.6-2.4Zm1.5 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <StatusRow
              variant="fail"
              title="Frontend 2 CI Pipeline / Build & Validate (push)"
              detail="Failing after 22s"
            />

            <div className="mt-4 mb-3 flex items-center justify-between px-2 pt-2">
              <div className="flex items-center gap-2 text-[17px] font-medium text-[#57606a]">
                <span>1 in progress check</span>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#57606a]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <StatusRow
              variant="progress"
              title="Frontend 2 CI Pipeline / Build & Validate (pull_request)"
              detail="Started now — This check has started..."
            />
          </div>

          <div className="border-t border-[#d8dee4] bg-[#f8fafc] px-6 py-8 sm:px-8">
            <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[#d8dee4] bg-[#f6f8fa] px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#57606a]">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 3.5v8.4m0 0 3.5-3.5M12 11.9 8.5 8.4M12 20.5v-6.2m0 0 3.5 3.5M12 14.3l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[#1f2328] sm:text-[22px]">
                    This branch is out-of-date with the base branch
                  </h2>
                  <p className="mt-2 max-w-[820px] text-[16px] leading-7 text-[#57606a]">
                    Merge the latest changes from develop into this branch. This merge commit will be associated
                    with Nguyen-Cuong-333.
                  </p>
                </div>
              </div>

              <button type="button" aria-label="Toggle update branch" className="relative h-8 w-14 shrink-0 rounded-full border border-[#d0d7de] bg-[#f6f8fa] p-1 shadow-inner">
                <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm ring-1 ring-[#d0d7de]" />
              </button>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-[#d8dee4] pt-5">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#d0d7de] bg-white px-5 py-3 text-[18px] font-medium text-[#24292f] shadow-sm hover:bg-[#f6f8fa]"
              >
                Merge pull request
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#57606a]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <p className="text-center text-[16px] text-[#57606a]">
                You can also merge this with the command line.
                <a href="#" className="ml-1 font-medium text-[#0969da] hover:underline">View command line instructions.</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PullRequestStatusPage;
