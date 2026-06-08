import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="app-container">
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [`
    .main-content {
      flex: 1;
      padding-bottom: 7rem; /* Space for bottom nav */
    }
  `]
})
export class AppComponent {
  title = 'PetNeighbor';
}
