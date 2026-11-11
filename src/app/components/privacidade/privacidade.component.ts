import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacidade',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privacidade.component.html',
  styleUrls: ['../agenda/agenda.component.css', './privacidade.component.css']
})
export class PrivacidadeComponent {
  readonly atualizadoEm = '10/11/2026';

  constructor(private location: Location) {}

  voltar() {
    this.location.back();
  }
}
