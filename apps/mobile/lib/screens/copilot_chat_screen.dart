import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../theme/app_design.dart';
import 'tcl_screen.dart';
import 'zone_detail_screen.dart';

enum CopilotMessageRole { user, assistant }

class CopilotMessage {
  const CopilotMessage({required this.role, required this.text, this.payload});

  final CopilotMessageRole role;
  final String text;
  final CopilotChatResult? payload;
}

class CopilotChatScreen extends StatefulWidget {
  const CopilotChatScreen({super.key});

  @override
  State<CopilotChatScreen> createState() => _CopilotChatScreenState();
}

class _CopilotChatScreenState extends State<CopilotChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  bool _sending = false;
  List<CopilotMessage> _messages = const [
    CopilotMessage(
      role: CopilotMessageRole.assistant,
      text:
          'Describe what you need and I will suggest top zones, explain why, and prepare a TCL comparison.',
    ),
  ];

  static const _quickPrompts = [
    'Quiet area near my work',
    'Low allergy risk',
    'Best zone for investing',
    'Compare Anfa vs Maarif',
  ];

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send(String raw) async {
    final message = raw.trim();
    if (message.length < 2 || _sending) return;

    setState(() {
      _sending = true;
      _messages = [
        ..._messages,
        CopilotMessage(role: CopilotMessageRole.user, text: message),
      ];
      _controller.clear();
    });
    _scrollToBottom();

    try {
      final auth = context.read<AuthState>();
      final response = await auth.api.copilotChat(
        message: message,
        profile: auth.profile,
      );

      if (!mounted) return;
      setState(() {
        _messages = [
          ..._messages,
          CopilotMessage(
            role: CopilotMessageRole.assistant,
            text: response.assistantText,
            payload: response,
          ),
        ];
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages = [
          ..._messages,
          CopilotMessage(
            role: CopilotMessageRole.assistant,
            text: 'Copilot failed: $e',
          ),
        ];
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('HomeMall Copilot')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          children: [
            Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xs,
              children: _quickPrompts
                  .map(
                    (prompt) => ActionChip(
                      label: Text(prompt),
                      onPressed: () => _send(prompt),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: AppSpace.sm),
            Expanded(
              child: ListView.separated(
                controller: _scrollController,
                itemCount: _messages.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpace.sm),
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  final isUser = message.role == CopilotMessageRole.user;

                  return Align(
                    alignment: isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isUser
                              ? const Color(0x1F2F5E46)
                              : AppColors.card,
                          borderRadius: BorderRadius.circular(AppRadius.card),
                          border: Border.all(color: AppColors.border),
                        ),
                        padding: const EdgeInsets.all(AppSpace.sm),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isUser ? 'You' : 'Assistant',
                              style: Theme.of(context).textTheme.labelLarge,
                            ),
                            const SizedBox(height: AppSpace.xxs),
                            Text(message.text),
                            if (!isUser && message.payload != null) ...[
                              const SizedBox(height: AppSpace.xs),
                              _recommendations(message.payload!),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpace.xs),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: _send,
                    minLines: 1,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Ask for zone recommendations...',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpace.xs),
                FilledButton(
                  onPressed: _sending ? null : () => _send(_controller.text),
                  child: Text(_sending ? '...' : 'Send'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _recommendations(CopilotChatResult payload) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (payload.recommendations.isNotEmpty)
          Text('Top 3 zones', style: Theme.of(context).textTheme.labelLarge),
        ...payload.recommendations.map((item) {
          return Container(
            margin: const EdgeInsets.only(top: AppSpace.xs),
            padding: const EdgeInsets.all(AppSpace.xs),
            decoration: BoxDecoration(
              color: const Color(0xFFF6FAF7),
              borderRadius: BorderRadius.circular(AppRadius.button),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Text(
                      item.score.toStringAsFixed(0),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpace.xxs),
                Wrap(
                  spacing: AppSpace.xs,
                  runSpacing: AppSpace.xs,
                  children: item.badges
                      .map(
                        (badge) => Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpace.xs,
                            vertical: AppSpace.xxs,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(
                              AppRadius.button,
                            ),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: AppSpace.xxs),
                ...item.why
                    .take(3)
                    .map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Text(
                          '• $line',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
                const SizedBox(height: AppSpace.xxs),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ZoneDetailScreen(zoneId: item.zoneId),
                      ),
                    );
                  },
                  child: const Text('Open details'),
                ),
              ],
            ),
          );
        }),
        if (payload.tclSuggestion != null) ...[
          const SizedBox(height: AppSpace.xs),
          FilledButton.tonal(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => TclScreen(
                    initialZoneA: payload.tclSuggestion!.optionAZoneId,
                    initialZoneB: payload.tclSuggestion!.optionBZoneId,
                  ),
                ),
              );
            },
            child: const Text('Run TCL with top two zones'),
          ),
        ],
        if (payload.followUpQuestions.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xs),
          ...payload.followUpQuestions.map(
            (question) => Text(
              'Follow-up: $question',
              style: const TextStyle(color: AppColors.warning, fontSize: 12),
            ),
          ),
        ],
      ],
    );
  }
}
