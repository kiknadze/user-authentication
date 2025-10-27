import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription, takeWhile } from 'rxjs';
import { AuthService } from '@core';
import { SharedConstants } from '@shared';
import { DisableControlDirective } from '@shared/directives';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DisableControlDirective,
  ],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss'],
})
export class VerifyComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private _userId = signal<string | null>(null);
  private _sessionId = signal<string | null>(null);
  private _timeLeft = signal<number>(
    SharedConstants.VERIFICATION_CODE_EXPIRY_SECONDS
  );
  private _canRequestNewCode = signal<boolean>(false);
  private _errorMessage = signal<string | null>(null);
  private _isSubmitting = signal<boolean>(false);
  private _isSendingCode = signal<boolean>(false);

  private timerSubscription?: Subscription;

  readonly userId = this._userId.asReadonly();
  readonly sessionId = this._sessionId.asReadonly();
  readonly timeLeft = this._timeLeft.asReadonly();
  readonly canRequestNewCode = this._canRequestNewCode.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly isSendingCode = this._isSendingCode.asReadonly();
  readonly isLoading = this.authService.isLoading;

  readonly formattedTime = computed(() => {
    const time = this._timeLeft();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  verificationForm: FormGroup;

  constructor() {
    this.verificationForm = this.fb.group({
      verificationCode: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
    });
  }

  ngOnInit(): void {
    // Get userId from query parameters
    this.route.queryParams.subscribe((params) => {
      const userId = params['userId'];
      if (userId) {
        this._userId.set(userId);
        this.sendInitialVerificationCode();
      } else {
        // Redirect to register if no userId
        this.router.navigate(['/register']);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private sendInitialVerificationCode(): void {
    const userId = this._userId();
    if (!userId) return;

    this._isSendingCode.set(true);
    this._errorMessage.set(null);

    this.authService.sendVerificationCode(userId).subscribe({
      next: (response) => {
        this._isSendingCode.set(false);
        if (response.success && response.data) {
          this._sessionId.set(response.data.sessionId);
          this.startTimer();
        } else {
          this._errorMessage.set(
            response.error || 'Failed to send verification code'
          );
        }
      },
      error: (error) => {
        this._isSendingCode.set(false);
        this._errorMessage.set(
          'Failed to send verification code. Please try again.'
        );
        console.error('Send verification code error:', error);
      },
    });
  }

  private startTimer(): void {
    this.stopTimer();
    this._timeLeft.set(SharedConstants.VERIFICATION_CODE_EXPIRY_SECONDS);
    this._canRequestNewCode.set(false);

    this.timerSubscription = interval(1000)
      .pipe(takeWhile(() => this._timeLeft() > 0))
      .subscribe(() => {
        this._timeLeft.update((time) => time - 1);
        if (this._timeLeft() === 0) {
          this._canRequestNewCode.set(true);
        }
      });
  }

  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  onSubmit(): void {
    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      return;
    }

    const sessionId = this._sessionId();
    if (!sessionId) {
      this._errorMessage.set(
        'No active verification session. Please request a new code.'
      );
      return;
    }

    this._isSubmitting.set(true);
    this._errorMessage.set(null);

    const code = this.verificationForm.value.verificationCode;

    this.authService.verifyCode(sessionId, code).subscribe({
      next: (response) => {
        this._isSubmitting.set(false);
        if (response.success) {
          // Navigation is handled by AuthService
          this.stopTimer();
        } else {
          this._errorMessage.set(response.error || 'Invalid verification code');
        }
      },
      error: (error) => {
        this._isSubmitting.set(false);
        this._errorMessage.set('Verification failed. Please try again.');
        console.error('Verification error:', error);
      },
    });
  }

  requestNewCode(): void {
    const userId = this._userId();
    if (!userId) return;

    this._isSendingCode.set(true);
    this._errorMessage.set(null);

    this.authService.sendVerificationCode(userId).subscribe({
      next: (response) => {
        this._isSendingCode.set(false);
        if (response.success && response.data) {
          this._sessionId.set(response.data.sessionId);
          this.startTimer();
          // Clear the form
          this.verificationForm.patchValue({ verificationCode: '' });
        } else {
          this._errorMessage.set(
            response.error || 'Failed to send new verification code'
          );
        }
      },
      error: (error) => {
        this._isSendingCode.set(false);
        this._errorMessage.set(
          'Failed to send new verification code. Please try again.'
        );
        console.error('Send new verification code error:', error);
      },
    });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Remove non-digits

    if (value.length <= SharedConstants.VERIFICATION_CODE_LENGTH) {
      this.verificationForm.patchValue({ verificationCode: value });
    }
  }

  goBack(): void {
    this.router.navigate(['/register']);
  }
}
