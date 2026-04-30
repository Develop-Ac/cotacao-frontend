import { emailApiFetch, toQueryString } from './http';
import {
  CreateMailAccountPayload,
  CreateManualLinkPayload,
  MailAccount,
  MailAttachment,
  MailMessage,
  MailParticipant,
  MailThread,
  PaginationParams,
  SendOutboundPayload,
} from './types';

const toParticipant = (item: unknown): MailParticipant | null => {
  if (!item || typeof item !== 'object') return null;
  const value = item as Record<string, unknown>;
  const email = String(value.email ?? '').trim();
  if (!email) return null;

  return {
    email,
    name: (value.name ?? null) as string | null,
  };
};

const toAttachment = (item: unknown): MailAttachment | null => {
  if (!item || typeof item !== 'object') return null;
  const value = item as Record<string, unknown>;
  const id = Number(value.id ?? 0);
  const fileName = String(value.file_name ?? value.fileName ?? '').trim();
  if (!id && !fileName) return null;

  return {
    id,
    fileName,
    mimeType: (value.mime_type ?? value.mimeType ?? null) as string | null,
    sizeBytes:
      value.size_bytes == null && value.sizeBytes == null
        ? null
        : Number(value.size_bytes ?? value.sizeBytes ?? 0),
    contentId: (value.content_id ?? value.contentId ?? null) as string | null,
    isInline: Boolean(value.is_inline ?? value.isInline ?? false),
    storageBucket: (value.storage_bucket ?? value.storageBucket ?? null) as string | null,
    storageKey: (value.storage_key ?? value.storageKey ?? null) as string | null,
  };
};

const toParticipantGroup = (item: unknown): MailParticipant[] => {
  if (!Array.isArray(item)) return [];
  return item.map((entry) => toParticipant(entry)).filter((entry): entry is MailParticipant => Boolean(entry));
};

const toMessage = (item: Record<string, unknown>): MailMessage => ({
  id: Number(item.id ?? 0),
  accountId: Number(item.account_id ?? item.accountId ?? 0),
  threadId:
    item.thread_id == null ? (item.threadId as number | null | undefined) : Number(item.thread_id),
  internetMessageId: (item.internet_message_id ?? item.internetMessageId ?? null) as string | null,
  subject: (item.subject_raw ?? item.subject ?? null) as string | null,
  normalizedSubject: (item.normalized_subject ?? item.normalizedSubject ?? null) as string | null,
  fromAddress: (item.from_address ?? item.fromAddress ?? null) as string | null,
  fromName: (item.from_name ?? item.fromName ?? null) as string | null,
  replyToAddress: (item.reply_to_address ?? item.replyToAddress ?? null) as string | null,
  senderAddress: (item.sender_address ?? item.senderAddress ?? null) as string | null,
  bodyText: (item.body_text ?? item.bodyText ?? null) as string | null,
  bodyHtml: (item.body_html ?? item.bodyHtml ?? null) as string | null,
  parsingStatus: String(item.parsing_status ?? item.parsingStatus ?? 'INGESTED'),
  direction: String(item.direction ?? 'INBOUND'),
  internalDate: (item.internal_date ?? item.internalDate ?? null) as string | null,
  receivedAt: String(item.received_at ?? item.receivedAt ?? new Date().toISOString()),
  hasAttachments: Boolean(item.has_attachments ?? item.hasAttachments ?? false),
  to: toParticipantGroup(item.to),
  cc: toParticipantGroup(item.cc),
  bcc: toParticipantGroup(item.bcc),
  replyTo: toParticipantGroup(item.reply_to ?? item.replyTo),
  attachments: Array.isArray(item.attachments)
    ? item.attachments
        .map((entry) => toAttachment(entry))
        .filter((entry): entry is MailAttachment => Boolean(entry))
    : [],
});

