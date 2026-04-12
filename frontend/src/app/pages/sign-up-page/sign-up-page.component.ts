import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { AuthForm } from '../../models/storefront.model';

@Component({
  selector: 'app-sign-up-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-up-page.component.html'
})
export class SignUpPageComponent {
  @Input({ required: true }) form!: AuthForm;
  @Input() noticeMessage = '';
  @Input() errorMessage = '';

  @Output() submitForm = new EventEmitter<void>();
  @Output() openSignIn = new EventEmitter<void>();
  @Output() backHome = new EventEmitter<void>();

  showPassword = false;

  handleSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitForm.emit();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
