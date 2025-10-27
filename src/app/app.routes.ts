import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from '@core';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/register',
    pathMatch: 'full'
  },
  {
    path: 'register',
    loadComponent: () => import('./feature/auth').then(m => m.RegisterComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'verify',
    loadComponent: () => import('./feature/auth').then(m => m.VerifyComponent),
    canActivate: [GuestGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./feature/profile').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/register'
  }
];
