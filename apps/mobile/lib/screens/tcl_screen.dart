import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../theme/app_design.dart';
import '../utils/format.dart';
import 'copilot_chat_screen.dart';

class TclScreen extends StatefulWidget {
  const TclScreen({
    super.key,
    this.initialZoneId,
    this.initialZoneA,
    this.initialZoneB,
  });

  final String? initialZoneId;
  final String? initialZoneA;
  final String? initialZoneB;

  @override
  State<TclScreen> createState() => _TclScreenState();
}

class _TclScreenState extends State<TclScreen> {
  late Future<List<ZoneSummary>> _zonesFuture;

  String? _zoneA;
  String? _zoneB;
  final _housingA = TextEditingController(text: '7000');
  final _housingB = TextEditingController(text: '8500');
  final _commuteA = TextEditingController(text: '380');
  final _commuteB = TextEditingController(text: '440');
  final _energyA = TextEditingController(text: '240');
  final _energyB = TextEditingController(text: '260');
  final _healthA = TextEditingController(text: '70');
  final _healthB = TextEditingController(text: '90');

  TclResult? _result;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _zonesFuture = context.read<AuthState>().api.getZones();
    _zonesFuture.then((zones) {
      if (!mounted || zones.length < 2) return;

      final preferredA =
          widget.initialZoneA ?? widget.initialZoneId ?? zones.first.id;
      final preferredB =
          widget.initialZoneB ??
          zones
              .firstWhere(
                (zone) => zone.id != preferredA,
                orElse: () => zones[1],
              )
              .id;

      setState(() {
        _zoneA = preferredA;
        _zoneB = preferredB;
      });
    });
  }

  @override
  void dispose() {
    _housingA.dispose();
    _housingB.dispose();
    _commuteA.dispose();
    _commuteB.dispose();
    _energyA.dispose();
    _energyB.dispose();
    _healthA.dispose();
    _healthB.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;
    if (_zoneA == null || _zoneB == null) return;

    setState(() => _loading = true);

    try {
      final result = await auth.api.analyzeTcl(
        profile: auth.profile,
        optionA: {
          'label': 'A',
          'zoneId': _zoneA,
          'housingCostMonthly': num.parse(_housingA.text),
          'commuteKmMonthly': num.parse(_commuteA.text),
          'energyKwhMonthly': num.parse(_energyA.text),
          'baselineHealthBudget': num.parse(_healthA.text),
        },
        optionB: {
          'label': 'B',
          'zoneId': _zoneB,
          'housingCostMonthly': num.parse(_housingB.text),
          'commuteKmMonthly': num.parse(_commuteB.text),
          'energyKwhMonthly': num.parse(_energyB.text),
          'baselineHealthBudget': num.parse(_healthB.text),
        },
      );

      setState(() => _result = result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.t('tcl_failed', args: {'value': e.toString()})),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  num _component(JsonMap option, String key) {
    final tcl = option['tcl'] as JsonMap;
    final components = tcl['components'] as JsonMap;
    return components[key] as num;
  }

  num _total(JsonMap option) {
    final tcl = option['tcl'] as JsonMap;
    return tcl['monthlyTotal'] as num;
  }

  Future<void> _openCopilot() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const CopilotChatScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;

    return FutureBuilder<List<ZoneSummary>>(
      future: _zonesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text(
              strings.t(
                'zones_loading_error',
                args: {'value': snapshot.error.toString()},
              ),
            ),
          );
        }

        final zones = snapshot.data ?? [];
        if (zones.length < 2) {
          return Center(child: Text(strings.t('need_two_zones')));
        }

        final verdict = _result == null
            ? ''
            : strings.t(
                'tcl_verdict',
                args: {
                  'label': _result!.cheaper,
                  'amount': formatDh(_result!.deltaMonthly),
                },
              );

        return ListView(
          padding: const EdgeInsets.all(AppSpace.md),
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpace.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: AppShadows.soft,
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.t('tcl_title'),
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: AppSpace.xs),
                        Text(
                          strings.t('tcl_helper'),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: strings.t('copilot'),
                    onPressed: _openCopilot,
                    icon: const Icon(Icons.smart_toy_outlined),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 920;
                if (!wide) {
                  return Column(
                    children: [
                      _optionCard(
                        title: strings.t('option_a'),
                        zones: zones,
                        selectedZone: _zoneA,
                        onZoneChanged: (v) => setState(() => _zoneA = v),
                        housing: _housingA,
                        commute: _commuteA,
                        energy: _energyA,
                        health: _healthA,
                        strings: strings,
                      ),
                      const SizedBox(height: AppSpace.sm),
                      _optionCard(
                        title: strings.t('option_b'),
                        zones: zones,
                        selectedZone: _zoneB,
                        onZoneChanged: (v) => setState(() => _zoneB = v),
                        housing: _housingB,
                        commute: _commuteB,
                        energy: _energyB,
                        health: _healthB,
                        strings: strings,
                      ),
                    ],
                  );
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _optionCard(
                        title: strings.t('option_a'),
                        zones: zones,
                        selectedZone: _zoneA,
                        onZoneChanged: (v) => setState(() => _zoneA = v),
                        housing: _housingA,
                        commute: _commuteA,
                        energy: _energyA,
                        health: _healthA,
                        strings: strings,
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: _optionCard(
                        title: strings.t('option_b'),
                        zones: zones,
                        selectedZone: _zoneB,
                        onZoneChanged: (v) => setState(() => _zoneB = v),
                        housing: _housingB,
                        commute: _commuteB,
                        energy: _energyB,
                        health: _healthB,
                        strings: strings,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpace.sm),
            FilledButton(
              onPressed: _loading ? null : _run,
              child: Text(
                _loading ? strings.t('running') : strings.t('run_tcl'),
              ),
            ),
            if (_result != null) ...[
              const SizedBox(height: AppSpace.sm),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        verdict,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: AppSpace.sm),
                      _resultRow(
                        strings.t('rent_mortgage'),
                        _component(_result!.optionA, 'housing'),
                        _component(_result!.optionB, 'housing'),
                      ),
                      _resultRow(
                        strings.t('commute_cost'),
                        _component(_result!.optionA, 'commute'),
                        _component(_result!.optionB, 'commute'),
                      ),
                      _resultRow(
                        strings.t('energy_cost'),
                        _component(_result!.optionA, 'energy'),
                        _component(_result!.optionB, 'energy'),
                      ),
                      _resultRow(
                        strings.t('health_allergy_cost'),
                        _component(_result!.optionA, 'health'),
                        _component(_result!.optionB, 'health'),
                      ),
                      _resultRow(
                        strings.t('risk_penalty'),
                        _component(_result!.optionA, 'riskPenalty'),
                        _component(_result!.optionB, 'riskPenalty'),
                      ),
                      const Divider(height: AppSpace.lg),
                      _resultRow(
                        strings.t('total_monthly_cost'),
                        _total(_result!.optionA),
                        _total(_result!.optionB),
                        bold: true,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _resultRow(String label, num a, num b, {bool bold = false}) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
      fontSize: bold ? 15 : 13,
      color: bold ? AppColors.text : AppColors.muted,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xxs),
      child: Row(
        children: [
          Expanded(flex: 4, child: Text(label, style: style)),
          Expanded(
            flex: 2,
            child: Text(formatDh(a), style: style, textAlign: TextAlign.right),
          ),
          const SizedBox(width: AppSpace.xs),
          Expanded(
            flex: 2,
            child: Text(formatDh(b), style: style, textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  Widget _optionCard({
    required String title,
    required List<ZoneSummary> zones,
    required String? selectedZone,
    required ValueChanged<String?> onZoneChanged,
    required TextEditingController housing,
    required TextEditingController commute,
    required TextEditingController energy,
    required TextEditingController health,
    required AppStrings strings,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpace.xs),
            DropdownButtonFormField<String>(
              initialValue: selectedZone,
              items: zones
                  .map(
                    (zone) => DropdownMenuItem(
                      value: zone.id,
                      child: Text(zone.name),
                    ),
                  )
                  .toList(),
              onChanged: onZoneChanged,
              decoration: InputDecoration(labelText: strings.t('zone')),
            ),
            const SizedBox(height: AppSpace.xs),
            _metricFieldRow(strings.t('rent_mortgage'), housing),
            _metricFieldRow(strings.t('commute_km_monthly'), commute),
            _metricFieldRow(strings.t('energy_kwh_monthly'), energy),
            _metricFieldRow(strings.t('health_monthly'), health),
          ],
        ),
      ),
    );
  }

  Widget _metricFieldRow(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.xs),
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          const SizedBox(width: AppSpace.xs),
          Expanded(
            flex: 4,
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.right,
              decoration: const InputDecoration(
                isDense: true,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: AppSpace.sm,
                  vertical: AppSpace.xs,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
