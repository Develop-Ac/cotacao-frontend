export interface PaginationParams {
  page?: number;
  pageSize?: number;
  query?: string;
}

export interface MailParticipant {
  email: string;
  name?: string | null;
}

export interface MailAttachment {
  id: number;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  contentId?: string | null;
  isInline?: boolean;
  storageBucket?: string | null;
  storageKey?: string | null;
}

export interface MailAccount {
  id: number;
  tenantKey: string;
  contextType: string;
  accountName: string;
  emailAddress: string;
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  authSecretRef: string;
  syncEnabled: boolean;
  sendEnabled: boolean;
  statusCode: string;
  hasReceivedMessages: boolean;
  lastConnectionCheckAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMailAccountPayload {
  tenantKey: string;
  contextType?: string;
  accountName: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  authSecretRef: string;
  syncEnabled?: boolean;
  sendEnabled?: boolean;
}

export interface MailMessage {
  id: number;
  accountId: number;
  threadId?: number | null;
  internetMessageId?: string | null;
  subject?: string | null;
  normalizedSubject?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  replyToAddress?: string | null;
  senderAddress?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  parsingStatus: string;
  direction: string;
  internalDate?: string | null;
  receivedAt: string;
  hasAttachments: boolean;
  to?: MailParticipant[];
  cc?: MailParticipant[];
  bcc?: MailParticipant[];
  replyTo?: MailParticipant[];
  attachments?: MailAttachment[];
}

export interface MailThread {
  id: number;
  accountId: number;
  canonicalSubject?: string | null;
  normalizedSubject?: string | null;
  statusCode: string;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  linkMode?: string | null;
  linkConfidence?: string | null;
  firstMessageAt?: string | null;
  lastMessageAt?: string | null;
}

export interface CreateManualLinkPayload {
  targetType: 'THREAD' | 'MESSAGE';
  targetId: number;
  entityType: string;
  entityId: string;
  matchedValue?: string;
}

export interface SendOutboundAddress {
  email: string;
  name?: string;
}

export interface SendOutboundAttachment {
  fileName: string;
  objectKey: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface SendOutboundPayload {
  accountId: number;
  threadId?: number;
  parentMessageId?: number;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  recipients: SendOutboundAddress[];
  cc?: SendOutboundAddress[];
  bcc?: SendOutboundAddress[];
  attachments?: SendOutboundAttachment[];
  headers?: Record<string, string>;
}
