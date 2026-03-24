import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../utils/format.dart';
import 'create_listing_screen.dart';
import 'auth/login_screen.dart';
import 'messages_screen.dart';
import 'tcl_screen.dart';

class ZoneDetailScreen extends StatefulWidget {
  const ZoneDetailScreen({super.key, required this.zoneId});

  final String zoneId;

  @override
  State<ZoneDetailScreen> createState() => _ZoneDetailScreenState();
}

class _ZoneDetailScreenState extends State<ZoneDetailScreen> {
  late Future<ZoneDetails> _future;
  bool _saving = false;
  String? _feedback;
  bool _offersLoading = true;
  String? _contactingListingId;
  String? _reportingListingId;
  List<ListingOffer> _offers = const [];

  @override
  void initState() {
    super.initState();
    _future = context.read<AuthState>().api.getZone(widget.zoneId);
    _loadOffers();
  }

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthState>();
    if (auth.isAuthenticated) {
      return true;
    }

    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    return mounted && auth.isAuthenticated;
  }

  Future<void> _addToReport(String zoneId) async {
    final auth = context.read<AuthState>();
    if (!await _ensureAuthenticated()) {
      setState(() => _feedback = 'Sign in required to save zones.');
      return;
    }

    setState(() {
      _saving = true;
      _feedback = null;
    });

    try {
      await auth.api.addFavorite(zoneId, note: 'Added from zone detail');
      if (!mounted) return;
      setState(() => _feedback = 'Zone added to your report candidates.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not save this zone: $e');
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _loadOffers() async {
    setState(() => _offersLoading = true);
    try {
      final offers = await context.read<AuthState>().api.getListings(
        zoneId: widget.zoneId,
        limit: 12,
      );
      if (!mounted) return;
      setState(() => _offers = offers);
    } catch (_) {
      if (!mounted) return;
      setState(() => _offers = const []);
    } finally {
      if (mounted) {
        setState(() => _offersLoading = false);
      }
    }
  }

  Future<void> _contactSeller(ListingOffer offer) async {
    final auth = context.read<AuthState>();
    if (!await _ensureAuthenticated()) {
      setState(() => _feedback = 'Sign in required to contact the seller.');
      return;
    }

    setState(() {
      _contactingListingId = offer.id;
      _feedback = null;
    });
    try {
      final result = await auth.api.contactSeller(
        offer.id,
        initialMessage:
            'Hi, I am interested in ${offer.title}. Is it still available?',
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) =>
              MessagesScreen(initialConversationId: result.conversation.id),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not contact seller: $e');
    } finally {
      if (mounted) {
        setState(() => _contactingListingId = null);
      }
    }
  }

  Future<String?> _promptReportReason() async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Report offer'),
        content: TextField(
          controller: controller,
          minLines: 3,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'Tell admin why this offer should be reviewed.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.length < 3) {
                return;
              }
              Navigator.of(dialogContext).pop(value);
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    controller.dispose();
    return reason?.trim();
  }

  Future<void> _reportOffer(ListingOffer offer) async {
    final auth = context.read<AuthState>();
    if (!await _ensureAuthenticated()) {
      setState(() => _feedback = 'Sign in required to report offers.');
      return;
    }

    final reason = await _promptReportReason();
    if (reason == null || reason.isEmpty) {
      return;
    }

    setState(() {
      _reportingListingId = offer.id;
      _feedback = null;
    });

    try {
      await auth.api.reportListing(offer.id, reason: reason);
      if (!mounted) return;
      setState(() => _feedback = 'Report submitted to admin.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _feedback = 'Could not submit report: $e');
    } finally {
      if (mounted) {
        setState(() => _reportingListingId = null);
      }
    }
  }

  double _metric(JsonMap metrics, String key) {
    return (metrics[key] as num?)?.toDouble() ?? 0;
  }

  List<String> _alerts(ZoneDetails zone) {
    final alerts = <String>[];
    if (_metric(zone.metrics, 'pollenIndex') > 55) {
      alerts.add('High pollen days can impact allergy-sensitive households.');
    }
    if (_metric(zone.metrics, 'heatIndex') > 60) {
      alerts.add('Summer heat exposure is above comfort baseline.');
    }
    if (_metric(zone.metrics, 'floodRiskIndex') > 45) {
      alerts.add('Flood risk should be included in insurance planning.');
    }
    if (_metric(zone.metrics, 'zoningRiskIndex') > 40) {
      alerts.add('Zoning change risk can affect long-term certainty.');
    }
    if (alerts.isEmpty) {
      alerts.add('No major risk alerts detected from current available data.');
    }
    return alerts;
  }

  JsonMap _estimateTcl(ZoneDetails zone) {
    final rentMortgage = 3200 + _metric(zone.metrics, 'futureValueIndex') * 85;
    final commute = (1400 - _metric(zone.metrics, 'transitIndex') * 11).clamp(
      160,
      1500,
    );
    final energy = 260 + _metric(zone.metrics, 'heatIndex') * 9;
    final health =
        150 +
        (100 - _metric(zone.metrics, 'airQualityIndex')) * 8 +
        _metric(zone.metrics, 'pollenIndex') * 6;
    final riskPenalty =
        _metric(zone.metrics, 'floodRiskIndex') * 18 +
        _metric(zone.metrics, 'zoningRiskIndex') * 12;

    return {
      'rentMortgage': rentMortgage,
      'commute': commute,
      'energy': energy,
      'health': health,
      'riskPenalty': riskPenalty,
      'total': rentMortgage + commute + energy + health + riskPenalty,
    };
  }

  String _fallbackMapImage(ZoneDetails zone) {
    final lat = zone.centerLat.toStringAsFixed(4);
    final lng = zone.centerLng.toStringAsFixed(4);
    return Uri.https('staticmap.openstreetmap.de', '/staticmap.php', {
      'center': '$lat,$lng',
      'zoom': '13',
      'size': '1200x700',
      'markers': '$lat,$lng,red-pushpin',
    }).toString();
  }

  String _sellerLabel(ListingOffer offer) {
    final displayName = offer.seller?.displayName?.trim();
    if (displayName != null && displayName.isNotEmpty) {
      return displayName;
    }
    final companyName = offer.seller?.companyName?.trim();
    if (companyName != null && companyName.isNotEmpty) {
      return companyName;
    }
    final email = offer.seller?.email.trim();
    if (email != null && email.isNotEmpty) {
      return email;
    }
    return 'Seller';
  }

  List<String> _offerContacts(ListingOffer offer) {
    final items = <String>[];

    void add(String label, String? value) {
      final text = value?.trim();
      if (text != null && text.isNotEmpty) {
        items.add('$label: $text');
      }
    }

    add('Phone', offer.contactPhone);
    add('Email', offer.contactEmail);
    add('WhatsApp', offer.contactWhatsApp);
    add('Instagram', offer.contactInstagram);
    add('Facebook', offer.contactFacebook);
    add('Website', offer.contactWebsite);

    return items;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Zone details')),
      body: FutureBuilder<ZoneDetails>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final zone = snapshot.data!;
          final fallbackImageUrl = _fallbackMapImage(zone);
          final galleryImages = {
            if ((zone.imageUrl ?? '').trim().isNotEmpty) zone.imageUrl!.trim(),
            ...zone.imageUrls.where((item) => item.trim().isNotEmpty),
          }.toList();
          if (galleryImages.isEmpty) {
            galleryImages.add(fallbackImageUrl);
          }
          final zoneImageUrl = galleryImages.first;
          final alerts = _alerts(zone);
          final tcl = _estimateTcl(zone);
          final explanations = zone.explanations.isNotEmpty
              ? zone.explanations
              : <String>[
                  'Balanced quality-of-life signals for everyday living.',
                  'Transit and services profile support regular commuting.',
                ];

          return DefaultTabController(
            length: 5,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: Image.network(
                              zoneImageUrl,
                              width: double.infinity,
                              height: 180,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 180,
                                color: const Color(0xFFE7ECE7),
                                alignment: Alignment.center,
                                child: const Icon(
                                  Icons.image_not_supported_outlined,
                                  color: Color(0xFF6A776E),
                                ),
                              ),
                            ),
                          ),
                          if (galleryImages.length > 1) ...[
                            const SizedBox(height: 8),
                            SizedBox(
                              height: 76,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: galleryImages.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(width: 8),
                                itemBuilder: (context, index) {
                                  final image = galleryImages[index];
                                  return ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.network(
                                      image,
                                      width: 110,
                                      height: 76,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        width: 110,
                                        height: 76,
                                        color: const Color(0xFFE7ECE7),
                                        alignment: Alignment.center,
                                        child: const Icon(
                                          Icons.image_not_supported_outlined,
                                          color: Color(0xFF6A776E),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          Text(
                            zone.name,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            '${zone.city} • Score ${zone.overallScore.toStringAsFixed(1)} / 100',
                          ),
                          if (zone.listing != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              zone.listing!.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              zone.listing!.purpose == 'rent'
                                  ? '${formatDh(zone.listing!.priceMonthly ?? 0)} / month'
                                  : formatDh(zone.listing!.priceSale ?? 0),
                              style: const TextStyle(color: Color(0xFF2E5B45)),
                            ),
                            Text(
                              '${(zone.listing!.areaM2 ?? 0).toStringAsFixed(0)} m² • ${(zone.listing!.bedrooms ?? 0).toStringAsFixed(0)} bd • ${(zone.listing!.bathrooms ?? 0).toStringAsFixed(0)} ba',
                            ),
                          ],
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              OutlinedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => CreateListingScreen(
                                        initialZoneId: zone.id,
                                      ),
                                    ),
                                  );
                                },
                                child: const Text('Post listing'),
                              ),
                              OutlinedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          TclScreen(initialZoneId: zone.id),
                                    ),
                                  );
                                },
                                child: const Text('Compare'),
                              ),
                              FilledButton(
                                onPressed: _saving
                                    ? null
                                    : () => _addToReport(zone.id),
                                child: Text(
                                  _saving ? 'Saving...' : 'Add to report',
                                ),
                              ),
                              OutlinedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const MessagesScreen(),
                                    ),
                                  );
                                },
                                child: const Text('Messages'),
                              ),
                            ],
                          ),
                          if (_feedback != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              _feedback!,
                              style: const TextStyle(color: Color(0xFF4A5D4F)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                const TabBar(
                  isScrollable: true,
                  tabs: [
                    Tab(text: 'Overview'),
                    Tab(text: 'Scores'),
                    Tab(text: 'True Cost'),
                    Tab(text: 'Future'),
                    Tab(text: 'Risks'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          const Text(
                            'Why this zone fits you',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...explanations.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text('• $item'),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Alerts',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...alerts.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text('• $item'),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Offers in this zone',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_offersLoading)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 10),
                              child: Center(child: CircularProgressIndicator()),
                            )
                          else if (_offers.isEmpty)
                            const Text('No live offers yet for this zone.')
                          else
                            ..._offers.map(
                              (offer) => Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if ((offer.imageUrl ?? '').isNotEmpty)
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                          child: Image.network(
                                            offer.imageUrl!,
                                            width: double.infinity,
                                            height: 140,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(
                                              height: 140,
                                              color: const Color(0xFFE7ECE7),
                                              alignment: Alignment.center,
                                              child: const Icon(
                                                Icons
                                                    .image_not_supported_outlined,
                                              ),
                                            ),
                                          ),
                                        ),
                                      const SizedBox(height: 8),
                                      Text(
                                        offer.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        offer.purpose == 'rent'
                                            ? '${formatDh(offer.priceMonthly ?? 0)} / month'
                                            : formatDh(offer.priceSale ?? 0),
                                        style: const TextStyle(
                                          color: Color(0xFF2E5B45),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        '${(offer.areaM2 ?? 0).toStringAsFixed(0)} m² • ${(offer.bedrooms ?? 0).toStringAsFixed(0)} bd • ${(offer.bathrooms ?? 0).toStringAsFixed(0)} ba',
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          if ((offer.seller?.avatarUrl ?? '')
                                              .trim()
                                              .isNotEmpty)
                                            CircleAvatar(
                                              radius: 11,
                                              backgroundImage: NetworkImage(
                                                offer.seller!.avatarUrl!,
                                              ),
                                            )
                                          else
                                            const CircleAvatar(
                                              radius: 11,
                                              backgroundColor: Color(
                                                0xFFE2ECE4,
                                              ),
                                              child: Icon(
                                                Icons.person_outline,
                                                size: 13,
                                                color: Color(0xFF244735),
                                              ),
                                            ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'Seller: ${_sellerLabel(offer)}',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF2E5B45),
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (_offerContacts(offer).isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _offerContacts(offer)
                                              .map(
                                                (entry) => Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 4,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFFF2F7F4,
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          999,
                                                        ),
                                                    border: Border.all(
                                                      color: const Color(
                                                        0xFFD4E0D8,
                                                      ),
                                                    ),
                                                  ),
                                                  child: Text(
                                                    entry,
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      color: Color(0xFF2C4438),
                                                    ),
                                                  ),
                                                ),
                                              )
                                              .toList(),
                                        ),
                                      ],
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          FilledButton(
                                            onPressed:
                                                _contactingListingId == offer.id
                                                ? null
                                                : () => _contactSeller(offer),
                                            child: Text(
                                              _contactingListingId == offer.id
                                                  ? 'Connecting...'
                                                  : 'Contact seller',
                                            ),
                                          ),
                                          OutlinedButton(
                                            onPressed:
                                                _reportingListingId == offer.id
                                                ? null
                                                : () => _reportOffer(offer),
                                            child: Text(
                                              _reportingListingId == offer.id
                                                  ? 'Reporting...'
                                                  : 'Report offer',
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          const Text(
                            'Score breakdown',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          ...zone.breakdown.entries.map((entry) {
                            final value = (entry.value as num).toDouble();
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${entry.key}: ${value.toStringAsFixed(1)}',
                                  ),
                                  const SizedBox(height: 4),
                                  LinearProgressIndicator(
                                    minHeight: 9,
                                    value: (value / 100).clamp(0, 1),
                                    backgroundColor: const Color(0xFFE6ECE4),
                                    color: const Color(0xFF2E5B45),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                      ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          const Text(
                            'Monthly true cost estimate',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          _costRow(
                            'Rent / Mortgage',
                            tcl['rentMortgage'] as num,
                          ),
                          _costRow('Commute cost', tcl['commute'] as num),
                          _costRow('Energy cost', tcl['energy'] as num),
                          _costRow('Health / allergy', tcl['health'] as num),
                          _costRow('Risk penalty', tcl['riskPenalty'] as num),
                          const Divider(height: 22),
                          _costRow(
                            'TOTAL monthly cost',
                            tcl['total'] as num,
                            bold: true,
                          ),
                        ],
                      ),
                      ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          const Text(
                            'Future outlook timeline',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Card(
                            child: ListTile(
                              title: const Text('5-year projection'),
                              trailing: Text(
                                '${(_metric(zone.futureOutlook, 'years5')).toStringAsFixed(1)}%',
                              ),
                            ),
                          ),
                          Card(
                            child: ListTile(
                              title: const Text('10-year projection'),
                              trailing: Text(
                                '${(_metric(zone.futureOutlook, 'years10')).toStringAsFixed(1)}%',
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            zone.futureOutlook['explanation'] as String? ??
                                'Projection explanation unavailable.',
                          ),
                        ],
                      ),
                      ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          const Text(
                            'Risk indicators',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          _riskTile(
                            'Pollen index',
                            _metric(zone.metrics, 'pollenIndex'),
                          ),
                          _riskTile(
                            'Heat index',
                            _metric(zone.metrics, 'heatIndex'),
                          ),
                          _riskTile(
                            'Flood risk index',
                            _metric(zone.metrics, 'floodRiskIndex'),
                          ),
                          _riskTile(
                            'Zoning risk index',
                            _metric(zone.metrics, 'zoningRiskIndex'),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Penalty notes',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 6),
                          if (zone.penalties.isEmpty)
                            const Text(
                              'No additional score penalties were triggered.',
                            )
                          else
                            ...zone.penalties.map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Text('• $item'),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _costRow(String label, num value, {bool bold = false}) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(formatDh(value), style: style),
        ],
      ),
    );
  }

  Widget _riskTile(String label, double value) {
    return Card(
      child: ListTile(
        title: Text(label),
        trailing: Text(value.toStringAsFixed(1)),
      ),
    );
  }
}
