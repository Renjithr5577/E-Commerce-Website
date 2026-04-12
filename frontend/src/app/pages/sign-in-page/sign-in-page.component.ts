import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { AuthForm, AuthPasswordResetPayload } from '../../models/storefront.model';

@Component({
  selector: 'app-sign-in-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-in-page.component.html'
})
export class SignInPageComponent {
  @Input({ required: true }) form!: AuthForm;
  @Input({ required: true }) passwordResetForm!: AuthPasswordResetPayload;
  @Input() passwordResetMode: 'closed' | 'verify' | 'reset' = 'closed';
  @Input() noticeMessage = '';
  @Input() errorMessage = '';
  @Input() successMessage = '';

  @Output() submitForm = new EventEmitter<void>();
  @Output() openForgotPassword = new EventEmitter<void>();
  @Output() cancelForgotPassword = new EventEmitter<void>();
  @Output() submitPasswordResetVerification = new EventEmitter<void>();
  @Output() submitPasswordReset = new EventEmitter<void>();
  @Output() openSignUp = new EventEmitter<void>();
  @Output() openAdmin = new EventEmitter<void>();
  @Output() backHome = new EventEmitter<void>();

  showSignInPassword = false;
  showResetPassword = false;
  showResetConfirmPassword = false;

  handleSubmit(form: NgForm): void {
    if (this.passwordResetMode !== 'closed') {
      return;
    }

    if (form.invalid || !this.isIdentifierValid(this.form.identifier)) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitForm.emit();
  }

  handleForgotPasswordClick(): void {
    this.openForgotPassword.emit();
  }

  handleCancelPasswordReset(): void {
    this.cancelForgotPassword.emit();
  }

  handlePasswordResetVerification(form: NgForm): void {
    if (form.invalid || !this.isIdentifierValid(this.passwordResetForm.identifier)) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitPasswordResetVerification.emit();
  }

  handlePasswordReset(form: NgForm): void {
    if (!this.isPasswordResetValid()) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitPasswordReset.emit();
  }

  isPasswordResetValid(): boolean {
    return (
      this.isIdentifierValid(this.passwordResetForm.identifier) &&
      this.passwordResetForm.newPassword.trim().length >= 6 &&
      this.passwordResetForm.newPassword.trim() ===
        this.passwordResetForm.confirmPassword.trim()
    );
  }

  isSignInStep(): boolean {
    return this.passwordResetMode === 'closed';
  }

  isVerifyStep(): boolean {
    return this.passwordResetMode === 'verify';
  }

  isResetStep(): boolean {
    return this.passwordResetMode === 'reset';
  }

  isIdentifierValid(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return false;
    }

    if (trimmedValue.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue.toLowerCase());
    }

    return /^\d{10}$/.test(trimmedValue.replace(/\D/g, ''));
  }

  togglePasswordVisibility(field: 'signIn' | 'reset' | 'confirm'): void {
    if (field === 'signIn') {
      this.showSignInPassword = !this.showSignInPassword;
      return;
    }

    if (field === 'reset') {
      this.showResetPassword = !this.showResetPassword;
      return;
    }

    this.showResetConfirmPassword = !this.showResetConfirmPassword;
  }
}
