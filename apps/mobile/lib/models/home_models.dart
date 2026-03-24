typedef JsonMap = Map<String, dynamic>;

class UserProfile {
  const UserProfile({
    required this.goal,
    required this.budgetMin,
    required this.budgetMax,
    required this.workLat,
    required this.workLng,
    required this.mobilityModes,
    required this.sensitivities,
  });

  final String goal;
  final int budgetMin;
  final int budgetMax;
  final double workLat;
  final double workLng;
  final List<String> mobilityModes;
  final JsonMap sensitivities;

  JsonMap toJson() => {
    'goal': goal,
    'budgetMin': budgetMin,
    'budgetMax': budgetMax,
    'workLat': workLat,
    'workLng': workLng,
    'mobilityModes': mobilityModes,
    'sensitivities': sensitivities,
  };

  factory UserProfile.fromJson(JsonMap json) => UserProfile(
    goal: json['goal'] as String,
    budgetMin: (json['budgetMin'] as num).toInt(),
    budgetMax: (json['budgetMax'] as num).toInt(),
    workLat: (json['workLat'] as num).toDouble(),
    workLng: (json['workLng'] as num).toDouble(),
    mobilityModes: (json['mobilityModes'] as List<dynamic>).cast<String>(),
    sensitivities: (json['sensitivities'] as JsonMap),
  );
}

class ZoneSummary {
  const ZoneSummary({
    required this.id,
    required this.name,
    required this.city,
    required this.centerLat,
    required this.centerLng,
    required this.imageUrl,
    this.imageUrls = const [],
    this.listingInventory,
    required this.overallScore,
    required this.flags,
  });

  final String id;
  final String name;
  final String city;
  final double centerLat;
  final double centerLng;
  final String? imageUrl;
  final List<String> imageUrls;
  final ZoneListingInventory? listingInventory;
  final double overallScore;
  final JsonMap flags;

