import * as auth from './generated/core-api/auth/auth';
import type {
  GoogleLoginDto,
  LoginDto,
  MyProfileDto,
  RegisterDto,
  TokenPairDto,
} from './generated/core-api/model';
import { configureHttp, HttpError, type HttpRequestOptions } from './http';
import { readEntity } from './response';

export interface TokenStorage {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}
export interface SessionOptions {
  baseUrl: string;
  client: 'web' | 'native';
  storage?: TokenStorage;
}
export interface SessionState {
  user: MyProfileDto | null;
  isReady: boolean;
  error: unknown;
}

export class SessionClient {
  private accessToken: string | null = null;
  private accessExpiresAt = 0;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private initializationPromise: Promise<void> | null = null;
  private storageOperation: Promise<void> = Promise.resolve();
  private version = 0;
  private listeners = new Set<() => void>();
  private state: SessionState = { user: null, isReady: false, error: null };
  readonly authOptions: HttpRequestOptions;

  constructor(private readonly options: SessionOptions) {
    this.authOptions = {
      skipAuthRefresh: true,
      skipAuthorization: true,
      ...(options.client === 'web'
        ? { credentials: 'include' as const, headers: { 'X-Tripflix-Client': 'web' } }
        : {}),
    };
    this.connectHttp();
  }

  /** Rebind the retained provider instance after React's development initializer checks. */
  connectHttp(): void {
    configureHttp({
      baseUrl: this.options.baseUrl,
      credentials: this.options.client === 'web' ? 'include' : 'omit',
      // Optional-auth endpoints treat expired tokens as anonymous; refresh before sending those too.
      getAccessToken: async () => {
        if (this.accessToken && Date.now() >= this.accessExpiresAt - 30_000) await this.refresh();
        return this.accessToken;
      },
      refreshAccessToken: () => this.refresh(),
    });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = (): SessionState => this.state;
  private publish(next: Partial<SessionState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  initialize(): Promise<void> {
    this.initializationPromise ??= this.restore().finally(() => {
      this.initializationPromise = null;
    });
    return this.initializationPromise;
  }

  private async restore(): Promise<void> {
    try {
      this.refreshToken = (await this.options.storage?.read()) ?? null;
      if (this.options.client === 'web' || this.refreshToken) {
        if (await this.refresh()) await this.reloadUser();
      }
      this.publish({ isReady: true, error: null });
    } catch (error) {
      this.publish({ isReady: true, error });
    }
  }

  private async acceptTokens(pair: TokenPairDto, version: number): Promise<boolean> {
    if (version !== this.version) return false;
    if (this.options.client === 'native') {
      if (!pair.refreshToken) throw new Error('Missing native refresh token');
      await this.persist(async () => {
        if (version === this.version) await this.options.storage?.write(pair.refreshToken!);
      });
      if (version !== this.version) return false;
      this.refreshToken = pair.refreshToken;
    }
    this.accessToken = pair.accessToken;
    this.accessExpiresAt = Date.now() + pair.expiresIn * 1000;
    return true;
  }

  refresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    const version = this.version;
    this.refreshPromise = (async () => {
      if (this.options.client === 'native' && !this.refreshToken) return false;
      try {
        const response = await auth.authControllerRefresh(
          this.options.client === 'native' ? { refreshToken: this.refreshToken! } : {},
          this.authOptions,
        );
        return await this.acceptTokens(
          readEntity(response.data, ['accessToken', 'tokenType', 'expiresIn']),
          version,
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          if (version === this.version) await this.clear();
          return false;
        }
        throw error;
      }
    })().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async login(credentials: LoginDto): Promise<void> {
    const version = ++this.version;
    const response = await auth.authControllerLogin(credentials, this.authOptions);
    if (
      await this.acceptTokens(readEntity(response.data, ['accessToken', 'tokenType', 'expiresIn']), version)
    )
      await this.reloadUser();
  }
  /** Google ID token from Google Identity Services; tokens are kept exactly like a password login. */
  async loginWithGoogle(input: GoogleLoginDto): Promise<void> {
    const version = ++this.version;
    const response = await auth.authControllerLoginWithGoogle(input, this.authOptions);
    if (
      await this.acceptTokens(readEntity(response.data, ['accessToken', 'tokenType', 'expiresIn']), version)
    )
      await this.reloadUser();
  }
  async register(credentials: RegisterDto): Promise<void> {
    await auth.authControllerRegister(credentials, this.authOptions);
    await this.login(credentials);
  }
  async reloadUser(): Promise<MyProfileDto> {
    const version = this.version;
    const response = await auth.authControllerGetMe();
    const user = readEntity(response.data, ['id', 'email', 'displayName', 'role']);
    if (version === this.version) this.publish({ user, error: null });
    return user;
  }

  async refreshUser(): Promise<void> {
    if (await this.refresh()) await this.reloadUser();
  }
  async logout(): Promise<void> {
    await auth.authControllerLogout({
      ...this.authOptions,
      skipAuthRefresh: false,
      skipAuthorization: false,
    });
    await this.clear();
  }
  async logoutAll(): Promise<void> {
    await auth.accountControllerLogoutAll();
    await this.clear();
  }
  private async clear(): Promise<void> {
    ++this.version;
    this.accessToken = null;
    this.accessExpiresAt = 0;
    this.refreshToken = null;
    this.publish({ user: null, error: null });
    await this.persist(async () => {
      await this.options.storage?.clear();
    });
  }
  private persist(operation: () => Promise<void>): Promise<void> {
    this.storageOperation = this.storageOperation.catch(() => undefined).then(operation);
    return this.storageOperation;
  }
}
