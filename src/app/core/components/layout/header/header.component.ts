import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '@core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  private _sideNavOpen = signal(false);

  readonly isMobile = signal(false);
  readonly sideNavOpen = this._sideNavOpen.asReadonly();
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly userProfile = computed(() => this.authService.userProfile());

  constructor(
    private authService: AuthService,
    private breakpointObserver: BreakpointObserver
  ) {
    // Monitor screen size
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (!result.matches) {
          this._sideNavOpen.set(false);
        }
      });
  }

  toggleSideNav(): void {
    this._sideNavOpen.update((value) => !value);
  }

  closeSideNav(): void {
    this._sideNavOpen.set(false);
  }

  onSignIn(): void {
    this.authService.navigateToRegister();
    this.closeSideNav();
  }

  onProfile(): void {
    this.authService.navigateToProfile();
    this.closeSideNav();
  }

  onEditProfile(): void {
    this.authService.navigateToEditProfile();
    this.closeSideNav();
  }

  onLogout(): void {
    this.authService.logout();
    this.closeSideNav();
  }

  onAboutUs(): void {
    console.log('About Us clicked');
  }

  onPricing(): void {
    console.log('Pricing clicked');
  }
}
