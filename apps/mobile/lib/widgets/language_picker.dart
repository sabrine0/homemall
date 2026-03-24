import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../services/app_locale_state.dart';
import '../theme/app_design.dart';

class LanguagePicker extends StatelessWidget {
  const LanguagePicker({
    super.key,
    this.compact = false,
    this.showHelper = false,
  });

  final bool compact;
  final bool showHelper;

  @override
  Widget build(BuildContext context) {
    final localeState = context.watch<AppLocaleState>();
    final strings = context.strings;

    final dropdown = Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpace.xs : AppSpace.sm,
        vertical: compact ? AppSpace.xxs : AppSpace.xs,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(compact ? 14 : 18),
        border: Border.all(color: AppColors.borderStrong),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.language_rounded,
            size: compact ? 16 : 18,
            color: AppColors.primary,
          ),
          SizedBox(width: compact ? AppSpace.xs : AppSpace.sm),
          DropdownButtonHideUnderline(
            child: DropdownButton<AppLanguage>(
              value: localeState.selection,
              borderRadius: BorderRadius.circular(18),
              icon: const Icon(Icons.expand_more_rounded, size: 18),
              style: TextStyle(
                fontSize: compact ? 12 : 14,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
              items: [
                DropdownMenuItem(
                  value: AppLanguage.system,
                  child: Text(strings.t('language_system')),
                ),
                DropdownMenuItem(
                  value: AppLanguage.en,
                  child: Text(strings.t('language_en')),
                ),
                DropdownMenuItem(
                  value: AppLanguage.fr,
                  child: Text(strings.t('language_fr')),
                ),
                DropdownMenuItem(
                  value: AppLanguage.ar,
                  child: Text(strings.t('language_ar')),
                ),
              ],
              onChanged: (value) {
                if (value == null) return;
                context.read<AppLocaleState>().setLanguage(value);
              },
            ),
          ),
        ],
      ),
    );

    if (compact) {
      return dropdown;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          strings.t('language'),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        if (showHelper) ...[
          const SizedBox(height: AppSpace.xxs),
          Text(
            strings.t('language_helper'),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(height: AppSpace.xs),
        dropdown,
      ],
    );
  }
}
