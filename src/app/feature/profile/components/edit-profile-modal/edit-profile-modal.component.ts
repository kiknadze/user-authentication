import { Component, signal, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, startWith, map } from 'rxjs';
import { AuthService } from '@core';
import { SharedConstants, SharedModels } from '@shared';
import { DisableControlDirective } from '@shared/directives';

interface EditProfileData {
  user: SharedModels.User;
}

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DisableControlDirective,
  ],
  templateUrl: './edit-profile-modal.component.html',
  styleUrls: ['./edit-profile-modal.component.scss'],
})
export class EditProfileModalComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<EditProfileModalComponent>);

  private _selectedAvatar = signal<string | null>(null);
  private _countries = signal<SharedModels.Country[]>(SharedModels.COUNTRIES);
  private _errorMessage = signal<string | null>(null);
  private _isSubmitting = signal<boolean>(false);

  readonly selectedAvatar = this._selectedAvatar.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly isLoading = this.authService.isLoading;

  editForm: FormGroup;
  filteredCountries: Observable<SharedModels.Country[]>;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EditProfileData) {
    const user = this.data.user;

    // Initialize avatar
    this._selectedAvatar.set(user.avatar);

    // Initialize form with current user data
    this.editForm = this.fb.group({
      email: [user.email],
      phone: [user.phone],
      username: [user.username, [Validators.required, Validators.minLength(3)]],
      birthDate: [user.birthDate, Validators.required],
      country: [user.country, Validators.required],
      website: [user.website, [Validators.pattern(/^https?:\/\/.+/)]],
    });

    // Set up country autocomplete
    const countryControl = this.editForm.get('country');
    this.filteredCountries = countryControl!.valueChanges.pipe(
      startWith(user.country),
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

  onSave(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this._isSubmitting.set(true);
    this._errorMessage.set(null);

    const formValue = this.editForm.value;
    const updates = {
      avatar: this._selectedAvatar(),
      username: formValue.username,
      birthDate: new Date(formValue.birthDate),
      country: formValue.country,
      website: formValue.website || '',
    };

    this.authService.updateProfile(updates).subscribe({
      next: (response) => {
        this._isSubmitting.set(false);
        if (response.success) {
          this.dialogRef.close(true);
        } else {
          this._errorMessage.set(response.error || 'Update failed');
        }
      },
      error: (error) => {
        this._isSubmitting.set(false);
        this._errorMessage.set('Update failed. Please try again.');
        console.error('Profile update error:', error);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
