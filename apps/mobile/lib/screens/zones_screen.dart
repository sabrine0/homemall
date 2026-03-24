import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../theme/app_design.dart';
import '../utils/format.dart';
import 'auth/login_screen.dart';
import 'copilot_chat_screen.dart';
import 'zone_detail_screen.dart';

class ZonesScreen extends StatefulWidget {
  const ZonesScreen({super.key, required this.onStartAnalysis});

  final VoidCallback onStartAnalysis;

  @override
  State<ZonesScreen> createState() => _ZonesScreenState();
}

enum _ZonesViewMode { matching, map }

class _ZonesScreenState extends State<ZonesScreen> {
  bool _loading = true;
  String? _error;
  List<ZoneSummary> _zones = const [];
  Map<String, double> _analyzedScores = const {};
  final List<String> _likedZoneIds = [];

  String _search = '';
  String _goal = 'rent';
  String _sortBy = 'Score';
  _ZonesViewMode _viewMode = _ZonesViewMode.matching;
  RangeValues _budgetRange = const RangeValues(3000, 12000);
  double _commuteMax = 45;
  final Set<String> _transport = {'walk', 'transit'};
  final Set<String> _priorities = {};
  ZoneSummary? _selectedZone;

  final _searchController = TextEditingController();
  Timer? _analysisDebounce;

  static const _goalOptions = ['rent', 'buy', 'sell', 'invest', 'build'];
  static const _sortOptions = ['Score', 'Name', 'City'];
  static const _transportOptions = ['walk', 'car', 'transit'];
  static const _priorityOptions = [
    'Quiet',
    'Green',
    'Safe',
    'Low Allergy',
    'Near Schools',
    'Near Gym/Hammam',
    'Shopping',
    'Parks',
  ];
  static const Map<String, String> _propertyTypeToIcon = {
    'house': '🏠',
    'apartment': '🏢',
    'studio': '🛏️',
    'land': '🌍',
    'building': '🏬',
  };

  @override
  void initState() {
    super.initState();
    _loadZones();
  }

