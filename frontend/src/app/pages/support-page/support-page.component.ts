import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  CustomerSupportTicket,
  SupportForm,
  SupportTicketStatus
} from '../../models/support.model';
import { FaqItem, SupportCard } from '../../models/storefront.model';

@Component({
  selector: 'app-support-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './support-page.component.html',
  styleUrl: './support-page.component.css'
})
export class SupportPageComponent implements OnChanges {
  @Input({ required: true }) supportCards!: SupportCard[];
  @Input({ required: true }) faqs!: FaqItem[];
  @Input({ required: true }) supportForm!: SupportForm;
  @Input({ required: true }) issueOptions!: string[];
  @Input() customerTickets: CustomerSupportTicket[] = [];
  @Input() ticketsLoading = false;
  @Input() ticketsError = '';
  @Input() accountName: string | null = null;
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() submitting = false;

  @Output() backHome = new EventEmitter<void>();
  @Output() continueBuilding = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() requestSignIn = new EventEmitter<void>();
  @ViewChild('supportFormRef') supportFormRef?: NgForm;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['successMessage']?.currentValue && this.supportFormRef) {
      queueMicrotask(() => this.supportFormRef?.resetForm(this.supportForm));
    }
  }

  handleSubmit(form: NgForm): void {
    if (!this.accountName) {
      this.requestSignIn.emit();
      return;
    }

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitForm.emit();
  }

  getSupportStatusLabel(status: SupportTicketStatus): string {
    const labels: Record<SupportTicketStatus, string> = {
      open: 'Open',
      in_progress: 'In progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };

    return labels[status];
  }

  getSupportStatusMessage(ticket: CustomerSupportTicket): string {
    const messages: Record<SupportTicketStatus, string> = {
      open: 'We received your request and the support team will review it soon.',
      in_progress: 'The support team is actively working on this ticket.',
      resolved: 'The support team marked this issue as resolved. Review the reply above.',
      closed: 'This ticket is closed. Submit a new request if you still need help.'
    };

    return ticket.adminResponse || messages[ticket.status];
  }
}
