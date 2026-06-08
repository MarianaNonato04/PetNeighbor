import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/register/register.component';
import { PetRegisterComponent } from './components/pet-register/pet-register.component';
import { MyPetsComponent } from './components/my-pets/my-pets.component';
import { ProfileComponent } from './components/profile/profile.component';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'cadastro-usuario', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'cadastro-pet', component: PetRegisterComponent },
  { path: 'meus-pets', component: MyPetsComponent },
  { path: 'perfil', component: ProfileComponent },
  { path: 'explorar', component: HomeComponent }, // Placeholder
  { path: 'agenda', component: HomeComponent }, // Placeholder
  { path: '**', redirectTo: '' }
];