  @override
  void dispose() {
    _analysisDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadZones() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final zones = await context.read<AuthState>().api.getZones();
      if (!mounted) return;
      setState(() {
        _zones = zones;
        _selectedZone = zones.isNotEmpty ? zones.first : null;
      });
      _scheduleAnalysis();
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _error = context.tr(
          'zones_loading_error',
          args: {'value': e.toString()},
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  UserProfile _profileFromFilters() {
    final quiet = _priorities.contains('Quiet');
    final lowAllergy = _priorities.contains('Low Allergy');
    final green = _priorities.contains('Green');

    return UserProfile(
      goal: _goal,
      budgetMin: _budgetRange.start.round(),
      budgetMax: _budgetRange.end.round(),
      workLat: 33.5731,
      workLng: -7.5898,
      mobilityModes: _transport.isEmpty ? ['walk'] : _transport.toList(),
      sensitivities: {
        'noise': quiet ? 4 : 2,
        'heat': green ? 2 : 3,
        'allergies': lowAllergy ? 4 : 2,
      },
    );
  }

  void _scheduleAnalysis() {
    _analysisDebounce?.cancel();
    _analysisDebounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final scores = await context.read<AuthState>().api.analyzeZones(
          profile: _profileFromFilters(),
        );
        if (!mounted) return;
        setState(() => _analyzedScores = scores);
      } catch (_) {
        // Keep fallback scores when analysis endpoint is unavailable.
      }
    });
  }

  bool _priorityMatches(ZoneSummary zone) {
    if (_priorities.isEmpty) return true;

    final quiet = (zone.flags['quiet'] as bool?) ?? false;
    final transitFriendly = (zone.flags['transitFriendly'] as bool?) ?? false;
    final allergyFriendly = (zone.flags['allergyFriendly'] as bool?) ?? false;
    final floodRiskHigh = (zone.flags['floodRiskHigh'] as bool?) ?? false;

    return _priorities.every((priority) {
      switch (priority) {
        case 'Quiet':
          return quiet;
        case 'Safe':
          return !floodRiskHigh;
        case 'Low Allergy':
          return allergyFriendly;
        case 'Green':
          return quiet || allergyFriendly;
        case 'Shopping':
        case 'Near Schools':
        case 'Near Gym/Hammam':
        case 'Parks':
          return transitFriendly || quiet;
        default:
          return true;
      }
    });
  }

  List<ZoneSummary> get _filteredZones {
    final q = _search.trim().toLowerCase();
    final list = _zones
        .map(
          (zone) => ZoneSummary(
            id: zone.id,
            name: zone.name,
            city: zone.city,
            centerLat: zone.centerLat,
            centerLng: zone.centerLng,
            imageUrl: zone.imageUrl,
            imageUrls: zone.imageUrls,
            listingInventory: zone.listingInventory,
            overallScore: _analyzedScores[zone.id] ?? zone.overallScore,
            flags: zone.flags,
          ),
        )
        .where((zone) {
          if (q.isEmpty) return true;
          return zone.name.toLowerCase().contains(q) ||
              zone.city.toLowerCase().contains(q);
        })
        .where(_priorityMatches)
        .toList();

    switch (_sortBy) {
      case 'Name':
        list.sort((a, b) => a.name.compareTo(b.name));
      case 'City':
        list.sort((a, b) => a.city.compareTo(b.city));
      default:
        list.sort((a, b) => b.overallScore.compareTo(a.overallScore));
    }

    return list;
  }

  ZoneSummary _withAnalyzedScore(ZoneSummary zone) {
    return ZoneSummary(
      id: zone.id,
      name: zone.name,
      city: zone.city,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      imageUrl: zone.imageUrl,
      imageUrls: zone.imageUrls,
      listingInventory: zone.listingInventory,
      overallScore: _analyzedScores[zone.id] ?? zone.overallScore,
      flags: zone.flags,
    );
  }

  List<ZoneSummary> _likedZones() {
    final allZones = {
      for (final zone in _zones) zone.id: _withAnalyzedScore(zone),
    };
    return _likedZoneIds
        .map((id) => allZones[id])
        .whereType<ZoneSummary>()
        .toList();
  }

  Color _scoreTierColor(double score, List<ZoneSummary> zones) {
    if (zones.isEmpty) {
      return AppColors.warning;
    }

    final minScore = zones
        .map((item) => item.overallScore)
        .reduce((a, b) => a < b ? a : b);
    final maxScore = zones
        .map((item) => item.overallScore)
        .reduce((a, b) => a > b ? a : b);

    if ((maxScore - minScore).abs() < 0.001) {
      return AppColors.warning;
    }

    final normalized = (score - minScore) / (maxScore - minScore);
    if (normalized >= 0.66) {
      return AppColors.success;
    }
    if (normalized <= 0.33) {
      return AppColors.danger;
    }
    return AppColors.warning;
  }

  String _scoreTierLabel(double score, List<ZoneSummary> zones) {
    if (zones.isEmpty) {
      return 'medium';
    }

    final minScore = zones
        .map((item) => item.overallScore)
        .reduce((a, b) => a < b ? a : b);
    final maxScore = zones
        .map((item) => item.overallScore)
        .reduce((a, b) => a > b ? a : b);

    if ((maxScore - minScore).abs() < 0.001) {
      return 'medium';
    }

    final normalized = (score - minScore) / (maxScore - minScore);
    if (normalized >= 0.66) {
      return 'best';
    }
    if (normalized <= 0.33) {
      return 'worse';
    }
    return 'medium';
  }

  String _activeListingPurpose() {
    if (_goal == 'rent') {
      return 'rent';
    }
    if (_goal == 'buy' || _goal == 'sell') {
      return 'buy';
    }
    return 'all';
  }

  ListingTypeCounts _listingCountsFor(ZoneSummary zone) {
    final inventory = zone.listingInventory;
    if (inventory == null) {
      return const ListingTypeCounts(
        apartment: 0,
        house: 0,
        studio: 0,
        villa: 0,
        land: 0,
        total: 0,
      );
    }

    final purpose = _activeListingPurpose();
    if (purpose == 'rent') {
      return inventory.rent;
    }
    if (purpose == 'buy') {
      return inventory.buy;
    }

    return ListingTypeCounts(
      apartment: inventory.rent.apartment + inventory.buy.apartment,
      house: inventory.rent.house + inventory.buy.house,
      studio: inventory.rent.studio + inventory.buy.studio,
      villa: inventory.rent.villa + inventory.buy.villa,
      land: inventory.rent.land + inventory.buy.land,
      total: inventory.total,
    );
  }

  String _listingPurposeLabel() {
    final strings = context.strings;
    final purpose = _activeListingPurpose();
    if (purpose == 'rent') {
      return strings.t('rent');
    }
    if (purpose == 'buy') {
      return strings.t('sell');
    }
    return strings.t('zones_results');
  }

  String _topListingTypes(ListingTypeCounts counts) {
    final strings = context.strings;
    final list = <MapEntry<String, int>>[
      MapEntry('APT', counts.apartment),
      MapEntry('H', counts.house),
      MapEntry('ST', counts.studio),
      MapEntry('V', counts.villa),
      MapEntry('L', counts.land),
    ]..sort((a, b) => b.value.compareTo(a.value));

    final top = list.where((item) => item.value > 0).take(2).toList();
    if (top.isEmpty) {
      return strings.t('zones_no_matches');
    }
    return top.map((item) => '${item.key} ${item.value}').join(' • ');
  }

  String _dominantPropertyType(ListingTypeCounts counts) {
    final ranked = <MapEntry<String, int>>[
      MapEntry('house', counts.house + counts.villa),
      MapEntry('apartment', counts.apartment),
      MapEntry('studio', counts.studio),
      MapEntry('land', counts.land),
    ]..sort((a, b) => b.value.compareTo(a.value));

    if (ranked.isEmpty || ranked.first.value <= 0) {
      return 'unknown';
    }
    return ranked.first.key;
  }

  String _markerIconForCounts(ListingTypeCounts counts) {
    final propertyType = _dominantPropertyType(counts);
    return _propertyTypeToIcon[propertyType] ?? '📍';
  }

  String _markerCountLabel(int count) {
    if (count <= 0) return '0';
    if (count > 99) return '99+';
    return '$count';
  }

  double _colorToMarkerHue(Color color) {
    return HSVColor.fromColor(color).hue;
  }

  void _saveLikedZone(ZoneSummary zone) {
    setState(() {
      _likedZoneIds.remove(zone.id);
      _likedZoneIds.insert(0, zone.id);
      if (_likedZoneIds.length > 12) {
        _likedZoneIds.removeRange(12, _likedZoneIds.length);
      }
    });
  }

  void _removeLikedZone(String zoneId) {
    setState(() => _likedZoneIds.remove(zoneId));
  }

  void _toggleTransport(String mode) {
    setState(() {
      if (_transport.contains(mode)) {
        _transport.remove(mode);
      } else {
        _transport.add(mode);
      }
    });
    _scheduleAnalysis();
  }

  void _togglePriority(String priority) {
    setState(() {
      if (_priorities.contains(priority)) {
        _priorities.remove(priority);
      } else {
        _priorities.add(priority);
      }
    });
    _scheduleAnalysis();
  }

  Future<void> _openLogin() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _openCopilot() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const CopilotChatScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthState>(
      builder: (context, auth, _) {
        if (_loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (_error != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.lg),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.lg),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: AppColors.danger,
                        size: 28,
                      ),
                      const SizedBox(height: AppSpace.sm),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: AppSpace.sm),
                      FilledButton(
                        onPressed: _loadZones,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        final zones = _filteredZones;
        if (zones.isNotEmpty &&
            (_selectedZone == null ||
                !zones.any((zone) => zone.id == _selectedZone!.id))) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted || zones.isEmpty) return;
            if (_selectedZone?.id == zones.first.id) return;
            setState(() => _selectedZone = zones.first);
          });
        }
        final bestScore = zones.isEmpty
            ? '--'
            : zones.first.overallScore.toStringAsFixed(1);

        return Padding(
          padding: const EdgeInsets.all(AppSpace.md),
          child: Column(
            children: [
              _TopBar(
                controller: _searchController,
                isAuthenticated: auth.isAuthenticated,
                onSearchChanged: (value) => setState(() => _search = value),
                onSignIn: _openLogin,
                onCopilot: _openCopilot,
                onStartAnalysis: widget.onStartAnalysis,
              ),
              const SizedBox(height: AppSpace.sm),
              _FiltersPanel(
                goal: _goal,
                goalOptions: _goalOptions,
                budgetRange: _budgetRange,
                commuteMax: _commuteMax,
                transport: _transport,
                transportOptions: _transportOptions,
                priorities: _priorities,
                priorityOptions: _priorityOptions,
                onGoalChanged: (value) {
                  setState(() => _goal = value);
                  _scheduleAnalysis();
                },
                onBudgetChanged: (value) {
                  setState(() => _budgetRange = value);
                  _scheduleAnalysis();
                },
                onCommuteChanged: (value) =>
                    setState(() => _commuteMax = value),
                onTransportTap: _toggleTransport,
                onPriorityTap: _togglePriority,
              ),
              const SizedBox(height: AppSpace.sm),
              _SummaryRow(
                count: zones.length,
                bestScore: bestScore,
                sortBy: _sortBy,
                sortOptions: _sortOptions,
                onSortChanged: (value) {
                  if (value == null) return;
                  setState(() => _sortBy = value);
                },
              ),
              const SizedBox(height: AppSpace.xs),
              _ViewModeToggle(
                mode: _viewMode,
                onModeChanged: (nextMode) {
                  if (_viewMode == nextMode) return;
                  setState(() => _viewMode = nextMode);
                },
              ),
              const SizedBox(height: AppSpace.sm),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: _viewMode == _ZonesViewMode.matching
                      ? KeyedSubtree(
                          key: const ValueKey('zones_matching'),
                          child: _buildZoneList(zones),
                        )
                      : KeyedSubtree(
                          key: const ValueKey('zones_map'),
                          child: _buildMapPanel(zones),
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMapPanel(List<ZoneSummary> zones) {
    if (zones.isEmpty) {
      return Card(
        child: Center(
          child: Text(
            context.tr('zones_no_matches'),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      );
    }

    final center = LatLng(zones.first.centerLat, zones.first.centerLng);
    final markers = zones.map((zone) {
      final scoreColor = _scoreTierColor(zone.overallScore, zones);
      final listingCounts = _listingCountsFor(zone);
      final markerIcon = _markerIconForCounts(listingCounts);
      final markerCount = _markerCountLabel(listingCounts.total);

      return Marker(
        markerId: MarkerId(zone.id),
        position: LatLng(zone.centerLat, zone.centerLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          _colorToMarkerHue(scoreColor),
        ),
        infoWindow: InfoWindow(
          title: '$markerIcon $markerCount',
          snippet: '${zone.name} • ${zone.city}',
        ),
        onTap: () => setState(() => _selectedZone = zone),
      );
    }).toSet();

    return Card(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Stack(
          children: [
            GoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: 11),
              markers: markers,
              mapToolbarEnabled: false,
              zoomControlsEnabled: false,
              myLocationButtonEnabled: false,
              compassEnabled: false,
              minMaxZoomPreference: const MinMaxZoomPreference(5, 18),
            ),
            if (_selectedZone != null)
              Positioned(
                left: AppSpace.sm,
                right: AppSpace.sm,
                bottom: AppSpace.sm,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.card.withValues(alpha: 0.96),
                    borderRadius: BorderRadius.circular(AppRadius.card),
                    border: Border.all(
                      color: _scoreTierColor(
                        _selectedZone!.overallScore,
                        zones,
                      ).withValues(alpha: 0.35),
                    ),
                    boxShadow: AppShadows.soft,
                  ),
                  padding: const EdgeInsets.all(AppSpace.sm),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedZone!.name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            Text(
                              '${_selectedZone!.city} • Score ${_selectedZone!.overallScore.toStringAsFixed(1)}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const SizedBox(height: AppSpace.xxs),
                            Text(
                              '${_listingPurposeLabel()} listings: ${_listingCountsFor(_selectedZone!).total}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              _topListingTypes(
                                _listingCountsFor(_selectedZone!),
                              ),
                              style: Theme.of(context).textTheme.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      FilledButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  ZoneDetailScreen(zoneId: _selectedZone!.id),
                            ),
                          );
                        },
                        child: Text(context.tr('zones_open_details')),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildZoneList(List<ZoneSummary> zones) {
    if (zones.isEmpty) {
      return Card(
        child: Center(
          child: Text(
            context.tr('zones_no_results'),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      );
    }

    final likedZones = _likedZones();

    return Column(
      children: [
        if (likedZones.isNotEmpty) ...[
          _LikedOffersStrip(
            zones: likedZones,
            scoreColorFor: (zone) => _scoreTierColor(zone.overallScore, zones),
            onOpen: (zone) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ZoneDetailScreen(zoneId: zone.id),
                ),
              );
            },
            onRemove: _removeLikedZone,
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        Expanded(
          child: _OfferSwipeDeck(
            zones: zones,
            listingPurposeLabel: _listingPurposeLabel(),
            listingCountsFor: _listingCountsFor,
            topTypesFor: _topListingTypes,
            scoreColorFor: (zone) => _scoreTierColor(zone.overallScore, zones),
            scoreTierFor: (zone) => _scoreTierLabel(zone.overallScore, zones),
            onShowMap: () => setState(() => _viewMode = _ZonesViewMode.map),
            onLike: _saveLikedZone,
            onOpen: (zone) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ZoneDetailScreen(zoneId: zone.id),
                ),
              );
            },
            onFocus: (zone) {
              if (_selectedZone?.id == zone.id) return;
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted || _selectedZone?.id == zone.id) return;
                setState(() => _selectedZone = zone);
              });
            },
          ),
        ),
      ],
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.controller,
    required this.isAuthenticated,
    required this.onSearchChanged,
    required this.onSignIn,
    required this.onCopilot,
    required this.onStartAnalysis,
  });

  final TextEditingController controller;
  final bool isAuthenticated;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onSignIn;
  final VoidCallback onCopilot;
  final VoidCallback onStartAnalysis;

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
        gradient: const LinearGradient(
          colors: [Color(0xFFF2F8F4), Color(0xFFFDFEFD)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: AppShadows.soft,
      ),
      padding: const EdgeInsets.all(AppSpace.sm),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpace.xs),
                decoration: BoxDecoration(
                  color: const Color(0x1F2F5E46),
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
                child: const Icon(
                  Icons.home_work_rounded,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpace.xs),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      strings.t('app_name'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      strings.t('app_tagline'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: strings.t('copilot'),
                onPressed: onCopilot,
                icon: const Icon(Icons.smart_toy_outlined),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Row(
            children: [
              if (!isAuthenticated)
                Expanded(
                  child: OutlinedButton(
                    onPressed: onSignIn,
                    child: Text(strings.t('signin')),
                  ),
                ),
              if (!isAuthenticated) const SizedBox(width: AppSpace.xs),
              Expanded(
                child: FilledButton(
                  onPressed: onStartAnalysis,
                  child: Text(strings.t('zones_start_analysis')),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          TextField(
            controller: controller,
            onChanged: onSearchChanged,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              hintText: strings.t('zones_search_hint'),
            ),
          ),
        ],
      ),
    );
  }
}

class _FiltersPanel extends StatelessWidget {
  const _FiltersPanel({
    required this.goal,
    required this.goalOptions,
    required this.budgetRange,
    required this.commuteMax,
    required this.transport,
    required this.transportOptions,
    required this.priorities,
    required this.priorityOptions,
    required this.onGoalChanged,
    required this.onBudgetChanged,
    required this.onCommuteChanged,
    required this.onTransportTap,
    required this.onPriorityTap,
  });

  final String goal;
  final List<String> goalOptions;
  final RangeValues budgetRange;
  final double commuteMax;
  final Set<String> transport;
  final List<String> transportOptions;
  final Set<String> priorities;
  final List<String> priorityOptions;
  final ValueChanged<String> onGoalChanged;
  final ValueChanged<RangeValues> onBudgetChanged;
  final ValueChanged<double> onCommuteChanged;
  final ValueChanged<String> onTransportTap;
  final ValueChanged<String> onPriorityTap;

  String _goalLabel(String raw, AppStrings strings) {
    switch (raw) {
      case 'rent':
        return strings.t('rent');
      case 'buy':
        return strings.t('buy');
      case 'sell':
        return strings.t('sell');
      case 'invest':
        return strings.t('invest');
      case 'build':
        return strings.t('build');
      case 'manage_rental':
        return strings.t('manage_rental');
      default:
        return raw;
    }
  }

  String _transportLabel(String raw, AppStrings strings) {
    switch (raw) {
      case 'walk':
        return strings.t('walk');
      case 'car':
        return strings.t('car');
      case 'transit':
        return strings.t('transit');
      case 'bike':
        return strings.t('bike');
      default:
        return raw;
    }
  }

  String _priorityLabel(String raw, AppStrings strings) {
    switch (raw) {
      case 'Quiet':
        return strings.t('quiet');
      case 'Green':
        return strings.t('green');
      case 'Safe':
        return strings.t('safe');
      case 'Low Allergy':
        return strings.t('low_allergy');
      case 'Near Schools':
        return strings.t('near_schools');
      case 'Near Gym/Hammam':
        return strings.t('near_gym');
      case 'Shopping':
        return strings.t('shopping');
      case 'Parks':
        return strings.t('parks');
      default:
        return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Card(
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
        childrenPadding: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          0,
          AppSpace.sm,
          AppSpace.sm,
        ),
        title: Text(
          strings.t('zones_filters'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        subtitle: Text(
          strings.t('zones_filters_helper'),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        children: [
          DropdownButtonFormField<String>(
            initialValue: goal,
            decoration: InputDecoration(labelText: strings.t('goal')),
            items: goalOptions
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text(_goalLabel(item, strings)),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value != null) {
                onGoalChanged(value);
              }
            },
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            'Budget: ${formatDh(budgetRange.start)} - ${formatDh(budgetRange.end)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          RangeSlider(
            values: budgetRange,
            min: 1000,
            max: 30000,
            divisions: 116,
            labels: RangeLabels(
              formatDh(budgetRange.start),
              formatDh(budgetRange.end),
            ),
            onChanged: onBudgetChanged,
          ),
          Text(
            'Commute max: ${commuteMax.round()} min',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Slider(
            value: commuteMax,
            min: 10,
            max: 90,
            divisions: 16,
            onChanged: onCommuteChanged,
          ),
          const SizedBox(height: AppSpace.xs),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              strings.t('mobility_modes'),
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.xs,
            runSpacing: AppSpace.xs,
            children: transportOptions.map((mode) {
              final active = transport.contains(mode);
              return FilterChip(
                label: Text(_transportLabel(mode, strings)),
                selected: active,
                onSelected: (_) => onTransportTap(mode),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              strings.t('priorities'),
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.xs,
            runSpacing: AppSpace.xs,
            children: priorityOptions.map((priority) {
              final active = priorities.contains(priority);
              return FilterChip(
                label: Text(_priorityLabel(priority, strings)),
                selected: active,
                onSelected: (_) => onPriorityTap(priority),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _ViewModeToggle extends StatelessWidget {
  const _ViewModeToggle({required this.mode, required this.onModeChanged});

  final _ZonesViewMode mode;
  final ValueChanged<_ZonesViewMode> onModeChanged;

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Container(
      height: 44,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _buildOption(
            context: context,
            value: _ZonesViewMode.matching,
            icon: Icons.favorite_outline_rounded,
            label: strings.t('zones_matching'),
          ),
          const SizedBox(width: AppSpace.xxs),
          _buildOption(
            context: context,
            value: _ZonesViewMode.map,
            icon: Icons.map_outlined,
            label: strings.t('zones_map'),
          ),
        ],
      ),
    );
  }

  Widget _buildOption({
    required BuildContext context,
    required _ZonesViewMode value,
    required IconData icon,
    required String label,
  }) {
    final selected = mode == value;
    return Expanded(
      child: Material(
        color: selected ? AppColors.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.button),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.button),
          onTap: () => onModeChanged(value),
          child: SizedBox(
            height: 36,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? Colors.white : AppColors.text,
                ),
                const SizedBox(width: AppSpace.xxs),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppColors.text,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.count,
    required this.bestScore,
    required this.sortBy,
    required this.sortOptions,
    required this.onSortChanged,
  });

  final int count;
  final String bestScore;
  final String sortBy;
  final List<String> sortOptions;
  final ValueChanged<String?> onSortChanged;

  String _sortLabel(String raw, AppStrings strings) {
    switch (raw) {
      case 'Score':
        return strings.t('score_sort');
      case 'Name':
        return strings.t('name_sort');
      case 'City':
        return strings.t('city_sort');
      default:
        return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Row(
      children: [
        _SummaryTile(
          label: strings.t('zones_results'),
          value: '$count',
          icon: Icons.map_outlined,
          accent: AppColors.primary,
        ),
        const SizedBox(width: AppSpace.xs),
        _SummaryTile(
          label: strings.t('zones_best_score'),
          value: bestScore,
          icon: Icons.emoji_events_outlined,
          accent: AppColors.success,
        ),
        const SizedBox(width: AppSpace.xs),
        Expanded(
          child: Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Text(
                  strings.t('zones_sort'),
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const Spacer(),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: sortBy,
                    items: sortOptions
                        .map(
                          (item) => DropdownMenuItem(
                            value: item,
                            child: Text(_sortLabel(item, strings)),
                          ),
                        )
                        .toList(),
                    onChanged: onSortChanged,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 118,
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: accent.withValues(alpha: 0.32)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: accent),
          ),
          const SizedBox(width: AppSpace.xs),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.labelLarge),
                Text(value, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LikedOffersStrip extends StatelessWidget {
  const _LikedOffersStrip({
    required this.zones,
    required this.scoreColorFor,
    required this.onOpen,
    required this.onRemove,
  });

  final List<ZoneSummary> zones;
  final Color Function(ZoneSummary zone) scoreColorFor;
  final ValueChanged<ZoneSummary> onOpen;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Container(
      height: 108,
      padding: const EdgeInsets.all(AppSpace.sm),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                strings.t('zones_liked_offers'),
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(width: AppSpace.xs),
              Text(
                '${zones.length}',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: zones.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpace.xs),
              itemBuilder: (context, index) {
                final zone = zones[index];
                final imageUrl = zone.imageUrl?.trim().isNotEmpty == true
                    ? zone.imageUrl!.trim()
                    : zone.imageUrls
                          .where((item) => item.trim().isNotEmpty)
                          .isNotEmpty
                    ? zone.imageUrls.firstWhere(
                        (item) => item.trim().isNotEmpty,
                      )
                    : '';
                final scoreColor = scoreColorFor(zone);

                return GestureDetector(
                  onTap: () => onOpen(zone),
                  child: Container(
                    width: 150,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: scoreColor.withValues(alpha: 0.25),
                      ),
                    ),
                    child: Stack(
                      children: [
                        if (imageUrl.isNotEmpty)
                          Positioned.fill(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) =>
                                    Container(color: const Color(0xFFE7ECE7)),
                              ),
                            ),
                          )
                        else
                          Positioned.fill(
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Color(0xFFE7ECE7),
                              ),
                            ),
                          ),
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              gradient: const LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Color(0x25000000),
                                  Color(0x00000000),
                                  Color(0xB6000000),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          left: AppSpace.xs,
                          right: AppSpace.xs,
                          bottom: AppSpace.xs,
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      zone.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      zone.city,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Color(0xE6FFFFFF),
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () => onRemove(zone.id),
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close_rounded,
                                    size: 14,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _OfferSwipeDeck extends StatefulWidget {
  const _OfferSwipeDeck({
    required this.zones,
    required this.listingPurposeLabel,
    required this.listingCountsFor,
    required this.topTypesFor,
    required this.scoreColorFor,
    required this.scoreTierFor,
    required this.onShowMap,
    required this.onLike,
    required this.onOpen,
    required this.onFocus,
  });

  final List<ZoneSummary> zones;
  final String listingPurposeLabel;
  final ListingTypeCounts Function(ZoneSummary zone) listingCountsFor;
  final String Function(ListingTypeCounts counts) topTypesFor;
  final Color Function(ZoneSummary zone) scoreColorFor;
  final String Function(ZoneSummary zone) scoreTierFor;
  final VoidCallback onShowMap;
  final ValueChanged<ZoneSummary> onLike;
  final ValueChanged<ZoneSummary> onOpen;
  final ValueChanged<ZoneSummary> onFocus;

  @override
  State<_OfferSwipeDeck> createState() => _OfferSwipeDeckState();
}

class _OfferSwipeDeckState extends State<_OfferSwipeDeck> {
  int _topIndex = 0;
  String _signature = '';

  void _notifyFocusAfterFrame(ZoneSummary zone) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onFocus(zone);
    });
  }

  @override
  void initState() {
    super.initState();
    _signature = _buildSignature(widget.zones);
    if (widget.zones.isNotEmpty) {
      _notifyFocusAfterFrame(widget.zones.first);
    }
  }

  @override
  void didUpdateWidget(covariant _OfferSwipeDeck oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextSignature = _buildSignature(widget.zones);
    if (nextSignature != _signature) {
      _signature = nextSignature;
      _topIndex = 0;
      if (widget.zones.isNotEmpty) {
        _notifyFocusAfterFrame(widget.zones.first);
      }
      return;
    }

    if (_topIndex >= widget.zones.length && widget.zones.isNotEmpty) {
      _topIndex = widget.zones.length - 1;
      _notifyFocusAfterFrame(widget.zones[_topIndex]);
    }
  }

  String _buildSignature(List<ZoneSummary> zones) =>
      zones.map((zone) => zone.id).join('|');

  void _advance() {
    if (_topIndex >= widget.zones.length - 1) {
      setState(() => _topIndex = widget.zones.length);
      return;
    }

    final next = _topIndex + 1;
    setState(() => _topIndex = next);
    _notifyFocusAfterFrame(widget.zones[next]);
  }

  void _resetDeck() {
    if (widget.zones.isEmpty) return;
    setState(() => _topIndex = 0);
    _notifyFocusAfterFrame(widget.zones.first);
  }

  void _likeAndAdvance() {
    if (_topIndex >= widget.zones.length) return;
    widget.onLike(widget.zones[_topIndex]);
    _advance();
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    if (widget.zones.isEmpty) {
      return const SizedBox.shrink();
    }

    if (_topIndex >= widget.zones.length) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.md),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.favorite_border,
                size: 34,
                color: AppColors.primary,
              ),
              const SizedBox(height: AppSpace.sm),
              Text(
                strings.t('zones_reached_all'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpace.xs),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _resetDeck,
                      icon: const Icon(Icons.restart_alt_rounded),
                      label: Text(strings.t('zones_start_again')),
                    ),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: widget.onShowMap,
                      icon: const Icon(Icons.map_outlined),
                      label: Text(strings.t('zones_map')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    final visibleCount = math.min(3, widget.zones.length - _topIndex);
    final activeZone = widget.zones[_topIndex];

    return Column(
      children: [
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: [
              for (int offset = visibleCount - 1; offset >= 0; offset--)
                _buildLayerCard(offset),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.xs),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _likeAndAdvance,
                icon: const Icon(Icons.favorite_rounded),
                label: Text(strings.t('zones_like')),
              ),
            ),
            const SizedBox(width: AppSpace.xs),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _advance,
                icon: const Icon(Icons.close_rounded),
                label: Text(strings.t('zones_skip')),
              ),
            ),
            const SizedBox(width: AppSpace.xs),
            Expanded(
              child: FilledButton.icon(
                onPressed: () => widget.onOpen(activeZone),
                icon: const Icon(Icons.open_in_new_rounded),
                label: Text(strings.t('zones_details')),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLayerCard(int offset) {
    final strings = context.strings;
    final zone = widget.zones[_topIndex + offset];
    final card = _OfferCard(
      zone: zone,
      listingPurposeLabel: widget.listingPurposeLabel,
      listingCounts: widget.listingCountsFor(zone),
      topTypeSummary: widget.topTypesFor(widget.listingCountsFor(zone)),
      scoreColor: widget.scoreColorFor(zone),
      scoreTierLabel: widget.scoreTierFor(zone),
      onOpen: () => widget.onOpen(zone),
      onTap: () => widget.onFocus(zone),
    );

    if (offset == 0) {
      return GestureDetector(
        behavior: HitTestBehavior.translucent,
        onVerticalDragEnd: (details) {
          final speed = details.primaryVelocity ?? 0;
          if (speed < -220) {
            widget.onOpen(zone);
          }
        },
        child: Dismissible(
          key: ValueKey('offer_${zone.id}_$_topIndex'),
          direction: DismissDirection.horizontal,
          onDismissed: (direction) {
            if (direction == DismissDirection.endToStart) {
              widget.onLike(zone);
            }
            _advance();
          },
          background: _SwipeBackdrop(
            color: AppColors.danger,
            alignment: Alignment.centerLeft,
            icon: Icons.close_rounded,
            text: strings.t('zones_skip'),
          ),
          secondaryBackground: _SwipeBackdrop(
            color: AppColors.success,
            alignment: Alignment.centerRight,
            icon: Icons.favorite_rounded,
            text: strings.t('zones_like'),
          ),
          child: card,
        ),
      );
    }

    return Transform.translate(
      offset: Offset(0, 10.0 * offset),
      child: Transform.scale(
        scale: 1 - (offset * 0.04),
        child: IgnorePointer(child: card),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.zone,
    required this.listingPurposeLabel,
    required this.listingCounts,
    required this.topTypeSummary,
    required this.scoreColor,
    required this.scoreTierLabel,
    required this.onOpen,
    required this.onTap,
  });

  final ZoneSummary zone;
  final String listingPurposeLabel;
  final ListingTypeCounts listingCounts;
  final String topTypeSummary;
  final Color scoreColor;
  final String scoreTierLabel;
  final VoidCallback onOpen;
  final VoidCallback onTap;

  String _fallbackMapImage() {
    final lat = zone.centerLat.toStringAsFixed(4);
    final lng = zone.centerLng.toStringAsFixed(4);
    return Uri.https('staticmap.openstreetmap.de', '/staticmap.php', {
      'center': '$lat,$lng',
      'zoom': '13',
      'size': '1200x700',
      'markers': '$lat,$lng,red-pushpin',
    }).toString();
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final quiet = (zone.flags['quiet'] as bool?) ?? false;
    final transitFriendly = (zone.flags['transitFriendly'] as bool?) ?? false;
    final allergyFriendly = (zone.flags['allergyFriendly'] as bool?) ?? false;

    final images = {
      if ((zone.imageUrl ?? '').trim().isNotEmpty) zone.imageUrl!.trim(),
      ...zone.imageUrls.where((item) => item.trim().isNotEmpty),
    }.toList();
    final imageUrl = images.isNotEmpty ? images.first : _fallbackMapImage();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: const Color(0xFFE7ECE7),
                alignment: Alignment.center,
                child: const Icon(Icons.image_not_supported_outlined),
              ),
            ),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x30000000),
                    Color(0x00000000),
                    Color(0xC2000000),
                  ],
                ),
              ),
            ),
            Positioned(
              top: AppSpace.sm,
              left: AppSpace.sm,
              right: AppSpace.sm,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.xs,
                      vertical: AppSpace.xxs,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                    child: Text(
                      zone.city,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.xs,
                      vertical: AppSpace.xxs,
                    ),
                    decoration: BoxDecoration(
                      color: scoreColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      border: Border.all(
                        color: scoreColor.withValues(alpha: 0.7),
                      ),
                    ),
                    child: Text(
                      _scoreLabel(strings),
                      style: TextStyle(
                        color: scoreColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _ScoreCircle(
                    value: zone.overallScore.toStringAsFixed(0),
                    color: scoreColor,
                  ),
                ],
              ),
            ),
            Positioned(
              top: 42,
              right: AppSpace.sm,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.xs,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.86),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  strings.t('zones_swipe_up'),
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            Positioned(
              left: AppSpace.sm,
              right: AppSpace.sm,
              bottom: AppSpace.sm,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    zone.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xxs),
                  Text(
                    '$listingPurposeLabel offers: ${listingCounts.total}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    topTypeSummary,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xE8FFFFFF),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Row(
                    children: [
                      _FlagBadge(
                        label: strings.t('quiet'),
                        active: quiet,
                        activeColor: AppColors.success,
                      ),
                      const SizedBox(width: AppSpace.xs),
                      _FlagBadge(
                        label: strings.t('transit'),
                        active: transitFriendly,
                        activeColor: AppColors.warning,
                      ),
                      const SizedBox(width: AppSpace.xs),
                      _FlagBadge(
                        label: strings.t('allergies'),
                        active: allergyFriendly,
                        activeColor: AppColors.danger,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: onOpen,
                      child: Text(strings.t('zones_open_details')),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _scoreLabel(AppStrings strings) {
    switch (scoreTierLabel.toLowerCase()) {
      case 'best':
        return strings.t('best');
      case 'worse':
      case 'worst':
        return strings.t('worse');
      default:
        return strings.t('medium');
    }
  }
}

class _SwipeBackdrop extends StatelessWidget {
  const _SwipeBackdrop({
    required this.color,
    required this.alignment,
    required this.icon,
    required this.text,
  });

  final Color color;
  final Alignment alignment;
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
      alignment: alignment,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: AppSpace.xs),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreCircle extends StatelessWidget {
  const _ScoreCircle({required this.value, required this.color});

  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.14),
        border: Border.all(color: color, width: 1.5),
      ),
      child: Center(
        child: Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: color,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}

class _FlagBadge extends StatelessWidget {
  const _FlagBadge({
    required this.label,
    required this.active,
    required this.activeColor,
  });

  final String label;
  final bool active;
  final Color activeColor;

  @override
  Widget build(BuildContext context) {
    final color = active ? activeColor : Colors.white;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.xs,
        vertical: AppSpace.xxs,
      ),
      decoration: BoxDecoration(
        color: active
            ? activeColor.withValues(alpha: 0.22)
            : Colors.white.withValues(alpha: 0.2),
        border: Border.all(
          color: active
              ? activeColor.withValues(alpha: 0.4)
              : Colors.white.withValues(alpha: 0.45),
        ),
        borderRadius: BorderRadius.circular(AppRadius.button),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
