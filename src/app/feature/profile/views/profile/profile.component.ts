import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatDividerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private snackbar = inject(MatSnackBar);

  readonly userProfile = this.authService.userProfile;

  constructor() {}

  ngOnInit(): void {
    // Check if edit mode is requested via query params
    this.route.queryParams.subscribe((params) => {
      if (params['edit'] === 'true') {
        this.openEditModal();
      }
    });
  }

  async openEditModal(): Promise<void> {
    const currentUser = this.userProfile();
    if (!currentUser) return;

    // Dynamic import to avoid circular dependency
    const { EditProfileModalComponent } = await import(
      '../../components/edit-profile-modal/edit-profile-modal.component'
    );

    const dialogRef = this.dialog.open(EditProfileModalComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { user: currentUser },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackbar.open('Profile updated successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  }
}
