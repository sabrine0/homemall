import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/home_models.dart';
import 'api_service.dart';

class AuthState extends ChangeNotifier {
  AuthState() {
    _api = ApiService(readToken: () => _token);
    _bootstrap();
  }

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'homemall_token';
  static const _emailKey = 'homemall_email';

  String? _token;
  String? _email;
  String? _displayName;
  String? _avatarUrl;
  String? _contactPhone;
  String? _contactWhatsApp;
  String? _contactInstagram;
  String? _contactFacebook;
  String? _contactWebsite;
  UserProfile? _profile;
  bool _ready = false;
  late final ApiService _api;

  bool get isReady => _ready;
  bool get isAuthenticated => _token != null;
  String? get email => _email;
  String? get displayName => _displayName;
  String? get avatarUrl => _avatarUrl;
  String? get contactPhone => _contactPhone;
  String? get contactWhatsApp => _contactWhatsApp;
  String? get contactInstagram => _contactInstagram;
  String? get contactFacebook => _contactFacebook;
  String? get contactWebsite => _contactWebsite;
  UserProfile? get profile => _profile;
  ApiService get api => _api;

  Future<void> _bootstrap() async {
    try {
      _token = await _storage.read(key: _tokenKey);
      _email = await _storage.read(key: _emailKey);
      if (_token != null) {
        try {
          final me = await _api.me();
          final user = me['user'] as Map<String, dynamic>? ?? const {};
          _displayName = user['displayName'] as String?;
          _avatarUrl = user['avatarUrl'] as String?;
          _contactPhone = user['contactPhone'] as String?;
          _contactWhatsApp = user['contactWhatsApp'] as String?;
          _contactInstagram = user['contactInstagram'] as String?;
          _contactFacebook = user['contactFacebook'] as String?;
          _contactWebsite = user['contactWebsite'] as String?;
        } catch (_) {}
        _profile = await _api.getProfile();
      }
    } catch (_) {
      _token = null;
      _email = null;
      _displayName = null;
      _avatarUrl = null;
      _contactPhone = null;
      _contactWhatsApp = null;
      _contactInstagram = null;
      _contactFacebook = null;
      _contactWebsite = null;
      _profile = null;
    } finally {
      _ready = true;
      notifyListeners();
    }
  }

  Future<void> _persistSession() async {
    if (_token != null) {
      await _storage.write(key: _tokenKey, value: _token);
    }
    if (_email != null) {
      await _storage.write(key: _emailKey, value: _email);
    }
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email, password);
    _token = result['token'] as String;
    final user = result['user'] as Map<String, dynamic>;
    _email = user['email'] as String;
    _displayName = user['displayName'] as String?;
    _avatarUrl = user['avatarUrl'] as String?;
    _contactPhone = user['contactPhone'] as String?;
    _contactWhatsApp = user['contactWhatsApp'] as String?;
    _contactInstagram = user['contactInstagram'] as String?;
    _contactFacebook = user['contactFacebook'] as String?;
    _contactWebsite = user['contactWebsite'] as String?;
    _profile = await _api.getProfile();
    await _persistSession();
    notifyListeners();
  }

  Future<void> signup(String email, String password) async {
    final result = await _api.signup(email, password);
    _token = result['token'] as String;
    final user = result['user'] as Map<String, dynamic>;
    _email = user['email'] as String;
    _displayName = user['displayName'] as String?;
    _avatarUrl = user['avatarUrl'] as String?;
    _contactPhone = user['contactPhone'] as String?;
    _contactWhatsApp = user['contactWhatsApp'] as String?;
    _contactInstagram = user['contactInstagram'] as String?;
    _contactFacebook = user['contactFacebook'] as String?;
    _contactWebsite = user['contactWebsite'] as String?;
    _profile = await _api.getProfile();
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateAccount({
    String? displayName,
    String? avatarUrl,
    String? contactPhone,
    String? contactWhatsApp,
    String? contactInstagram,
    String? contactFacebook,
    String? contactWebsite,
  }) async {
    if (!isAuthenticated) return;
    final result = await _api.updateMe(
      displayName: displayName,
      avatarUrl: avatarUrl,
      contactPhone: contactPhone,
      contactWhatsApp: contactWhatsApp,
      contactInstagram: contactInstagram,
      contactFacebook: contactFacebook,
      contactWebsite: contactWebsite,
    );
    final user = result['user'] as Map<String, dynamic>? ?? const {};
    _displayName = user['displayName'] as String?;
    _avatarUrl = user['avatarUrl'] as String?;
    _contactPhone = user['contactPhone'] as String?;
    _contactWhatsApp = user['contactWhatsApp'] as String?;
    _contactInstagram = user['contactInstagram'] as String?;
    _contactFacebook = user['contactFacebook'] as String?;
    _contactWebsite = user['contactWebsite'] as String?;
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    if (!isAuthenticated) return;
    _profile = await _api.getProfile();
    notifyListeners();
  }

  Future<void> saveProfile(UserProfile profile) async {
    _profile = await _api.upsertProfile(profile);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {
      // Ignore backend logout failures and clear local state anyway.
    }
    _token = null;
    _email = null;
    _displayName = null;
    _avatarUrl = null;
    _contactPhone = null;
    _contactWhatsApp = null;
    _contactInstagram = null;
    _contactFacebook = null;
    _contactWebsite = null;
    _profile = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _emailKey);
    notifyListeners();
  }
}
