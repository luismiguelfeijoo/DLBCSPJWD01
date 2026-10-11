import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';
import { UserService } from './core/service/user.service';
import { UserStore } from './core/store/user.store';
import { registerLocaleData } from '@angular/common';
import localeEnIe from '@angular/common/locales/en-IE';
import { API_URL } from './core/tokens/api-url.token';
import { environment } from '../environments/environment';

registerLocaleData(localeEnIe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'en-IE' },
    { provide: MAT_DATE_LOCALE, useValue: 'en-IE' },
    { provide: API_URL, useValue: environment.apiUrl },
    UserService,
    UserStore,
  ],
};