const toAccount = (item: Record<string, unknown>): MailAccount => ({
  id: Number(item.id ?? 0),
  tenantKey: String(item.tenantKey ?? item.tenant_key ?? ''),
  contextType: String(item.contextType ?? item.context_type ?? 'GARANTIA'),
  accountName: String(item.accountName ?? item.account_name ?? ''),
  emailAddress: String(item.emailAddress ?? item.email_address ?? ''),
  imap: {
    host: String((item.imap as Record<string, unknown>)?.host ?? item.imap_host ?? ''),
    port: Number((item.imap as Record<string, unknown>)?.port ?? item.imap_port ?? 0),
    secure: Boolean((item.imap as Record<string, unknown>)?.secure ?? item.imap_secure ?? true),
  },
  smtp: {
    host: String((item.smtp as Record<string, unknown>)?.host ?? item.smtp_host ?? ''),
    port: Number((item.smtp as Record<string, unknown>)?.port ?? item.smtp_port ?? 0),
    secure: Boolean((item.smtp as Record<string, unknown>)?.secure ?? item.smtp_secure ?? true),
  },
  authSecretRef: String(item.authSecretRef ?? item.auth_secret_ref ?? ''),
  syncEnabled: Boolean(item.syncEnabled ?? item.sync_enabled ?? true),
  sendEnabled: Boolean(item.sendEnabled ?? item.send_enabled ?? true),
  statusCode: String(item.statusCode ?? item.status_code ?? 'ACTIVE'),
  hasReceivedMessages: Boolean(item.hasReceivedMessages ?? item.has_received_messages ?? false),
  lastConnectionCheckAt: (item.lastConnectionCheckAt ?? item.last_connection_check_at ?? null) as string | null,
  createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  updatedAt: String(item.updatedAt ?? item.updated_at ?? new Date().toISOString()),
});

export const mailAccountsClient = {
  async list(): Promise<MailAccount[]> {
    const res = await emailApiFetch('/api/mail-accounts');
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => toAccount(item as Record<string, unknown>));
  },

  async create(payload: CreateMailAccountPayload): Promise<MailAccount> {
    const res = await emailApiFetch('/api/mail-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return toAccount(data as Record<string, unknown>);
  },

  async inactivate(accountId: number): Promise<MailAccount> {
    const res = await emailApiFetch(`/api/mail-accounts/${accountId}/inactivate`, {
      method: 'PATCH',
    });
    const data = await res.json();
    return toAccount(data as Record<string, unknown>);
  },

  async update(accountId: number, payload: Partial<CreateMailAccountPayload>): Promise<MailAccount> {
    const res = await emailApiFetch(`/api/mail-accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return toAccount(data as Record<string, unknown>);
  },

  async remove(accountId: number): Promise<void> {
    await emailApiFetch(`/api/mail-accounts/${accountId}`, {
      method: 'DELETE',
    });
  },
};

export const mailMessagesClient = {
  async list(params: PaginationParams = {}): Promise<MailMessage[]> {
    const qs = toQueryString(params as Record<string, unknown>);
    const res = await emailApiFetch(`/api/messages${qs}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => toMessage(item as Record<string, unknown>));
  },

  async listUnlinked(params: PaginationParams = {}): Promise<MailMessage[]> {
    const qs = toQueryString(params as Record<string, unknown>);
    const res = await emailApiFetch(`/api/messages/unlinked${qs}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => toMessage(item as Record<string, unknown>));
  },

  async get(messageId: number): Promise<MailMessage | null> {
    const res = await emailApiFetch(`/api/messages/${messageId}`);
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return toMessage(data as Record<string, unknown>);
  },

  async delete(messageId: number): Promise<{ ok: boolean; messageId: number }> {
    const res = await emailApiFetch(`/api/messages/${messageId}`, { method: 'DELETE' });
    return res.json();
  },
};

export const mailThreadsClient = {
  async list(params: PaginationParams = {}): Promise<MailThread[]> {
    const qs = toQueryString(params as Record<string, unknown>);
    const res = await emailApiFetch(`/api/threads${qs}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => item as MailThread);
  },

  async get(threadId: number): Promise<MailThread | null> {
    const res = await emailApiFetch(`/api/threads/${threadId}`);
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return data as MailThread;
  },
};

export const mailLinksClient = {
  async createManual(payload: CreateManualLinkPayload) {
    const res = await emailApiFetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};

export const mailOutboundClient = {
  async send(payload: SendOutboundPayload) {
    const res = await emailApiFetch('/api/outbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};

export const mailSyncClient = {
  async requestSync(accountId: number, payload?: { folderId?: number; forceFullResync?: boolean }) {
    const res = await emailApiFetch(`/api/mail-accounts/${accountId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    return res.json();
  },
};
