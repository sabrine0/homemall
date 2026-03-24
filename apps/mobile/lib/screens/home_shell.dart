import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../localization/app_strings.dart';
import 'create_listing_screen.dart';
import 'messages_screen.dart';
import 'onboarding_screen.dart';
import 'settings_screen.dart';
import 'tcl_screen.dart';
import '../theme/app_design.dart';
import '../services/auth_state.dart';
import 'auth/login_screen.dart';
import 'zones_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  Future<void> _onDestinationSelected(int value) async {
    final auth = context.read<AuthState>();
    final requiresAuth = value == 1 || value == 4;

    if (requiresAuth && !auth.isAuthenticated) {
      await Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      if (!mounted || !auth.isAuthenticated) {
        return;
      }
    }

    setState(() => _index = value);
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final screens = [
      ZonesScreen(onStartAnalysis: () => setState(() => _index = 2)),
      const CreateListingScreen(),
      const OnboardingScreen(),
      const TclScreen(),
      const MessagesScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      body: SafeArea(child: screens[_index]),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(
          AppSpace.sm,
          0,
          AppSpace.sm,
          AppSpace.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(24),
          boxShadow: AppShadows.soft,
          border: Border.all(color: AppColors.border),
        ),
        child: NavigationBar(
          height: 82,
          backgroundColor: Colors.transparent,
          selectedIndex: _index,
          onDestinationSelected: _onDestinationSelected,
          destinations: [
            NavigationDestination(
              icon: Icon(Icons.map_outlined),
              label: strings.t('zones_tab'),
            ),
            NavigationDestination(
              icon: Icon(Icons.add_home_outlined),
              label: strings.t('sell_rent_tab'),
            ),
            NavigationDestination(
              icon: Icon(Icons.fact_check_outlined),
              label: strings.t('onboarding_tab'),
            ),
            NavigationDestination(
              icon: Icon(Icons.calculate_outlined),
              label: strings.t('tcl_tab'),
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline),
              label: strings.t('messages_tab'),
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              label: strings.t('settings_tab'),
            ),
          ],
        ),
      ),
    );
  }
}