  factory ZoneSummary.fromJson(JsonMap json) => ZoneSummary(
    id: json['id'] as String,
    name: json['name'] as String,
    city: json['city'] as String,
    centerLat: (json['centerLat'] as num).toDouble(),
    centerLng: (json['centerLng'] as num).toDouble(),
    imageUrl: json['imageUrl'] as String?,
    imageUrls: (json['imageUrls'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<String>()
        .toList(),
    listingInventory: json['listingInventory'] == null
        ? null
        : ZoneListingInventory.fromJson(
            json['listingInventory'] as Map<String, dynamic>,
          ),
    overallScore: (json['overallScore'] as num).toDouble(),
    flags: (json['flags'] as JsonMap),
  );
}

class ListingTypeCounts {
  const ListingTypeCounts({
    required this.apartment,
    required this.house,
    required this.studio,
    required this.villa,
    required this.land,
    required this.total,
  });

  final int apartment;
  final int house;
  final int studio;
  final int villa;
  final int land;
  final int total;

  factory ListingTypeCounts.fromJson(JsonMap json) => ListingTypeCounts(
    apartment: (json['apartment'] as num?)?.toInt() ?? 0,
    house: (json['house'] as num?)?.toInt() ?? 0,
    studio: (json['studio'] as num?)?.toInt() ?? 0,
    villa: (json['villa'] as num?)?.toInt() ?? 0,
    land: (json['land'] as num?)?.toInt() ?? 0,
    total: (json['total'] as num?)?.toInt() ?? 0,
  );
}

class ZoneListingInventory {
  const ZoneListingInventory({
    required this.rent,
    required this.buy,
    required this.total,
    this.source,
  });

  final ListingTypeCounts rent;
  final ListingTypeCounts buy;
  final int total;
  final String? source;

  factory ZoneListingInventory.fromJson(JsonMap json) => ZoneListingInventory(
    rent: ListingTypeCounts.fromJson(
      (json['rent'] as Map<String, dynamic>? ?? const {}),
    ),
    buy: ListingTypeCounts.fromJson(
      (json['buy'] as Map<String, dynamic>? ?? const {}),
    ),
    total: (json['total'] as num?)?.toInt() ?? 0,
    source: json['source'] as String?,
  );
}

class ZoneDetails {
  const ZoneDetails({
    required this.id,
    required this.name,
    required this.city,
    required this.centerLat,
    required this.centerLng,
    required this.imageUrl,
    required this.imageUrls,
    this.listingInventory,
    required this.overallScore,
    required this.metrics,
    required this.breakdown,
    required this.explanations,
    required this.penalties,
    required this.futureOutlook,
    this.listing,
  });

  final String id;
  final String name;
  final String city;
  final double centerLat;
  final double centerLng;
  final String? imageUrl;
  final List<String> imageUrls;
  final ZoneListingInventory? listingInventory;
  final double overallScore;
  final JsonMap metrics;
  final JsonMap breakdown;
  final List<String> explanations;
  final List<String> penalties;
  final JsonMap futureOutlook;
  final PropertyListing? listing;

  factory ZoneDetails.fromJson(JsonMap json) {
    final score = json['score'] as JsonMap? ?? {};

    return ZoneDetails(
      id: json['id'] as String,
      name: json['name'] as String,
      city: json['city'] as String,
      centerLat: (json['centerLat'] as num?)?.toDouble() ?? 0,
      centerLng: (json['centerLng'] as num?)?.toDouble() ?? 0,
      imageUrl: json['imageUrl'] as String?,
      imageUrls: (json['imageUrls'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<String>()
          .toList(),
      listingInventory: json['listingInventory'] == null
          ? null
          : ZoneListingInventory.fromJson(
              json['listingInventory'] as Map<String, dynamic>,
            ),
      overallScore: (json['overallScore'] as num).toDouble(),
      metrics: (json['metrics'] as JsonMap? ?? {}),
      breakdown: (score['breakdown'] as JsonMap? ?? {}),
      explanations:
          (score['explanations'] as List<dynamic>? ?? const <dynamic>[])
              .map((item) => item.toString())
              .toList(),
      penalties: (score['penalties'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => item.toString())
          .toList(),
      futureOutlook: (json['futureOutlook'] as JsonMap? ?? {}),
      listing: json['listing'] == null
          ? null
          : PropertyListing.fromJson(json['listing'] as JsonMap),
    );
  }
}

class PropertyListing {
  const PropertyListing({
    required this.id,
    required this.zoneId,
    required this.title,
    required this.type,
    required this.purpose,
    this.sourcePlatform,
    this.sourceListingId,
    this.sourceUrl,
    this.priceMonthly,
    this.priceSale,
    this.areaM2,
    this.bedrooms,
    this.bathrooms,
    this.imageUrl,
    this.imageUrls = const [],
  });

  final String id;
  final String zoneId;
  final String title;
  final String type;
  final String purpose;
  final String? sourcePlatform;
  final String? sourceListingId;
  final String? sourceUrl;
  final double? priceMonthly;
  final double? priceSale;
  final double? areaM2;
  final double? bedrooms;
  final double? bathrooms;
  final String? imageUrl;
  final List<String> imageUrls;

  factory PropertyListing.fromJson(JsonMap json) => PropertyListing(
    id: json['id'] as String? ?? '',
    zoneId: json['zoneId'] as String? ?? '',
    title: json['title'] as String? ?? '',
    type: json['type'] as String? ?? 'apartment',
    purpose: json['purpose'] as String? ?? 'rent',
    sourcePlatform: json['sourcePlatform'] as String?,
    sourceListingId: json['sourceListingId'] as String?,
    sourceUrl: json['sourceUrl'] as String?,
    priceMonthly: (json['priceMonthly'] as num?)?.toDouble(),
    priceSale: (json['priceSale'] as num?)?.toDouble(),
    areaM2: (json['areaM2'] as num?)?.toDouble(),
    bedrooms: (json['bedrooms'] as num?)?.toDouble(),
    bathrooms: (json['bathrooms'] as num?)?.toDouble(),
    imageUrl: json['imageUrl'] as String?,
    imageUrls: (json['imageUrls'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<String>()
        .toList(),
  );
}

class ListingSellerSummary {
  const ListingSellerSummary({
    required this.id,
    required this.email,
    this.displayName,
    this.companyName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String? displayName;
  final String? companyName;
  final String? avatarUrl;

  factory ListingSellerSummary.fromJson(JsonMap json) => ListingSellerSummary(
    id: json['id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    displayName: json['displayName'] as String?,
    companyName: json['companyName'] as String?,
    avatarUrl: json['avatarUrl'] as String?,
  );
}

class ListingOffer {
  const ListingOffer({
    required this.id,
    required this.zoneId,
    required this.sellerId,
    required this.title,
    required this.type,
    required this.purpose,
    required this.status,
    this.description,
    this.contactPhone,
    this.contactEmail,
    this.contactWhatsApp,
    this.contactInstagram,
    this.contactFacebook,
    this.contactWebsite,
    this.priceMonthly,
    this.priceSale,
    this.areaM2,
    this.bedrooms,
    this.bathrooms,
    this.imageUrl,
    this.imageUrls = const [],
    this.seller,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String zoneId;
  final String sellerId;
  final String title;
  final String type;
  final String purpose;
  final String status;
  final String? description;
  final String? contactPhone;
  final String? contactEmail;
  final String? contactWhatsApp;
  final String? contactInstagram;
  final String? contactFacebook;
  final String? contactWebsite;
  final double? priceMonthly;
  final double? priceSale;
  final double? areaM2;
  final double? bedrooms;
  final double? bathrooms;
  final String? imageUrl;
  final List<String> imageUrls;
  final ListingSellerSummary? seller;
  final String? createdAt;
  final String? updatedAt;

  factory ListingOffer.fromJson(JsonMap json) => ListingOffer(
    id: json['id'] as String? ?? '',
    zoneId: json['zoneId'] as String? ?? '',
    sellerId: json['sellerId'] as String? ?? '',
    title: json['title'] as String? ?? '',
    type: json['type'] as String? ?? 'apartment',
    purpose: json['purpose'] as String? ?? 'rent',
    status: json['status'] as String? ?? 'active',
    description: json['description'] as String?,
    contactPhone: json['contactPhone'] as String?,
    contactEmail: json['contactEmail'] as String?,
    contactWhatsApp: json['contactWhatsApp'] as String?,
    contactInstagram: json['contactInstagram'] as String?,
    contactFacebook: json['contactFacebook'] as String?,
    contactWebsite: json['contactWebsite'] as String?,
    priceMonthly: (json['priceMonthly'] as num?)?.toDouble(),
    priceSale: (json['priceSale'] as num?)?.toDouble(),
    areaM2: (json['areaM2'] as num?)?.toDouble(),
    bedrooms: (json['bedrooms'] as num?)?.toDouble(),
    bathrooms: (json['bathrooms'] as num?)?.toDouble(),
    imageUrl: json['imageUrl'] as String?,
    imageUrls: (json['imageUrls'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<String>()
        .toList(),
    seller: json['seller'] is Map<String, dynamic>
        ? ListingSellerSummary.fromJson(json['seller'] as Map<String, dynamic>)
        : null,
    createdAt: json['createdAt'] as String?,
    updatedAt: json['updatedAt'] as String?,
  );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.text,
    required this.createdAt,
    this.senderEmail,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String text;
  final String createdAt;
  final String? senderEmail;

  factory ChatMessage.fromJson(JsonMap json) => ChatMessage(
    id: json['id'] as String? ?? '',
    conversationId: json['conversationId'] as String? ?? '',
    senderId: json['senderId'] as String? ?? '',
    text: json['text'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    senderEmail: json['senderEmail'] as String?,
  );
}

class ChatConversationListing {
  const ChatConversationListing({
    required this.id,
    required this.zoneId,
    required this.title,
    required this.purpose,
    required this.type,
    this.priceMonthly,
    this.priceSale,
    this.imageUrl,
  });

  final String id;
  final String zoneId;
  final String title;
  final String purpose;
  final String type;
  final double? priceMonthly;
  final double? priceSale;
  final String? imageUrl;

  factory ChatConversationListing.fromJson(JsonMap json) =>
      ChatConversationListing(
        id: json['id'] as String? ?? '',
        zoneId: json['zoneId'] as String? ?? '',
        title: json['title'] as String? ?? '',
        purpose: json['purpose'] as String? ?? 'rent',
        type: json['type'] as String? ?? 'apartment',
        priceMonthly: (json['priceMonthly'] as num?)?.toDouble(),
        priceSale: (json['priceSale'] as num?)?.toDouble(),
        imageUrl: json['imageUrl'] as String?,
      );
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.listingId,
    required this.sellerId,
    required this.buyerId,
    required this.createdAt,
    required this.updatedAt,
    required this.listing,
    required this.counterpart,
    this.lastMessage,
  });

  final String id;
  final String listingId;
  final String sellerId;
  final String buyerId;
  final String createdAt;
  final String updatedAt;
  final ChatConversationListing listing;
  final ListingSellerSummary counterpart;
  final ChatMessage? lastMessage;

  factory ChatConversation.fromJson(JsonMap json) => ChatConversation(
    id: json['id'] as String? ?? '',
    listingId: json['listingId'] as String? ?? '',
    sellerId: json['sellerId'] as String? ?? '',
    buyerId: json['buyerId'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    listing: ChatConversationListing.fromJson(
      (json['listing'] as Map<String, dynamic>? ?? const {}),
    ),
    counterpart: ListingSellerSummary.fromJson(
      (json['counterpart'] as Map<String, dynamic>? ?? const {}),
    ),
    lastMessage: json['lastMessage'] == null
        ? null
        : ChatMessage.fromJson(json['lastMessage'] as Map<String, dynamic>),
  );
}

class ContactSellerResult {
  const ContactSellerResult({required this.conversation});

  final ChatConversation conversation;

  factory ContactSellerResult.fromJson(JsonMap json) => ContactSellerResult(
    conversation: ChatConversation.fromJson(
      (json['conversation'] as Map<String, dynamic>? ?? const {}),
    ),
  );
}

class ConversationMessagesResult {
  const ConversationMessagesResult({
    required this.conversation,
    required this.messages,
  });

  final ChatConversation conversation;
  final List<ChatMessage> messages;

  factory ConversationMessagesResult.fromJson(JsonMap json) =>
      ConversationMessagesResult(
        conversation: ChatConversation.fromJson(
          (json['conversation'] as Map<String, dynamic>? ?? const {}),
        ),
        messages: (json['messages'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<String, dynamic>>()
            .map(ChatMessage.fromJson)
            .toList(),
      );
}

class TclResult {
  const TclResult({
    required this.optionA,
    required this.optionB,
    required this.cheaper,
    required this.deltaMonthly,
  });

  final JsonMap optionA;
  final JsonMap optionB;
  final String cheaper;
  final double deltaMonthly;

  factory TclResult.fromJson(JsonMap json) => TclResult(
    optionA: json['optionA'] as JsonMap,
    optionB: json['optionB'] as JsonMap,
    cheaper: json['cheaper'] as String,
    deltaMonthly: (json['deltaMonthly'] as num).toDouble(),
  );
}

class CopilotRecommendation {
  const CopilotRecommendation({
    required this.zoneId,
    required this.name,
    required this.score,
    required this.badges,
    required this.why,
  });

  final String zoneId;
  final String name;
  final double score;
  final List<String> badges;
  final List<String> why;

  factory CopilotRecommendation.fromJson(JsonMap json) => CopilotRecommendation(
    zoneId: json['zoneId'] as String,
    name: json['name'] as String,
    score: (json['score'] as num).toDouble(),
    badges: (json['badges'] as List<dynamic>).map((item) => '$item').toList(),
    why: (json['why'] as List<dynamic>).map((item) => '$item').toList(),
  );
}

class CopilotTclSuggestion {
  const CopilotTclSuggestion({
    required this.optionAZoneId,
    required this.optionBZoneId,
  });

  final String optionAZoneId;
  final String optionBZoneId;

  factory CopilotTclSuggestion.fromJson(JsonMap json) => CopilotTclSuggestion(
    optionAZoneId: json['optionAZoneId'] as String,
    optionBZoneId: json['optionBZoneId'] as String,
  );
}

class CopilotChatResult {
  const CopilotChatResult({
    required this.assistantText,
    required this.recommendations,
    required this.followUpQuestions,
    this.tclSuggestion,
  });

  final String assistantText;
  final List<CopilotRecommendation> recommendations;
  final List<String> followUpQuestions;
  final CopilotTclSuggestion? tclSuggestion;

  factory CopilotChatResult.fromJson(JsonMap json) => CopilotChatResult(
    assistantText: json['assistantText'] as String? ?? '',
    recommendations:
        (json['recommendations'] as List<dynamic>? ?? const <dynamic>[])
            .map(
              (item) =>
                  CopilotRecommendation.fromJson(item as Map<String, dynamic>),
            )
            .toList(),
    followUpQuestions:
        (json['followUpQuestions'] as List<dynamic>? ?? const <dynamic>[])
            .map((item) => '$item')
            .toList(),
    tclSuggestion: json['tclSuggestion'] == null
        ? null
        : CopilotTclSuggestion.fromJson(
            json['tclSuggestion'] as Map<String, dynamic>,
          ),
  );
}
