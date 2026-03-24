import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

enum AppLanguage { system, en, fr, ar }

class AppLocaleState extends ChangeNotifier {
  AppLocaleState() {
    _selection = AppLanguage.system;
    _locale = _resolveLocale(_selection);
    _bootstrap();
  }

  static const _storage = FlutterSecureStorage();
  static const _storageKey = 'homemall_mobile_language';

  static const supportedLocales = [Locale('en'), Locale('fr'), Locale('ar')];

  late AppLanguage _selection;
  late Locale _locale;

  AppLanguage get selection => _selection;
  Locale get locale => _locale;
  bool get isRtl => _locale.languageCode == 'ar';

  Future<void> _bootstrap() async {
    try {
      final raw = await _storage.read(key: _storageKey);
      final selection = _parseLanguage(raw);
      _selection = selection;
      _locale = _resolveLocale(selection);
    } catch (_) {
      _selection = AppLanguage.system;
      _locale = _resolveLocale(_selection);
    } finally {
      notifyListeners();
    }
  }

  Future<void> setLanguage(AppLanguage language) async {
    _selection = language;
    _locale = _resolveLocale(language);

    if (language == AppLanguage.system) {
      await _storage.delete(key: _storageKey);
    } else {
      await _storage.write(key: _storageKey, value: language.name);
    }

    notifyListeners();
  }

  String get languageCode => _locale.languageCode;

  Locale _resolveLocale(AppLanguage language) {
    switch (language) {
      case AppLanguage.en:
        return const Locale('en');
      case AppLanguage.fr:
        return const Locale('fr');
      case AppLanguage.ar:
        return const Locale('ar');
      case AppLanguage.system:
        final device = ui.PlatformDispatcher.instance.locale;
        final code = device.languageCode.toLowerCase();
        for (final locale in supportedLocales) {
          if (locale.languageCode == code) {
            return locale;
          }
        }
        return const Locale('en');
    }
  }

  AppLanguage _parseLanguage(String? value) {
    switch (value) {
      case 'en':
        return AppLanguage.en;
      case 'fr':
        return AppLanguage.fr;
      case 'ar':
        return AppLanguage.ar;
      default:
        return AppLanguage.system;
    }
  }
}
