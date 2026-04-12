export interface SupportForm {
  customerName: string;
  email: string;
  orderReference: string;
  issueType: string;
  subject: string;
  message: string;
}

export interface SupportRequestPayload {
  customerName: string;
  email: string;
  orderReference: string;
  issueType: string;
  subject: string;
  message: string;
}

export interface SupportResponse {
  ticketId: number;
  status: string;
  customerName: string;
  email: string;
  subject: string;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface CustomerSupportTicket {
  id: number;
  customerName: string;
  email: string;
  orderReference: string;
  issueType: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminResponse: string;
  createdAt: string;
  updatedAt: string;
}
