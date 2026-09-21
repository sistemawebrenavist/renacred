export type TransactionType = 'RECHARGE' | 'QUERY_DEBIT' | 'MANUAL_ADJUSTMENT' | 'INVOICE_PAYMENT';
export const TransactionType = {
  RECHARGE: 'RECHARGE' as TransactionType,
  QUERY_DEBIT: 'QUERY_DEBIT' as TransactionType,
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT' as TransactionType,
  INVOICE_PAYMENT: 'INVOICE_PAYMENT' as TransactionType,
};

export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';
export const InvoiceStatus = {
  OPEN: 'OPEN' as InvoiceStatus,
  CLOSED: 'CLOSED' as InvoiceStatus,
  PAID: 'PAID' as InvoiceStatus,
  OVERDUE: 'OVERDUE' as InvoiceStatus,
};

export type QuerySource = 'WEB' | 'API';
export const QuerySource = {
  WEB: 'WEB' as QuerySource,
  API: 'API' as QuerySource,
};

export type QueryStatus = 'COMPLETED' | 'ERROR';
export const QueryStatus = {
  COMPLETED: 'COMPLETED' as QueryStatus,
  ERROR: 'ERROR' as QueryStatus,
};

export type AccountType = 'PRE_PAID' | 'POST_PAID';
export const AccountType = {
  PRE_PAID: 'PRE_PAID' as AccountType,
  POST_PAID: 'POST_PAID' as AccountType,
};

export type Role = 'COMPANY_ADMIN' | 'COMPANY_USER' | 'SUPER_ADMIN';
export const Role = {
  COMPANY_ADMIN: 'COMPANY_ADMIN' as Role,
  COMPANY_USER: 'COMPANY_USER' as Role,
  SUPER_ADMIN: 'SUPER_ADMIN' as Role,
};
