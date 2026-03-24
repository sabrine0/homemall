import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../theme/app_design.dart';
import '../utils/format.dart';
import 'auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  bool _saving = false;

  String _goal = 'rent';
  int _budgetMin = 3000;
  int _budgetMax = 12000;
  double _workLat = 33.5731;
  double _workLng = -7.5898;
  final Set<String> _mobilityModes = {'walk', 'transit'};
  int _noise = 2;
  int _heat = 2;
  int _allergies = 2;

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;
    if (auth.isAuthenticated) {
      return true;
    }

    final shouldLogin = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.t('signin_required')),
        content: Text(strings.t('signin_to_save_profile')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(strings.t('continue_guest')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(strings.t('signin')),
          ),
        ],
      ),
    );

    if (shouldLogin != true || !mounted) {
      return false;
    }

    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    return mounted && auth.isAuthenticated;
  }

  Future<void> _save() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;
    final authenticated = await _ensureAuthenticated();
    if (!authenticated) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(strings.t('signin_to_save_profile'))),
        );
      }
      return;
    }

    setState(() => _saving = true);

    final profile = UserProfile(
      goal: _goal,
      budgetMin: _budgetMin,
      budgetMax: _budgetMax,
      workLat: _workLat,
      workLng: _workLng,
      mobilityModes: _mobilityModes.toList(),
      sensitivities: {'noise': _noise, 'heat': _heat, 'allergies': _allergies},
    );

    try {
      await auth.saveProfile(profile);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.t('profile_saved'))));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              strings.t('save_failed', args: {'value': e.toString()}),
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final progress = (_step + 1) / 3;
    final title = [
      strings.t('goal_budget'),
      strings.t('work_mobility'),
      strings.t('sensitivity_tuning'),
    ][_step];
    final helper = [
      strings.t('goal_budget_helper'),
      strings.t('work_mobility_helper'),
      strings.t('sensitivity_tuning_helper'),
    ][_step];

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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                strings.t('onboarding_title'),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpace.xs),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      strings.t(
                        'onboarding_step',
                        args: {'current': '${_step + 1}'},
                      ),
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                  ),
                  Text(
                    '${(progress * 100).round()}%',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.xs),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.button),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 10,
                  color: AppColors.primary,
                  backgroundColor: AppColors.border,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSpace.xs),
                Text(helper, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: AppSpace.md),
                if (_step == 0) _goalBudgetStep(strings),
                if (_step == 1) _workMobilityStep(strings),
                if (_step == 2) _sensitivityStep(strings),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            OutlinedButton(
              onPressed: _step == 0 ? null : () => setState(() => _step--),
              child: Text(strings.t('back')),
            ),
            const SizedBox(width: AppSpace.xs),
            if (_step < 2)
              FilledButton(
                onPressed: () => setState(() => _step++),
                child: Text(strings.t('continue')),
              )
            else
              FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(
                  _saving
                      ? strings.t('saving')
                      : strings.t('finish_onboarding'),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _goalBudgetStep(AppStrings strings) {
    final range = RangeValues(_budgetMin.toDouble(), _budgetMax.toDouble());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _goal,
          decoration: InputDecoration(labelText: strings.t('goal')),
          items: [
            DropdownMenuItem(value: 'rent', child: Text(strings.t('rent'))),
            DropdownMenuItem(value: 'buy', child: Text(strings.t('buy'))),
            DropdownMenuItem(value: 'sell', child: Text(strings.t('sell'))),
            DropdownMenuItem(value: 'invest', child: Text(strings.t('invest'))),
            DropdownMenuItem(value: 'build', child: Text(strings.t('build'))),
            DropdownMenuItem(
              value: 'manage_rental',
              child: Text(strings.t('manage_rental')),
            ),
          ],
          onChanged: (value) => setState(() => _goal = value ?? 'rent'),
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          strings.t('budget_range_monthly'),
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: AppSpace.xxs),
        Text(
          '${formatDh(_budgetMin)} - ${formatDh(_budgetMax)}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        RangeSlider(
          values: range,
          min: 1000,
          max: 30000,
          divisions: 116,
          labels: RangeLabels(formatDh(_budgetMin), formatDh(_budgetMax)),
          onChanged: (value) {
            setState(() {
              _budgetMin = value.start.round();
              _budgetMax = value.end.round();
            });
          },
        ),
      ],
    );
  }

  Widget _workMobilityStep(AppStrings strings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: _workLat.toString(),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: strings.t('work_latitude'),
                ),
                onChanged: (value) =>
                    _workLat = double.tryParse(value) ?? _workLat,
              ),
            ),
            const SizedBox(width: AppSpace.xs),
            Expanded(
              child: TextFormField(
                initialValue: _workLng.toString(),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: strings.t('work_longitude'),
                ),
                onChanged: (value) =>
                    _workLng = double.tryParse(value) ?? _workLng,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          strings.t('mobility_modes'),
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: AppSpace.xs),
        Wrap(
          spacing: AppSpace.xs,
          runSpacing: AppSpace.xs,
          children: ['walk', 'transit', 'car', 'bike'].map((mode) {
            final selected = _mobilityModes.contains(mode);
            return FilterChip(
              label: Text(_modeLabel(mode, strings)),
              selected: selected,
              onSelected: (active) {
                setState(() {
                  if (active) {
                    _mobilityModes.add(mode);
                  } else {
                    _mobilityModes.remove(mode);
                  }
                  if (_mobilityModes.isEmpty) {
                    _mobilityModes.add('walk');
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _sensitivityStep(AppStrings strings) {
    Widget slider(String label, int value, ValueChanged<int> onChanged) {
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(label, style: Theme.of(context).textTheme.labelLarge),
                const Spacer(),
                Text(
                  '$value / 5',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            Slider(
              min: 0,
              max: 5,
              divisions: 5,
              value: value.toDouble(),
              onChanged: (v) => onChanged(v.round()),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        slider(strings.t('noise'), _noise, (v) => setState(() => _noise = v)),
        slider(strings.t('heat'), _heat, (v) => setState(() => _heat = v)),
        slider(
          strings.t('allergies'),
          _allergies,
          (v) => setState(() => _allergies = v),
        ),
      ],
    );
  }

  String _modeLabel(String raw, AppStrings strings) {
    switch (raw) {
      case 'walk':
        return strings.t('walk');
      case 'transit':
        return strings.t('transit');
      case 'car':
        return strings.t('car');
      case 'bike':
        return strings.t('bike');
      default:
        return raw;
    }
  }
}
