import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { SupabaseService } from '../../services/supabase.service';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let supabaseSpy: jasmine.SpyObj<SupabaseService>;
  let navigateSpy: jasmine.Spy;
  let queryParams: Record<string, string>;
  let routeData: Record<string, string>;

  beforeEach(async () => {
    const sSpy = jasmine.createSpyObj('SupabaseService', ['login', 'loginCuidador']);
    queryParams = {};
    routeData = {};

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: sSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { get data() { return routeData; }, get queryParamMap() { return convertToParamMap(queryParams); } } } }
      ]
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    supabaseSpy = TestBed.inject(SupabaseService) as jasmine.SpyObj<SupabaseService>;
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
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('should normalize the e-mail before logging in', () => {
    component.loginForm.patchValue({ email: 'Tutor@Example.COM', senha: '123' });
    supabaseSpy.login.and.returnValue(of([]));
    component.onSubmit();
    expect(supabaseSpy.login).toHaveBeenCalledWith('tutor@example.com', '123');
  });

  it('should return to the internal returnUrl after login', () => {
    queryParams = { returnUrl: '/chat/3' };
    component.loginForm.patchValue({ email: 'tutor@example.com', senha: '123' });
    supabaseSpy.login.and.returnValue(of([{ id_user: 1 }] as any));
    component.onSubmit();
    expect(navigateSpy).toHaveBeenCalledWith('/chat/3');
  });

  it('should ignore external returnUrl (open redirect)', () => {
    for (const url of ['https://malicioso.com', '//malicioso.com']) {
      navigateSpy.calls.reset();
      queryParams = { returnUrl: url };
      component.loginForm.patchValue({ email: 'tutor@example.com', senha: '123' });
      supabaseSpy.login.and.returnValue(of([{ id_user: 1 }] as any));
      component.onSubmit();
      expect(navigateSpy).toHaveBeenCalledWith('/');
    }
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

  it('no papel cuidador, usa o login de cuidador e vai para o painel', () => {
    routeData = { papel: 'cuidador' };
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.loginForm.patchValue({ email: 'ana@cuidadores.com', senha: '123' });
    supabaseSpy.loginCuidador.and.returnValue(of([{ id_cuidador: 3 }] as any));
    component.onSubmit();

    expect(component.papel).toBe('cuidador');
    expect(supabaseSpy.loginCuidador).toHaveBeenCalledWith('ana@cuidadores.com', '123');
    expect(supabaseSpy.login).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/area-cuidador');
  });
});
