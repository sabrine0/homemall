import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../services/auth_state.dart';
import '../theme/app_design.dart';
import '../widgets/language_picker.dart';
import 'auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loadingReport = false;
  bool _themeToggle = false;
  bool _emailAlerts = true;
  bool _savingAccount = false;
  bool _uploadingAvatar = false;
  String? _boundAccountEmail;
  final _displayNameController = TextEditingController();
  final _avatarUrlController = TextEditingController();
  final _phoneController = TextEditingController();
  final _whatsAppController = TextEditingController();
  final _instagramController = TextEditingController();
  final _facebookController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthState>();
    if (_boundAccountEmail == auth.email) {
      return;
    }
    _displayNameController.text = auth.displayName ?? '';
    _avatarUrlController.text = auth.avatarUrl ?? '';
    _phoneController.text = auth.contactPhone ?? '';
    _whatsAppController.text = auth.contactWhatsApp ?? '';
    _instagramController.text = auth.contactInstagram ?? '';
    _facebookController.text = auth.contactFacebook ?? '';
    _boundAccountEmail = auth.email;
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _avatarUrlController.dispose();
    _phoneController.dispose();
    _whatsAppController.dispose();
    _instagramController.dispose();
    _facebookController.dispose();
    super.dispose();
  }

  Future<void> _importAvatar(AuthState auth) async {
    if (!auth.isAuthenticated) {
      await _openLogin();
      if (!mounted || !context.read<AuthState>().isAuthenticated) {
        return;
      }
    }

    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) {
      return;
    }

    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await picked.readAsBytes();
      final uploadedUrl = await auth.api.uploadProfileImage(
        bytes: bytes,
        fileName: picked.name.isNotEmpty ? picked.name : 'avatar.jpg',
      );
      _avatarUrlController.text = uploadedUrl;
      await auth.updateAccount(avatarUrl: uploadedUrl);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Profile image imported.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Could not import image: $e')));
    } finally {
      if (mounted) {
        setState(() => _uploadingAvatar = false);
      }
    }
  }

  Future<void> _openLogin() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _openReportPreview() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;

    if (!auth.isAuthenticated) {
      await _openLogin();
      if (!mounted || !context.read<AuthState>().isAuthenticated) {
        return;
      }
    }

    setState(() => _loadingReport = true);
    try {
      final report = await auth.api.getReport();
      if (!mounted) return;

      final summary = (report['summary'] as String?) ?? '';
      final generatedAt = (report['generatedAt'] as String?) ?? '';
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(strings.t('decision_report')),
          content: Text(
            '$summary\n\n${strings.t('generated', args: {'value': generatedAt})}',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(strings.t('close')),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            strings.t('report_failed', args: {'value': e.toString()}),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loadingReport = false);
      }
    }
  }

  Future<void> _savePreferences() async {
    final auth = context.read<AuthState>();
    if (auth.isAuthenticated) {
      final nextDisplayName = _displayNameController.text.trim();
      final nextAvatarUrl = _avatarUrlController.text.trim();
      final nextPhone = _phoneController.text.trim();
      final nextWhatsApp = _whatsAppController.text.trim();
      final nextInstagram = _instagramController.text.trim();
      final nextFacebook = _facebookController.text.trim();
      final currentDisplayName = auth.displayName ?? '';
      final currentAvatarUrl = auth.avatarUrl ?? '';
      final currentPhone = auth.contactPhone ?? '';
      final currentWhatsApp = auth.contactWhatsApp ?? '';
      final currentInstagram = auth.contactInstagram ?? '';
      final currentFacebook = auth.contactFacebook ?? '';
      final hasChanges =
          nextDisplayName != currentDisplayName ||
          nextAvatarUrl != currentAvatarUrl ||
          nextPhone != currentPhone ||
          nextWhatsApp != currentWhatsApp ||
          nextInstagram != currentInstagram ||
          nextFacebook != currentFacebook;

      if (hasChanges) {
        setState(() => _savingAccount = true);
        try {
          await auth.updateAccount(
            displayName: nextDisplayName == currentDisplayName
                ? null
                : nextDisplayName,
            avatarUrl: nextAvatarUrl == currentAvatarUrl ? null : nextAvatarUrl,
            contactPhone: nextPhone == currentPhone ? null : nextPhone,
            contactWhatsApp: nextWhatsApp == currentWhatsApp
                ? null
                : nextWhatsApp,
            contactInstagram: nextInstagram == currentInstagram
                ? null
                : nextInstagram,
            contactFacebook: nextFacebook == currentFacebook
                ? null
                : nextFacebook,
          );
        } finally {
          if (mounted) {
            setState(() => _savingAccount = false);
          }
        }
      }
    }

    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(context.tr('settings_saved'))));
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;

    return Consumer<AuthState>(
      builder: (context, auth, _) {
        final profile = auth.profile;
        final sensitivities = profile?.sensitivities;

        return ListView(
          padding: const EdgeInsets.all(AppSpace.md),
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpace.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryHover],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: AppShadows.soft,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.t('settings_title'),
                    style: Theme.of(
                      context,
                    ).textTheme.headlineMedium?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Text(
                    strings.t('settings_subtitle'),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xDDEAF8EE),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.md),
                child: const LanguagePicker(showHelper: true),
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            _SectionCard(
              title: strings.t('profile'),
              child: Column(
                children: [
                  if (!auth.isAuthenticated)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: FilledButton.tonal(
                          onPressed: _openLogin,
                          child: Text(strings.t('signin_unlock')),
                        ),
                      ),
                    ),
                  if ((auth.avatarUrl ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: CircleAvatar(
                        radius: 30,
                        backgroundImage: NetworkImage(auth.avatarUrl!),
                      ),
                    ),
                  _line(
                    strings.t('email'),
                    auth.isAuthenticated
                        ? (auth.email ?? '-')
                        : strings.t('guest_user'),
                  ),
                  _line(
                    strings.t('onboarding_tab'),
                    profile == null
                        ? strings.t('not_saved')
                        : strings.t('saved_to_account'),
                  ),
                  _line(
                    strings.t('goal'),
                    profile == null ? '-' : _goalLabel(profile.goal, strings),
                  ),
                  if (auth.isAuthenticated) ...[
                    const SizedBox(height: AppSpace.sm),
                    TextField(
                      controller: _displayNameController,
                      decoration: const InputDecoration(
                        labelText: 'Display name',
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    TextField(
                      controller: _avatarUrlController,
                      decoration: const InputDecoration(
                        labelText: 'Profile image URL',
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: _uploadingAvatar
                            ? null
                            : () => _importAvatar(auth),
                        icon: const Icon(Icons.file_upload_outlined),
                        label: Text(
                          _uploadingAvatar
                              ? 'Importing image...'
                              : 'Import image',
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            decoration: const InputDecoration(
                              labelText: 'Phone',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpace.xs),
                        Expanded(
                          child: TextField(
                            controller: _whatsAppController,
                            decoration: const InputDecoration(
                              labelText: 'WhatsApp',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _instagramController,
                            decoration: const InputDecoration(
                              labelText: 'Instagram',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpace.xs),
                        Expanded(
                          child: TextField(
                            controller: _facebookController,
                            decoration: const InputDecoration(
                              labelText: 'Facebook',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: FilledButton.tonal(
                        onPressed: _savingAccount ? null : _savePreferences,
                        child: Text(
                          _savingAccount
                              ? 'Saving...'
                              : 'Update account profile',
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            _SectionCard(
              title: strings.t('sensitivity_preferences'),
              child: Column(
                children: [
                  _line(
                    strings.t('noise'),
                    '${sensitivities?['noise'] ?? '-'} / 5',
                  ),
                  _line(
                    strings.t('heat'),
                    '${sensitivities?['heat'] ?? '-'} / 5',
                  ),
                  _line(
                    strings.t('allergies'),
                    '${sensitivities?['allergies'] ?? '-'} / 5',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            _SectionCard(
              title: strings.t('appearance_notifications'),
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(strings.t('theme_toggle_demo')),
                    subtitle: Text(strings.t('theme_toggle_helper')),
                    value: _themeToggle,
                    onChanged: (value) => setState(() => _themeToggle = value),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(strings.t('email_alerts')),
                    subtitle: Text(strings.t('email_alerts_helper')),
                    value: _emailAlerts,
                    onChanged: (value) => setState(() => _emailAlerts = value),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            _SectionCard(
              title: strings.t('session'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _line(
                    strings.t('session'),
                    auth.isAuthenticated
                        ? strings.t('authenticated')
                        : strings.t('guest_mode'),
                  ),
                  _line(
                    strings.t('report_access'),
                    auth.isAuthenticated
                        ? strings.t('enabled')
                        : strings.t('signin_required'),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  if (!auth.isAuthenticated)
                    FilledButton.tonal(
                      onPressed: _openLogin,
                      child: Text(strings.t('signin_unlock')),
                    ),
                  const SizedBox(height: AppSpace.xs),
                  FilledButton(
                    onPressed: _loadingReport ? null : _openReportPreview,
                    child: Text(
                      _loadingReport
                          ? strings.t('loading_report')
                          : strings.t('preview_report'),
                    ),
                  ),
                  if (auth.isAuthenticated) ...[
                    const SizedBox(height: AppSpace.xs),
                    OutlinedButton(
                      onPressed: () async => auth.logout(),
                      child: Text(strings.t('logout')),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpace.md),
            FilledButton(
              onPressed: _savingAccount ? null : _savePreferences,
              child: Text(strings.t('save')),
            ),
          ],
        );
      },
    );
  }

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

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpace.xs),
            child,
          ],
        ),
      ),
    );
  }
}
