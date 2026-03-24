import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/home_models.dart';

typedef TokenReader = String? Function();

class ApiService {
  ApiService({required this.readToken, http.Client? client})
    : _client = client ?? http.Client();

  final TokenReader readToken;
  final http.Client _client;

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  Map<String, String> _headers({bool json = true}) {
    final headers = <String, String>{};
    if (json) {
      headers['Content-Type'] = 'application/json';
    }

    final token = readToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final request = http.Request(method, _uri(path));
    request.headers.addAll(_headers());
    if (body != null) {
      request.body = jsonEncode(body);
    }

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode == 204) {
      return {};
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 400) {
      throw Exception(decoded['message'] ?? 'API request failed');
    }

    return decoded;
  }

  Future<Map<String, dynamic>> signup(String email, String password) {
    return _request(
      'POST',
      '/api/auth/signup',
      body: {'email': email, 'password': password},
    );
  }

  Future<Map<String, dynamic>> login(String email, String password) {
    return _request(
      'POST',
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
  }

  Future<Map<String, dynamic>> requestPasswordReset(String email) {
    return _request(
      'POST',
      '/api/auth/forgot-password',
      body: {'email': email},
    );
  }

  Future<void> verifyPasswordResetCode({
    required String email,
    required String code,
  }) async {
    await _request(
      'POST',
      '/api/auth/forgot-password/verify',
      body: {'email': email, 'code': code},
    );
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) {
    return _request(
      'POST',
      '/api/auth/reset-password',
      body: {'email': email, 'code': code, 'newPassword': newPassword},
    );
  }

  Future<Map<String, dynamic>> me() => _request('GET', '/api/auth/me');

  Future<Map<String, dynamic>> updateMe({
    String? displayName,
    String? avatarUrl,
    String? contactPhone,
    String? contactWhatsApp,
    String? contactInstagram,
    String? contactFacebook,
    String? contactWebsite,
  }) {
    return _request(
      'PATCH',
      '/api/auth/me',
      body: {
        if (displayName != null) 'displayName': displayName,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (contactPhone != null) 'contactPhone': contactPhone,
        if (contactWhatsApp != null) 'contactWhatsApp': contactWhatsApp,
        if (contactInstagram != null) 'contactInstagram': contactInstagram,
        if (contactFacebook != null) 'contactFacebook': contactFacebook,
        if (contactWebsite != null) 'contactWebsite': contactWebsite,
      },
    );
  }

  Future<String> uploadProfileImage({
    required List<int> bytes,
    required String fileName,
  }) async {
    final request = http.MultipartRequest('POST', _uri('/api/listings/upload'));
    request.headers.addAll(_headers(json: false));
    request.files.add(
      http.MultipartFile.fromBytes('files', bytes, filename: fileName),
    );

    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    final decoded = response.body.isNotEmpty
        ? jsonDecode(response.body) as Map<String, dynamic>
        : <String, dynamic>{};

    if (response.statusCode >= 400) {
      throw Exception(decoded['message'] ?? 'Profile image upload failed');
    }

    final files = decoded['files'] as List<dynamic>? ?? const <dynamic>[];
    if (files.isEmpty) {
      throw Exception('No uploaded image returned');
    }

    final firstFile = files.first as Map<String, dynamic>;
    final mimeType = firstFile['mimeType'] as String? ?? '';
    if (!mimeType.startsWith('image/')) {
      throw Exception('Only image files are allowed');
    }

    final url = firstFile['url'] as String?;
    if (url == null || url.isEmpty) {
      throw Exception('Uploaded image URL is missing');
    }
    return url;
  }

  Future<void> logout() async {
    await _request('POST', '/api/auth/logout');
  }

  Future<UserProfile?> getProfile() async {
    try {
      final result = await _request('GET', '/api/profile');
      return UserProfile.fromJson(result['profile'] as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<UserProfile> upsertProfile(UserProfile profile) async {
    final result = await _request(
      'POST',
      '/api/profile/save',
      body: profile.toJson(),
    );
    return UserProfile.fromJson(result['profile'] as Map<String, dynamic>);
  }

  Future<List<ZoneSummary>> getZones() async {
    final result = await _request('GET', '/api/zones');
    final zones = result['zones'] as List<dynamic>;
    return zones
        .map((item) => ZoneSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ZoneDetails> getZone(String zoneId) async {
    final result = await _request('GET', '/api/zones/$zoneId');
    return ZoneDetails.fromJson(result['zone'] as Map<String, dynamic>);
  }

  Future<List<ListingOffer>> getListings({
    String? zoneId,
    String? purpose,
    bool mine = false,
    int limit = 50,
  }) async {
    final query = <String, String>{
      if (zoneId != null && zoneId.isNotEmpty) 'zoneId': zoneId,
      if (purpose != null && purpose.isNotEmpty) 'purpose': purpose,
      if (mine) 'mine': 'true',
      'limit': '$limit',
    };
    final path = query.isEmpty
        ? '/api/listings'
        : '/api/listings?${Uri(queryParameters: query).query}';
    final result = await _request('GET', path);
    final listings = result['listings'] as List<dynamic>? ?? const <dynamic>[];
    return listings
        .whereType<Map<String, dynamic>>()
        .map(ListingOffer.fromJson)
        .toList();
  }

  Future<List<ListingOffer>> getMyListings() async {
    final result = await _request('GET', '/api/listings/mine');
    final listings = result['listings'] as List<dynamic>? ?? const <dynamic>[];
    return listings
        .whereType<Map<String, dynamic>>()
        .map(ListingOffer.fromJson)
        .toList();
  }

  Future<ListingOffer> createListing(Map<String, dynamic> payload) async {
    final result = await _request('POST', '/api/listings', body: payload);
    return ListingOffer.fromJson(result['listing'] as Map<String, dynamic>);
  }

  Future<ListingOffer> updateListing(
    String listingId,
    Map<String, dynamic> payload,
  ) async {
    final result = await _request(
      'PATCH',
      '/api/listings/$listingId',
      body: payload,
    );
    return ListingOffer.fromJson(result['listing'] as Map<String, dynamic>);
  }

  Future<void> deleteListing(String listingId) async {
    await _request('DELETE', '/api/listings/$listingId');
  }

  Future<ContactSellerResult> contactSeller(
    String listingId, {
    String? initialMessage,
  }) async {
    final result = await _request(
      'POST',
      '/api/listings/$listingId/contact',
      body: {
        if (initialMessage != null && initialMessage.trim().isNotEmpty)
          'initialMessage': initialMessage.trim(),
      },
    );
    return ContactSellerResult.fromJson(result);
  }

  Future<void> reportListing(String listingId, {required String reason}) async {
    await _request(
      'POST',
      '/api/listings/$listingId/report',
      body: {'reason': reason.trim()},
    );
  }

  Future<List<ChatConversation>> getConversations() async {
    final result = await _request('GET', '/api/chats');
    final conversations =
        result['conversations'] as List<dynamic>? ?? const <dynamic>[];
    return conversations
        .whereType<Map<String, dynamic>>()
        .map(ChatConversation.fromJson)
        .toList();
  }

  Future<ConversationMessagesResult> getConversationMessages(
    String conversationId,
  ) async {
    final result = await _request('GET', '/api/chats/$conversationId/messages');
    return ConversationMessagesResult.fromJson(result);
  }

  Future<ChatMessage> sendConversationMessage(
    String conversationId, {
    required String text,
  }) async {
    final result = await _request(
      'POST',
      '/api/chats/$conversationId/messages',
      body: {'text': text},
    );
    return ChatMessage.fromJson(result['message'] as Map<String, dynamic>);
  }

  Future<TclResult> analyzeTcl({
    UserProfile? profile,
    required Map<String, dynamic> optionA,
    required Map<String, dynamic> optionB,
  }) async {
    final payload = <String, dynamic>{'optionA': optionA, 'optionB': optionB};
    if (profile != null) {
      payload['profile'] = profile.toJson();
    }

    final result = await _request('POST', '/api/analyze/tcl', body: payload);
    return TclResult.fromJson(result);
  }

  Future<Map<String, double>> analyzeZones({UserProfile? profile}) async {
    final payload = <String, dynamic>{};
    if (profile != null) {
      payload['profile'] = profile.toJson();
    }

    final result = await _request('POST', '/api/analyze/zones', body: payload);

    final recommendations = result['recommendations'] as List<dynamic>? ?? [];
    final scores = <String, double>{};
    for (final item in recommendations) {
      final row = item as Map<String, dynamic>;
      final score = ((row['score'] as Map<String, dynamic>)['total'] as num)
          .toDouble();
      scores[row['zoneId'] as String] = score;
    }
    return scores;
  }

  Future<CopilotChatResult> copilotChat({
    required String message,
    UserProfile? profile,
  }) async {
    final payload = <String, dynamic>{'message': message};
    if (profile != null) {
      payload['context'] = profile.toJson();
    }

    final result = await _request('POST', '/api/copilot/chat', body: payload);
    return CopilotChatResult.fromJson(result);
  }

  Future<void> addFavorite(String zoneId, {String? note}) async {
    await _request(
      'POST',
      '/api/favorites',
      body: {'zoneId': zoneId, if (note != null) 'note': note},
    );
  }

  Future<Map<String, dynamic>> getReport() {
    return _request('GET', '/api/report');
  }
}
