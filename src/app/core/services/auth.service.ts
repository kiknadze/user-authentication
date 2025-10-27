import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SharedInterfaces, SharedModels } from '@shared';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _currentUser = signal<SharedModels.AuthUser | null>(null);
  private _isLoading = signal<boolean>(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isLoading = this._isLoading.asReadonly();
  readonly userProfile = computed(() => this._currentUser()?.user || null);

  constructor(private apiService: ApiService, private router: Router) {
    // Initialize with stored user data
    const storedUser = this.apiService.getCurrentUser();
    if (storedUser) {
      this._currentUser.set(storedUser);
    }

    // Auto-redirect effect
    effect(() => {
      const isAuth = this.isAuthenticated();
      const currentPath = this.router.url;

      if (
        isAuth &&
        (currentPath === '/register' ||
          currentPath === '/verify' ||
          currentPath === '/')
      ) {
        this.router.navigate(['/profile']);
      }
    });
  }

  register(
    data: SharedModels.RegistrationData
  ): Observable<SharedInterfaces.ApiResponse<{ userId: string }>> {
    this._isLoading.set(true);

    return this.apiService
      .registerUser(data)
      .pipe(tap(() => this._isLoading.set(false)));
  }

  sendVerificationCode(
    userId: string
  ): Observable<SharedInterfaces.ApiResponse<{ sessionId: string }>> {
    this._isLoading.set(true);

    return this.apiService
      .sendVerificationCode(userId)
      .pipe(tap(() => this._isLoading.set(false)));
  }

  verifyCode(
    sessionId: string,
    code: string
  ): Observable<SharedInterfaces.ApiResponse<SharedModels.AuthUser>> {
    this._isLoading.set(true);

    return this.apiService.verifyCode(sessionId, code).pipe(
      tap((response) => {
        this._isLoading.set(false);
        if (response.success && response.data) {
          this._currentUser.set(response.data);
          this.router.navigate(['/profile']);
        }
      })
    );
  }

  logout(): void {
    this._isLoading.set(true);

    this.apiService.logout().subscribe({
      next: () => {
        this._currentUser.set(null);
        this._isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this._isLoading.set(false);
      },
    });
  }

  updateProfile(
    updates: Partial<
      Omit<
        SharedModels.User,
        | 'id'
        | 'email'
        | 'phone'
        | 'isVerified'
        | 'verificationMethod'
        | 'createdAt'
      >
    >
  ): Observable<SharedInterfaces.ApiResponse<SharedModels.User>> {
    const currentUser = this._currentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    this._isLoading.set(true);

    return this.apiService.updateProfile(currentUser.user.id, updates).pipe(
      tap((response) => {
        this._isLoading.set(false);
        if (response.success && response.data) {
          // Update the current user signal
          const updatedAuthUser: SharedModels.AuthUser = {
            ...currentUser,
            user: response.data,
          };
          this._currentUser.set(updatedAuthUser);
        }
      })
    );
  }

  // Navigation helpers
  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToEditProfile(): void {
    this.router.navigate(['/profile'], { queryParams: { edit: 'true' } });
  }
}
