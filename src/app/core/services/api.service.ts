import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedInterfaces, SharedModels } from '@shared';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private users: Map<string, SharedModels.User> = new Map();
  private verificationSessions: Map<string, SharedModels.VerificationSession> =
    new Map();
  private currentUser: SharedModels.AuthUser | null = null;

  constructor(private snackBar: MatSnackBar) {
    this.loadFromStorage();
  }

  registerUser(
    data: SharedModels.RegistrationData
  ): Observable<SharedInterfaces.ApiResponse<{ userId: string }>> {
    return new Observable((observer) => {
      setTimeout(() => {
        // Check if user already exists
        const existingUser = Array.from(this.users.values()).find(
          (user) => user.email === data.email || user.username === data.username
        );

        if (existingUser) {
          observer.next({
            success: false,
            error: 'User with this email or username already exists',
          });
          observer.complete();
          return;
        }

        const userId = this.generateId();
        const user: SharedModels.User = {
          id: userId,
          avatar: data.avatar,
          username: data.username,
          email: data.email,
          birthDate: data.birthDate,
          country: data.country,
          phone: data.phone,
          website: data.website,
          isVerified: false,
          verificationMethod: data.verificationMethod,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.users.set(userId, user);
        this.saveToStorage();

        observer.next({
          success: true,
          data: { userId },
        });
        observer.complete();
      }, 1000); // Simulate API delay
    });
  }

  sendVerificationCode(
    userId: string
  ): Observable<SharedInterfaces.ApiResponse<{ sessionId: string }>> {
    return new Observable((observer) => {
      setTimeout(() => {
        const user = this.users.get(userId);
        if (!user) {
          observer.next({
            success: false,
            error: 'User not found',
          });
          observer.complete();
          return;
        }

        const sessionId = this.generateId();
        const code = this.generateVerificationCode();
        const session: SharedModels.VerificationSession = {
          userId,
          code,
          method: user.verificationMethod,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
          attempts: 0,
          maxAttempts: 3,
        };

        this.verificationSessions.set(sessionId, session);

        // Show verification code in snackbar (simulate sending code)
        this.snackBar.open(
          `Verification code for ${user.verificationMethod}: ${code}`,
          'Close',
          {
            duration: 10000, // Show for 10 seconds
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['verification-code-snackbar'],
          }
        );

        observer.next({
          success: true,
          data: { sessionId },
        });
        observer.complete();
      }, 800);
    });
  }

  verifyCode(
    sessionId: string,
    code: string
  ): Observable<SharedInterfaces.ApiResponse<SharedModels.AuthUser>> {
    return new Observable((observer) => {
      setTimeout(() => {
        const session = this.verificationSessions.get(sessionId);
        if (!session) {
          observer.next({
            success: false,
            error: 'Invalid verification session',
          });
          observer.complete();
          return;
        }

        if (new Date() > session.expiresAt) {
          observer.next({
            success: false,
            error: 'Verification code expired',
          });
          observer.complete();
          return;
        }

        if (session.attempts >= session.maxAttempts) {
          observer.next({
            success: false,
            error: 'Maximum verification attempts exceeded',
          });
          observer.complete();
          return;
        }

        session.attempts++;

        if (session.code !== code) {
          observer.next({
            success: false,
            error: 'Invalid verification code',
          });
          observer.complete();
          return;
        }

        // Mark user as verified
        const user = this.users.get(session.userId);
        if (user) {
          user.isVerified = true;
          user.updatedAt = new Date();
          this.users.set(user.id, user);

          const authUser: SharedModels.AuthUser = {
            user,
          };

          this.currentUser = authUser;
          this.verificationSessions.delete(sessionId);
          this.saveToStorage();

          observer.next({
            success: true,
            data: authUser,
          });
        } else {
          observer.next({
            success: false,
            error: 'User not found',
          });
        }
        observer.complete();
      }, 500);
    });
  }

  logout(): Observable<SharedInterfaces.ApiResponse<void>> {
    return new Observable((observer) => {
      setTimeout(() => {
        this.currentUser = null;
        this.saveToStorage();
        observer.next({ success: true });
        observer.complete();
      }, 200);
    });
  }

  updateProfile(
    userId: string,
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
    return new Observable((observer) => {
      setTimeout(() => {
        const user = this.users.get(userId);
        if (!user) {
          observer.next({
            success: false,
            error: 'User not found',
          });
          observer.complete();
          return;
        }

        const updatedUser: SharedModels.User = {
          ...user,
          ...updates,
          updatedAt: new Date(),
        };

        this.users.set(userId, updatedUser);

        // Update current user if it's the same user
        if (this.currentUser && this.currentUser.user.id === userId) {
          this.currentUser.user = updatedUser;
        }

        this.saveToStorage();

        observer.next({
          success: true,
          data: updatedUser,
        });
        observer.complete();
      }, 600);
    });
  }

  getCurrentUser(): SharedModels.AuthUser | null {
    return this.currentUser;
  }

  getCountries(): Observable<SharedModels.Country[]> {
    return of(SharedModels.COUNTRIES).pipe(delay(200));
  }

  searchCountries(query: string): Observable<SharedModels.Country[]> {
    const filtered = SharedModels.COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query.toLowerCase()) ||
        country.code.toLowerCase().includes(query.toLowerCase())
    );
    return of(filtered).pipe(delay(200));
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        'users',
        JSON.stringify(Array.from(this.users.entries()))
      );
      if (this.currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('currentUser');
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const usersData = localStorage.getItem('users');
      if (usersData) {
        const userEntries = JSON.parse(usersData);
        this.users = new Map(
          userEntries.map(([id, user]: [string, SharedModels.User]) => [
            id,
            {
              ...user,
              birthDate: new Date(user.birthDate),
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          ])
        );
      }

      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        const userData = JSON.parse(currentUserData);
        this.currentUser = {
          ...userData,
          user: {
            ...userData.user,
            birthDate: new Date(userData.user.birthDate),
            createdAt: new Date(userData.user.createdAt),
            updatedAt: new Date(userData.user.updatedAt),
          },
        };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
}
