import { QueueJob, FieldMappingEntry } from './conversion-queue.service';

export interface EnrichedQueueJob extends QueueJob {
  projectName?: string;
  organizationName?: string;
  programName?: string;
  logs?: Array<{ timestamp: string; level: 'INFO' | 'WARN' | 'ERROR'; message: string }>;
  executionHistory?: Array<{ attempt: number; timestamp: string; status: string; duration: string; error?: string }>;
  sourceCode?: string;
  fieldMappings?: FieldMappingEntry[];
}

export const INITIAL_MOCK_JOBS: EnrichedQueueJob[] = [
  {
    id: 'job-bms-custinq',
    organizationId: 'org-acme-corp',
    organizationName: 'Acme Corporation',
    projectId: 'proj-acme-core',
    projectName: 'Acme Core Banking BMS Modernization',
    screenId: 'CUSTINQ.bms',
    status: 'DEAD',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    priority: 'HIGH',
    attemptCount: 3,
    maxAttempts: 3,
    createdBy: 'internal-staff@alsm.io',
    createdAt: '2026-10-21T08:15:00Z',
    updatedAt: '2026-10-21T08:25:00Z',
    startedAt: '2026-10-21T08:24:00Z',
    completedAt: '2026-10-21T08:25:00Z',
    errorCode: 'SCHEMA_MAPPING_MISMATCH',
    errorMessage: 'Unresolved field CUST_BAL_AMT in layout definition line 48. Target property currentBalance expects numeric formatting rule.',
    toolVersion: 'ALSM Engine v4.2.1-prod',
    executionHistory: [
      { attempt: 1, timestamp: '2026-10-21T08:15:30Z', status: 'FAILED', duration: '4.2s', error: 'SCHEMA_MAPPING_MISMATCH: Missing conversion rule for CUST_BAL_AMT' },
      { attempt: 2, timestamp: '2026-10-21T08:20:10Z', status: 'FAILED', duration: '4.8s', error: 'SCHEMA_MAPPING_MISMATCH: Automatic type inferencing failed' },
      { attempt: 3, timestamp: '2026-10-21T08:25:00Z', status: 'DEAD', duration: '5.1s', error: 'DEAD_LETTER_QUEUE: Maximum retry count (3) reached. Requires support patch.' },
    ],
    logs: [
      { timestamp: '08:24:02.105', level: 'INFO', message: 'Worker-node-04 spawned container alsm-bms-parser:v4.2.1' },
      { timestamp: '08:24:03.450', level: 'INFO', message: 'Loading BMS macro definition CUSTINQ.bms (14.2 KB)' },
      { timestamp: '08:24:04.120', level: 'INFO', message: 'Parsed 14 fields: ACCTNO, CUSTNAME, ADDR1, ADDR2, CUST_BAL_AMT...' },
      { timestamp: '08:24:04.890', level: 'WARN', message: 'Field CUST_BAL_AMT has POS=(12,35) with PIC 9(9)V99 without explicit transform' },
      { timestamp: '08:24:05.102', level: 'ERROR', message: 'Validation rule error: Target property currentBalance type conflict (expected string | number)' },
      { timestamp: '08:24:05.210', level: 'ERROR', message: 'Job failed. Exceeded max retry limit (3/3). Moved to dead-letter queue.' },
    ],
    sourceCode: `*----------------------------------------------------------------*
* CUSTINQ.bms - Customer Inquiry 3270 Terminal Screen
*----------------------------------------------------------------*
CUSTINQ  DFHMSD TYPE=&SYSPARM,MODE=INOUT,LANG=COBOL,             X
               TIOAPFX=YES,STORAGE=AUTO,CTRL=FREEKB
INQMAP   DFHMDI SIZE=(24,80),LINE=1,COLUMN=1
TITLE    DFHMDF POS=(1,26),ATTRB=(ASKIP,BRT),                    X
               INITIAL='CUSTOMER ACCOUNT INQUIRY SYSTEM'
LBLACC   DFHMDF POS=(3,2),ATTRB=(ASKIP,NORM),INITIAL='Account No:'
ACCTNO   DFHMDF POS=(3,14),ATTRB=(UNPROT,IC),LENGTH=10
LBLNAME  DFHMDF POS=(5,2),ATTRB=(ASKIP,NORM),INITIAL='Customer:'
CUSTNAME DFHMDF POS=(5,14),ATTRB=(ASKIP,BRT),LENGTH=30
LBLBAL   DFHMDF POS=(12,2),ATTRB=(ASKIP,NORM),INITIAL='Current Bal:'
CUST_BAL_AMT DFHMDF POS=(12,15),ATTRB=(ASKIP,BRT),LENGTH=14
         DFHMSD TYPE=FINAL
         END`,
    fieldMappings: [
      { sourceField: 'ACCTNO', targetProperty: 'accountNumber', dataType: 'string', transformRule: 'trim' },
      { sourceField: 'CUSTNAME', targetProperty: 'customerName', dataType: 'string', transformRule: 'capitalize' },
      { sourceField: 'CUST_BAL_AMT', targetProperty: 'currentBalance', dataType: 'number', transformRule: 'toCurrency' },
    ],
  },
  {
    id: 'job-cbl-transproc',
    organizationId: 'org-fnx-prod',
    organizationName: 'Fintech Nexus International',
    projectId: 'proj-fnx-ledger-02',
    projectName: 'General Ledger COBOL to Java Batch',
    screenId: 'TRANSPROC.cbl',
    programName: 'TRANSPROC.cbl',
    status: 'FAILED',
    conversionType: 'COBOL_TO_JAVA',
    priority: 'HIGH',
    attemptCount: 2,
    maxAttempts: 3,
    createdBy: 'sarah.jenkins@fintechnexus.io',
    createdAt: '2026-10-21T09:30:00Z',
    updatedAt: '2026-10-21T09:35:00Z',
    startedAt: '2026-10-21T09:34:00Z',
    errorCode: 'PARSER_COMPUTATIONAL_ERROR',
    errorMessage: 'COMP-3 packed decimal parsing exception at line 142 in paragraph 400-CALC-INTEREST.',
    toolVersion: 'ALSM Engine v4.2.1-prod',
    executionHistory: [
      { attempt: 1, timestamp: '2026-10-21T09:30:45Z', status: 'FAILED', duration: '8.1s', error: 'COMP-3 precision overflow' },
      { attempt: 2, timestamp: '2026-10-21T09:35:00Z', status: 'FAILED', duration: '7.9s', error: 'PARSER_COMPUTATIONAL_ERROR: BigDecimal precision 18 scale 2 mismatch' },
    ],
    logs: [
      { timestamp: '09:34:10.002', level: 'INFO', message: 'Worker-node-02 processing TRANSPROC.cbl' },
      { timestamp: '09:34:12.440', level: 'INFO', message: 'AST generation complete: 18 paragraphs detected' },
      { timestamp: '09:34:15.110', level: 'ERROR', message: 'Paragraph 400-CALC-INTEREST: COMP-3 variable WS-INT-RATE requires BigDecimal scale rule' },
    ],
    sourceCode: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. TRANSPROC.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-TRANSACTION-RECORD.
           05  WS-TRANS-ID        PIC X(12).
           05  WS-TRANS-AMOUNT    PIC S9(9)V99 COMP-3.
           05  WS-INT-RATE        PIC 9(3)V9(4) COMP-3.
       PROCEDURE DIVISION.
       000-MAIN.
           PERFORM 400-CALC-INTEREST.
           STOP RUN.
       400-CALC-INTEREST.
           COMPUTE WS-TRANS-AMOUNT = WS-TRANS-AMOUNT * WS-INT-RATE.`,
    fieldMappings: [
      { sourceField: 'WS-TRANS-ID', targetProperty: 'transactionId', dataType: 'string', transformRule: 'trim' },
      { sourceField: 'WS-TRANS-AMOUNT', targetProperty: 'transactionAmount', dataType: 'BigDecimal', transformRule: 'scale2' },
      { sourceField: 'WS-INT-RATE', targetProperty: 'interestRate', dataType: 'BigDecimal', transformRule: 'scale4' },
    ],
  },
  {
    id: 'job-dspf-balchk',
    organizationId: 'org-tokyo-marine',
    organizationName: 'Tokyo Marine Global Insurance',
    projectId: 'proj-tokyo-marine-core',
    projectName: 'Tokyo Marine Core Policy Migration',
    screenId: 'BALCHK.dspf',
    status: 'DEAD',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    priority: 'NORMAL',
    attemptCount: 3,
    maxAttempts: 3,
    createdBy: 'internal-staff@alsm.io',
    createdAt: '2026-10-21T07:10:00Z',
    updatedAt: '2026-10-21T07:22:00Z',
    startedAt: '2026-10-21T07:21:00Z',
    completedAt: '2026-10-21T07:22:00Z',
    errorCode: 'SUBFILE_OVERFLOW',
    errorMessage: 'Subfile SFLRCDNBR overflow beyond 999 records without paging hook.',
    toolVersion: 'ALSM Engine v4.2.1-prod',
    executionHistory: [
      { attempt: 1, timestamp: '2026-10-21T07:11:00Z', status: 'FAILED', duration: '3.4s', error: 'SFLDSP without SFLSIZ' },
      { attempt: 2, timestamp: '2026-10-21T07:16:00Z', status: 'FAILED', duration: '3.6s', error: 'SUBFILE_OVERFLOW: SFLRCDNBR missing pagination transform' },
      { attempt: 3, timestamp: '2026-10-21T07:22:00Z', status: 'DEAD', duration: '3.8s', error: 'DEAD_LETTER_QUEUE: 3 automatic retries failed. Moved to dead-letter queue.' },
    ],
    logs: [
      { timestamp: '07:21:01.300', level: 'INFO', message: 'DSPF parser initialized for BALCHK.dspf' },
      { timestamp: '07:21:03.110', level: 'ERROR', message: 'SFL record limit exceeded. SFLPAGE=12 SFLSIZ=999.' },
      { timestamp: '07:21:03.500', level: 'ERROR', message: 'Max retries exceeded. Marked DEAD.' },
    ],
    sourceCode: `     A          R SFLREC                    SFL
     A            POLNO         10A  O  8  2
     A            POLHLDR       25A  O  8 14
     A            PREMIUM        9S 2O  8 42
     A          R SFLCTL                    SFLCTL(SFLREC)
     A                                      SFLSIZ(0999) SFLPAG(0012)
     A  40                                  SFLDSP
     A  41                                  SFLDSPCTL`,
    fieldMappings: [
      { sourceField: 'POLNO', targetProperty: 'policyNumber', dataType: 'string', transformRule: 'trim' },
      { sourceField: 'POLHLDR', targetProperty: 'policyHolder', dataType: 'string', transformRule: 'capitalize' },
      { sourceField: 'PREMIUM', targetProperty: 'annualPremium', dataType: 'number', transformRule: 'toCurrency' },
    ],
  },
  {
    id: 'job-bms-acctpay',
    organizationId: 'org-acme-corp',
    organizationName: 'Acme Corporation',
    projectId: 'proj-acme-core',
    projectName: 'Acme Core Banking BMS Modernization',
    screenId: 'ACCTPAY.bms',
    status: 'QUEUED',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    priority: 'HIGH',
    attemptCount: 0,
    maxAttempts: 3,
    createdBy: 'internal-staff@alsm.io',
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z',
  },
  {
    id: 'job-cbl-calcrate',
    organizationId: 'org-fnx-prod',
    organizationName: 'Fintech Nexus International',
    projectId: 'proj-fnx-ledger-02',
    projectName: 'General Ledger COBOL to Java Batch',
    screenId: 'CALCRATE.cbl',
    programName: 'CALCRATE.cbl',
    status: 'QUEUED',
    conversionType: 'COBOL_TO_JAVA',
    priority: 'NORMAL',
    attemptCount: 0,
    maxAttempts: 3,
    createdBy: 'sarah.jenkins@fintechnexus.io',
    createdAt: '2026-10-21T10:05:00Z',
    updatedAt: '2026-10-21T10:05:00Z',
  },
  {
    id: 'job-cbl-valacct',
    organizationId: 'org-metlife-legacy',
    organizationName: 'MetLife Modernization Labs',
    projectId: 'proj-metlife-01',
    projectName: 'MetLife Claims Ingestion',
    screenId: 'VALACCT.cbl',
    programName: 'VALACCT.cbl',
    status: 'PROCESSING',
    conversionType: 'COBOL_TO_JAVA',
    priority: 'NORMAL',
    attemptCount: 1,
    maxAttempts: 3,
    createdBy: 'alex.mercer@alsm.io',
    createdAt: '2026-10-21T09:50:00Z',
    updatedAt: '2026-10-21T10:10:00Z',
    startedAt: '2026-10-21T10:08:00Z',
    toolVersion: 'ALSM Engine v4.2.1-prod',
  },
  {
    id: 'job-bms-nav01',
    organizationId: 'org-tokyo-marine',
    organizationName: 'Tokyo Marine Global Insurance',
    projectId: 'proj-tokyo-marine-core',
    projectName: 'Tokyo Marine Core Policy Migration',
    screenId: 'MAINMENU.bms',
    status: 'COMPLETED',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    priority: 'NORMAL',
    attemptCount: 1,
    maxAttempts: 3,
    createdBy: 'internal-staff@alsm.io',
    createdAt: '2026-10-21T06:00:00Z',
    updatedAt: '2026-10-21T06:05:00Z',
    startedAt: '2026-10-21T06:01:00Z',
    completedAt: '2026-10-21T06:04:30Z',
    toolVersion: 'ALSM Engine v4.2.1-prod',
  },
];
