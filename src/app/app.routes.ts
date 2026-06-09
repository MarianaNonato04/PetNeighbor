import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/register/register.component';
import { PetRegisterComponent } from './components/pet-register/pet-register.component';
import { MyPetsComponent } from './components/my-pets/my-pets.component';
import { ProfileComponent } from './components/profile/profile.component';
import { LoginComponent } from './components/login/login.component';
import { ExplorarComponent } from './components/explorar/explorar.component';
import { CuidadorDetalheComponent } from './components/cuidador-detalhe/cuidador-detalhe.component';
import { CuidadorRegisterComponent } from './components/cuidador-register/cuidador-register.component';
import { AgendarComponent } from './components/agendar/agendar.component';
import { AgendaComponent } from './components/agenda/agenda.component';
import { ChatComponent } from './components/chat/chat.component';
import { NotificacoesComponent } from './components/notificacoes/notificacoes.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'cadastro-usuario', component: RegisterComponent },
  { path: 'cadastro-pet', component: PetRegisterComponent },
  { path: 'meus-pets', component: MyPetsComponent },
  { path: 'perfil', component: ProfileComponent },

  { path: 'explorar', component: ExplorarComponent },
  { path: 'cuidador/:id', component: CuidadorDetalheComponent },
  { path: 'seja-cuidador', component: CuidadorRegisterComponent },

  { path: 'agendar/:id', component: AgendarComponent },
  { path: 'agenda', component: AgendaComponent },

  { path: 'chat/:id', component: ChatComponent },
  { path: 'notificacoes', component: NotificacoesComponent },

  { path: '**', redirectTo: '' }
];
