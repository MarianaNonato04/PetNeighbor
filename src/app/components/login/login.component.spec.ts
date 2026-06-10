import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let supabaseSpy: jasmine.SpyObj<SupabaseService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const sSpy = jasmine.createSpyObj('SupabaseService', ['login']);
    const rSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: SupabaseService, useValue: sSpy },
        { provide: Router, useValue: rSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    supabaseSpy = TestBed.inject(SupabaseService) as jasmine.SpyObj<SupabaseService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create login component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with invalid form', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeTrue();
  });

  it('should validate controls', () => {
    const emailCtrl = component.loginForm.get('email');
    emailCtrl?.setValue('');
    expect(emailCtrl?.valid).toBeFalse();
    expect(emailCtrl?.hasError('required')).toBeTrue();

    emailCtrl?.setValue('invalid-email');
    expect(emailCtrl?.valid).toBeFalse();
    expect(emailCtrl?.hasError('email')).toBeTrue();

    emailCtrl?.setValue('valid@example.com');
    expect(emailCtrl?.valid).toBeTrue();
  });

  it('should navigate to home on successful login', () => {
    component.loginForm.patchValue({ email: 'tutor@example.com', senha: '123' });
    expect(component.loginForm.valid).toBeTrue();

    const mockUser = { id_user: 1, nome: 'Tutor' };
    supabaseSpy.login.and.returnValue(of([mockUser] as any));

    component.onSubmit();

    expect(component.isSubmitting()).toBeTrue();
    expect(supabaseSpy.login).toHaveBeenCalledWith('tutor@example.com', '123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show error message on invalid credentials', () => {
    component.loginForm.patchValue({ email: 'tutor@example.com', senha: 'wrong' });
    supabaseSpy.login.and.returnValue(of([]));

    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBe('E-mail ou senha incorretos.');
  });

  it('should show error message on login error', () => {
    component.loginForm.patchValue({ email: 'tutor@example.com', senha: '123' });
    supabaseSpy.login.and.returnValue(throwError(() => new Error('DB Error')));

    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBe('Ocorreu um erro ao tentar entrar. Tente novamente.');
  });
});
