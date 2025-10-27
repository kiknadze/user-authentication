import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, startWith, map } from 'rxjs';
import { AuthService } from '@core';
import { SharedEnums, SharedModels, SharedConstants } from '@shared';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isLoading = this.authService.isLoading;
  private _selectedAvatar = signal<string | null>(null);
  private _countries = signal<SharedModels.Country[]>(SharedModels.COUNTRIES);
  private _errorMessage = signal<string | null>(null);

  readonly selectedAvatar = this._selectedAvatar.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  registrationForm: FormGroup;
  filteredCountries: Observable<SharedModels.Country[]>;

  VerificationMethod = SharedEnums.VerificationMethod;

  constructor() {
    this.registrationForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      country: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s-()]+$/)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      verificationMethod: [
        SharedEnums.VerificationMethod.Email,
        Validators.required,
      ],
    });

    // Set up country autocomplete
    const countryControl = this.registrationForm.get('country');
    this.filteredCountries = countryControl!.valueChanges.pipe(
      startWith(''),
      map((value) => {
        if (typeof value === 'string') {
          return this._filterCountries(value);
        } else if (value && typeof value === 'object') {
          return this._countries();
        }
        return this._countries();
      })
    );
  }

  private _filterCountries(value: string): SharedModels.Country[] {
    const filterValue = value.toLowerCase();
    return this._countries().filter(
      (country) =>
        country.name.toLowerCase().includes(filterValue) ||
        country.code.toLowerCase().includes(filterValue)
    );
  }

  displayCountry(country: SharedModels.Country): string {
    return country ? `${country.flag} ${country.name}` : '';
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this._errorMessage.set('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > SharedConstants.MAX_FILE_SIZE) {
        this._errorMessage.set('Image file size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this._selectedAvatar.set(e.target?.result as string);
        this._errorMessage.set(null);
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this._selectedAvatar.set(null);
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this._errorMessage.set(null);
    const formValue = this.registrationForm.value;

    const registrationData = {
      avatar: this._selectedAvatar(),
      username: formValue.username,
      email: formValue.email,
      birthDate: new Date(formValue.birthDate),
      country: formValue.country,
      phone: formValue.phone,
      website: formValue.website || '',
      verificationMethod: formValue.verificationMethod,
    };

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Navigate to verification with userId
          this.router.navigate(['/verify'], {
            queryParams: { userId: response.data.userId },
          });
        } else {
          this._errorMessage.set(response.error || 'Registration failed');
        }
      },
      error: (error) => {
        this._errorMessage.set('Registration failed. Please try again.');
        console.error('Registration error:', error);
      },
    });
  }
}
