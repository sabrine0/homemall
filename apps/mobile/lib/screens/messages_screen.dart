import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import '../models/home_models.dart';
import '../services/auth_state.dart';
import '../utils/format.dart';
import 'auth/login_screen.dart';
import 'zone_detail_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key, this.initialConversationId});

  final String? initialConversationId;

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  bool _loading = true;
  bool _sending = false;
  String? _feedback;
  List<ChatConversation> _conversations = const [];
  List<ChatMessage> _messages = const [];
  String? _selectedConversationId;
  final _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedConversationId = widget.initialConversationId;
    _loadConversations();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;
    if (!auth.isAuthenticated) {
      setState(() {
        _loading = false;
        _conversations = const [];
        _messages = const [];
      });
      return;
    }

    setState(() {
      _loading = true;
      _feedback = null;
    });
    try {
      final conversations = await auth.api.getConversations();
      if (!mounted) return;
      setState(() {
        _conversations = conversations;
        final validRequested =
            _selectedConversationId != null &&
            conversations.any((item) => item.id == _selectedConversationId);
        _selectedConversationId = validRequested
            ? _selectedConversationId
            : (conversations.isNotEmpty ? conversations.first.id : null);
      });
      if (_selectedConversationId != null) {
        await _loadMessages(_selectedConversationId!);
      } else {
        setState(() => _messages = const []);
      }
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _feedback = strings.t(
          'messages_load_failed',
          args: {'value': e.toString()},
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadMessages(String conversationId) async {
    final strings = context.strings;
    try {
      final result = await context
          .read<AuthState>()
          .api
          .getConversationMessages(conversationId);
      if (!mounted) return;
      setState(() => _messages = result.messages);
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _feedback = strings.t(
          'messages_fetch_failed',
          args: {'value': e.toString()},
        ),
      );
    }
  }

  Future<void> _openLogin() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    if (!mounted) return;
    await _loadConversations();
  }

  Future<void> _sendMessage() async {
    final auth = context.read<AuthState>();
    final strings = context.strings;
    final text = _messageController.text.trim();
    final conversationId = _selectedConversationId;
    if (!auth.isAuthenticated || conversationId == null || text.isEmpty) {
      return;
    }

    setState(() {
      _sending = true;
      _feedback = null;
    });
    try {
      final message = await auth.api.sendConversationMessage(
        conversationId,
        text: text,
      );
      if (!mounted) return;
      setState(() {
        _messages = [..._messages, message];
        _messageController.clear();
      });
      await _loadConversations();
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _feedback = strings.t(
          'messages_send_failed',
          args: {'value': e.toString()},
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  ChatConversation? get _selectedConversation {
    final id = _selectedConversationId;
    if (id == null) return null;
    for (final item in _conversations) {
      if (item.id == id) {
        return item;
      }
    }
    return null;
  }

  String _counterpartLabel(ListingSellerSummary counterpart) {
    final displayName = counterpart.displayName?.trim();
    if (displayName != null && displayName.isNotEmpty) {
      return displayName;
    }
    final companyName = counterpart.companyName?.trim();
    if (companyName != null && companyName.isNotEmpty) {
      return companyName;
    }
    return counterpart.email;
  }

  Widget _counterpartAvatar(
    ListingSellerSummary counterpart, {
    double radius = 14,
  }) {
    final avatarUrl = counterpart.avatarUrl?.trim();
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundImage: NetworkImage(avatarUrl),
      );
    }

    final label = _counterpartLabel(counterpart);
    final initial = label.isEmpty ? '?' : label.substring(0, 1).toUpperCase();
    return CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xFFE2ECE4),
      foregroundColor: const Color(0xFF244735),
      child: Text(
        initial,
        style: TextStyle(fontSize: radius * 0.8, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildConversationsList() {
    final strings = context.strings;
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_conversations.isEmpty) {
      return Center(child: Text(strings.t('no_conversations')));
    }

    return ListView.separated(
      itemCount: _conversations.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final item = _conversations[index];
        final selected = item.id == _selectedConversationId;
        final priceText = item.listing.purpose == 'rent'
            ? '${formatDh(item.listing.priceMonthly ?? 0)} / month'
            : formatDh(item.listing.priceSale ?? 0);

        return InkWell(
          onTap: () async {
            setState(() => _selectedConversationId = item.id);
            await _loadMessages(item.id);
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFEAF4EE) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected
                    ? const Color(0xFF2E5B45)
                    : const Color(0xFFD4E0D8),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.listing.title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    _counterpartAvatar(item.counterpart),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _counterpartLabel(item.counterpart),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF1E3429),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            item.counterpart.email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF486052),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  priceText,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF2E5B45),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.lastMessage?.text ?? strings.t('no_messages'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMessagesPanel() {
    final strings = context.strings;
    final selected = _selectedConversation;
    if (selected == null) {
      return Center(child: Text(strings.t('select_conversation')));
    }

    final myId = context.read<AuthState>().isAuthenticated
        ? context.read<AuthState>().email
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF2F7F4),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFD4E0D8)),
          ),
          child: Row(
            children: [
              _counterpartAvatar(selected.counterpart, radius: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      selected.listing.title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      _counterpartLabel(selected.counterpart),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF1E3429),
                      ),
                    ),
                    Text(
                      selected.counterpart.email,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF486052),
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          ZoneDetailScreen(zoneId: selected.listing.zoneId),
                    ),
                  );
                },
                child: Text(strings.t('zone_button')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final message = _messages[index];
              final mine = myId != null && message.senderEmail == myId;
              return Align(
                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  constraints: const BoxConstraints(maxWidth: 420),
                  decoration: BoxDecoration(
                    color: mine
                        ? const Color(0xFF2E5B45)
                        : const Color(0xFFF3F6F3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.text,
                        style: TextStyle(
                          color: mine ? Colors.white : const Color(0xFF122018),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        message.createdAt,
                        style: TextStyle(
                          fontSize: 10,
                          color: mine
                              ? const Color(0xFFD9E6DE)
                              : const Color(0xFF62786B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: strings.t('type_message'),
                ),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _sending ? null : _sendMessage,
              child: Text(_sending ? '...' : strings.t('send')),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final signedIn = auth.isAuthenticated;
    final strings = context.strings;

    return Scaffold(
      appBar: AppBar(title: Text(strings.t('messages_title'))),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: !signedIn
              ? Center(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(strings.t('signin_to_chat')),
                          const SizedBox(height: 10),
                          FilledButton(
                            onPressed: _openLogin,
                            child: Text(strings.t('signin')),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final twoColumns = constraints.maxWidth > 900;

                    if (twoColumns) {
                      return Row(
                        children: [
                          Expanded(
                            flex: 4,
                            child: Card(child: _buildConversationsList()),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 6,
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(10),
                                child: _buildMessagesPanel(),
                              ),
                            ),
                          ),
                        ],
                      );
                    }

                    return Column(
                      children: [
                        SizedBox(
                          height: 260,
                          child: Card(child: _buildConversationsList()),
                        ),
                        const SizedBox(height: 10),
                        Expanded(
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: _buildMessagesPanel(),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
        ),
      ),
      floatingActionButton: _feedback == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => setState(() => _feedback = null),
              label: Text(_feedback!),
            ),
    );
  }
}
