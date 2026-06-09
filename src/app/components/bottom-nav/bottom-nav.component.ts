import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent {
  private router = inject(Router);

  private rotasOcultas = ['/login', '/cadastro-usuario', '/chat'];

  visivel = signal(true);

  constructor() {
    this.atualizar(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.atualizar(e.urlAfterRedirects));
  }

  private atualizar(url: string) {
    this.visivel.set(!this.rotasOcultas.some(r => url.startsWith(r)));
  }
}
