import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer';

describe('FooterComponent (QA Agent)', () => {
    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FooterComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the current year', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const currentYear = new Date().getFullYear().toString();
        const copyrightText = compiled.querySelector('.copyright');
        expect(copyrightText?.textContent).toContain(currentYear);
    });

    it('should have standard legal and action links at the bottom', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const links = compiled.querySelectorAll('.footer-link');
        expect(links.length).toBe(3);
        const linkTexts = Array.from(links).map(l => l.textContent?.trim());
        expect(linkTexts).toContain('Privacy');
        expect(linkTexts).toContain('Terms');
        expect(linkTexts).toContain('Contact');
    });
});
