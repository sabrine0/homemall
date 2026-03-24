import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'localization/app_strings.dart';
import 'screens/splash_gate.dart';
import 'services/auth_state.dart';
import 'services/app_locale_state.dart';
import 'theme/app_design.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()),
        ChangeNotifierProvider(create: (_) => AppLocaleState()),
      ],
      child: const HomeMallApp(),
    ),
  );
}

class HomeMallApp extends StatelessWidget {
  const HomeMallApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppLocaleState>(
      builder: (context, localeState, _) {
        final strings = AppStrings(localeState.languageCode);

        return MaterialApp(
          title: strings.t('app_name'),
          debugShowCheckedModeBanner: false,
          theme: buildHomeMallTheme(),
          locale: localeState.locale,
          supportedLocales: AppLocaleState.supportedLocales,
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          home: const SplashGate(),
        );
      },
    );
  }
}
