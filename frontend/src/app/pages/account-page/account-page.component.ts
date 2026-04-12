import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AccountPasswordForm,
  AccountProfileForm
} from '../../models/storefront.model';

@Component({
  selector: 'app-account-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './account-page.component.html'
})
export class AccountPageComponent implements OnChanges {
  @Input() accountName: string | null = null;
  @Input({ required: true }) profileForm!: AccountProfileForm;
  @Input({ required: true }) passwordForm!: AccountPasswordForm;
  @Input() passwordHintMode = false;
  @Input() showPasswordHintMismatchNotice = false;
  @Input() profileErrorMessage = '';
  @Input() passwordErrorMessage = '';
  @Input() successMessage = '';

  @Output() backHome = new EventEmitter<void>();
  @Output() continueShopping = new EventEmitter<void>();
  @Output() requestSignIn = new EventEmitter<void>();
  @Output() saveProfile = new EventEmitter<void>();
  @Output() updatePassword = new EventEmitter<void>();
  @Output() openPasswordHintReset = new EventEmitter<void>();
  @Output() resetPasswordWithHint = new EventEmitter<void>();
  @Output() cancelPasswordHintReset = new EventEmitter<void>();

  profileEditMode = false;
  showProfileCurrentPassword = false;
  showAccountCurrentPassword = false;
  showAccountNewPassword = false;
  showAccountConfirmPassword = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accountName']?.currentValue === null) {
      this.profileEditMode = false;
      return;
    }

    if (changes['successMessage']?.currentValue === 'Account details updated successfully.') {
      this.profileEditMode = false;
    }
  }

  beginProfileEdit(): void {
    this.profileEditMode = true;
    this.profileForm.currentPassword = '';
  }

  profileNameErrorMessage(): string {
    return this.profileErrorMessage === 'Full name must be at least 3 letters.'
      ? this.profileErrorMessage
      : '';
  }

  profilePhoneErrorMessage(): string {
    return this.profileErrorMessage === 'Mobile number must be exactly 10 digits.'
      ? this.profileErrorMessage
      : '';
  }

  profileCurrentPasswordErrorMessage(): string {
    if (this.profileErrorMessage === 'Enter your current password before saving account details.') {
      return this.profileErrorMessage;
    }

    return this.profileErrorMessage ===
      'Current password is incorrect. Profile details were not updated.'
      ? this.profileErrorMessage
      : '';
  }

  passwordCurrentErrorMessage(): string {
    if (this.passwordHintMode) {
      return '';
    }

    if (this.passwordErrorMessage === 'Enter your current password first.') {
      return this.passwordErrorMessage;
    }

    return this.passwordErrorMessage.startsWith('Current password is incorrect')
      ? this.passwordErrorMessage
      : '';
  }

  passwordHintErrorMessage(): string {
    if (!this.passwordHintMode) {
      return '';
    }

    if (this.passwordErrorMessage === 'Enter the password hint saved for this account.') {
      return this.passwordErrorMessage;
    }

    return this.passwordErrorMessage === 'The password hint is incorrect for this account.'
      ? this.passwordErrorMessage
      : '';
  }

  newPasswordErrorMessage(): string {
    return this.passwordErrorMessage === 'New password must be at least 6 characters long.' ||
      this.passwordErrorMessage === 'New password must be different from the current password.'
      ? this.passwordErrorMessage
      : '';
  }

  confirmPasswordErrorMessage(): string {
    return this.passwordErrorMessage === 'Confirm password must match the new password.'
      ? this.passwordErrorMessage
      : '';
  }

  passwordActionErrorMessage(): string {
    return this.passwordErrorMessage === 'No password hint is saved for this account yet.'
      ? this.passwordErrorMessage
      : '';
  }

  togglePasswordVisibility(
    field: 'profileCurrent' | 'current' | 'new' | 'confirm'
  ): void {
    if (field === 'profileCurrent') {
      this.showProfileCurrentPassword = !this.showProfileCurrentPassword;
      return;
    }

    if (field === 'current') {
      this.showAccountCurrentPassword = !this.showAccountCurrentPassword;
      return;
    }

    if (field === 'new') {
      this.showAccountNewPassword = !this.showAccountNewPassword;
      return;
    }

    this.showAccountConfirmPassword = !this.showAccountConfirmPassword;
  }
}
