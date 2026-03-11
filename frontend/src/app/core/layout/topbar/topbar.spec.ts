import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

describe('TopbarComponent (QA Agent)', () => {
    let component: TopbarComponent;
    let fixture: ComponentFixture<TopbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TopbarComponent],
            providers: [provideRouter([]), provideHttpClient()]
        }).compileComponents();

        fixture = TestBed.createComponent(TopbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the brand text without emojis or icons', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const brandText = compiled.querySelector('.brand');
        expect(brandText).toBeTruthy();
        expect(brandText?.textContent).toContain('CineMatch');
        // Ensure no emojis/icons are used (QA verification)
        expect(brandText?.textContent?.trim()).toBe('CineMatch');
        expect(compiled.querySelector('img, svg, i, .icon, mat-icon')).toBeNull();
    });

    it('should contain expected navigation links', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const navLinks = compiled.querySelectorAll('.nav-link');
        const getStartedBtn = compiled.querySelector('.btn-primary');

        expect(navLinks.length).toBeGreaterThanOrEqual(3);
        expect(getStartedBtn).toBeTruthy();
        expect(getStartedBtn?.textContent).toContain('Get Started');
    });
});
