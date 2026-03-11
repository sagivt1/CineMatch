import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { TopbarComponent } from './core/layout/topbar/topbar';
import { FooterComponent } from './core/layout/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('frontend');
  readonly pageVisible = signal(false);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.pageVisible.set(false);
        return;
      }

      if (event instanceof NavigationEnd) {
        requestAnimationFrame(() => this.pageVisible.set(true));
        setTimeout(() => {
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo(0, 0);
        }, 50);
      }
    });
  }
}
