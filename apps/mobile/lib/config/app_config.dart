import 'package:flutter/foundation.dart';

class AppConfig {
  // Override at runtime with --dart-define=API_BASE_URL=http://<host>:4000.
  static const String _definedApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    // Flutter web cannot reach Android emulator loopback (10.0.2.2), so we
    // rewrite it to the current browser host when needed.
    if (kIsWeb) {
      if (_definedApiBaseUrl.isNotEmpty) {
        final webHost = Uri.base.host.isEmpty ? 'localhost' : Uri.base.host;
        return _definedApiBaseUrl.replaceFirst('10.0.2.2', webHost);
      }

      final webHost = Uri.base.host.isEmpty ? 'localhost' : Uri.base.host;
      final scheme = Uri.base.scheme == 'https' ? 'https' : 'http';
      return '$scheme://$webHost:4000';
    }

    if (_definedApiBaseUrl.isNotEmpty) {
      return _definedApiBaseUrl;
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }

    return 'http://localhost:4000';
  }
}
