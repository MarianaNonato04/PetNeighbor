import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { authGuard, cuidadorGuard } from './guards/auth.guard';



export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'cadastro-usuario', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'cadastro-pet', loadComponent: () => import('./components/pet-register/pet-register.component').then(m => m.PetRegisterComponent) },
  { path: 'meus-pets', loadComponent: () => import('./components/my-pets/my-pets.component').then(m => m.MyPetsComponent) },
  { path: 'perfil', loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent) },

  { path: 'explorar', loadComponent: () => import('./components/explorar/explorar.component').then(m => m.ExplorarComponent) },
  { path: 'cuidador/:id', loadComponent: () => import('./components/cuidador-detalhe/cuidador-detalhe.component').then(m => m.CuidadorDetalheComponent) },
  { path: 'seja-cuidador', loadComponent: () => import('./components/cuidador-register/cuidador-register.component').then(m => m.CuidadorRegisterComponent) },

  
  { path: 'agendar/:id', canActivate: [authGuard], loadComponent: () => import('./components/agendar/agendar.component').then(m => m.AgendarComponent) },
  { path: 'agenda', loadComponent: () => import('./components/agenda/agenda.component').then(m => m.AgendaComponent) },

  { path: 'chat/:id', canActivate: [authGuard], loadComponent: () => import('./components/chat/chat.component').then(m => m.ChatComponent) },
  
  { path: 'area-cuidador/login', data: { papel: 'cuidador' }, loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'area-cuidador', canActivate: [cuidadorGuard], loadComponent: () => import('./components/painel-cuidador/painel-cuidador.component').then(m => m.PainelCuidadorComponent) },
  { path: 'area-cuidador/chat/:id', canActivate: [cuidadorGuard], data: { papel: 'cuidador' }, loadComponent: () => import('./components/chat/chat.component').then(m => m.ChatComponent) },

  { path: 'privacidade', loadComponent: () => import('./components/privacidade/privacidade.component').then(m => m.PrivacidadeComponent) },

  { path: 'notificacoes', loadComponent: () => import('./components/notificacoes/notificacoes.component').then(m => m.NotificacoesComponent) },

  { path: '**', redirectTo: '' }
];
