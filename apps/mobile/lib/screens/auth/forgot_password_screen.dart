import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../localization/app_strings.dart';
import '../../services/auth_state.dart';
import '../../theme/app_design.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _loading = false;
  bool _codeRequested = false;
  bool _codeVerified = false;
  String? _error;
  String? _info;
  String? _codePreview;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final result = await context.read<AuthState>().api.requestPasswordReset(
        _emailController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _codeRequested = true;
        _codeVerified = false;
        _codePreview = result['verificationCodePreview'] as String?;
        _info = (result['message'] as String?) ?? 'Verification code sent.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _verifyCode() async {
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      await context.read<AuthState>().api.verifyPasswordResetCode(
        email: _emailController.text.trim(),
        code: _codeController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _codeVerified = true;
        _info = 'Code verified. You can now set a new password.';
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _resetPassword() async {
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final result = await context.read<AuthState>().api.resetPassword(
        email: _emailController.text.trim(),
        code: _codeController.text.trim(),
        newPassword: _newPasswordController.text,
      );
      if (!mounted) return;
      final message =
          (result['message'] as String?) ?? 'Password reset successfully.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;

    return Scaffold(
      appBar: AppBar(title: Text(strings.t('forgot_password'))),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      strings.t('forgot_password'),
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: AppSpace.xs),
                    Text(
                      strings.t('forgot_password_help'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: AppSpace.md),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: strings.t('email'),
                      ),
                    ),
                    const SizedBox(height: AppSpace.sm),
                    FilledButton(
                      onPressed: _loading ? null : _sendCode,
                      child: Text(
                        _loading
                            ? strings.t('please_wait')
                            : strings.t('send_verification_code'),
                      ),
                    ),
                    if (_codePreview != null) ...[
                      const SizedBox(height: AppSpace.sm),
                      Text(
                        '${strings.t('verification_code_preview')}: $_codePreview',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                    if (_codeRequested) ...[
                      const SizedBox(height: AppSpace.md),
                      TextField(
                        controller: _codeController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: strings.t('verification_code'),
                        ),
                      ),
                      const SizedBox(height: AppSpace.sm),
                      OutlinedButton(
                        onPressed: _loading ? null : _verifyCode,
                        child: Text(
                          _loading
                              ? strings.t('please_wait')
                              : strings.t('verify_code'),
                        ),
                      ),
                    ],
                    if (_codeVerified) ...[
                      const SizedBox(height: AppSpace.md),
                      TextField(
                        controller: _newPasswordController,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: strings.t('new_password'),
                        ),
                      ),
                      const SizedBox(height: AppSpace.sm),
                      FilledButton(
                        onPressed: _loading ? null : _resetPassword,
                        child: Text(
                          _loading
                              ? strings.t('please_wait')
                              : strings.t('reset_password'),
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: AppSpace.sm),
                      Text(
                        _error!,
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ],
                    if (_info != null) ...[
                      const SizedBox(height: AppSpace.sm),
                      Text(
                        _info!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
