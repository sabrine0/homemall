import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:homemall_mobile/main.dart';
import 'package:homemall_mobile/screens/home_shell.dart';
import 'package:homemall_mobile/services/auth_state.dart';
import 'package:homemall_mobile/services/app_locale_state.dart';
import 'package:homemall_mobile/widgets/language_picker.dart';

Widget _wrapWithAuth(Widget child) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthState()),
      ChangeNotifierProvider(create: (_) => AppLocaleState()),
    ],
    child: MaterialApp(home: child),
  );
}

void main() {
  testWidgets('App renders splash', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthState()),
          ChangeNotifierProvider(create: (_) => AppLocaleState()),
        ],
        child: const HomeMallApp(),
      ),
    );
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byIcon(Icons.home_work_rounded), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 900));
    await tester.pump();
  });

  testWidgets('Home shell shows all main destinations', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(_wrapWithAuth(const HomeShell()));
    await tester.pump();

    expect(find.byIcon(Icons.map_outlined), findsWidgets);
    expect(find.byIcon(Icons.add_home_outlined), findsWidgets);
    expect(find.byIcon(Icons.fact_check_outlined), findsWidgets);
    expect(find.byIcon(Icons.calculate_outlined), findsWidgets);
    expect(find.byIcon(Icons.chat_bubble_outline), findsWidgets);
    expect(find.byIcon(Icons.settings_outlined), findsWidgets);
  });

  testWidgets('Guest can switch to settings tab', (WidgetTester tester) async {
    await tester.pumpWidget(_wrapWithAuth(const HomeShell()));
    await tester.pump();

    await tester.tap(find.byIcon(Icons.settings_outlined).first);
    await tester.pumpAndSettle();

    expect(find.byType(LanguagePicker), findsOneWidget);
    expect(find.byIcon(Icons.language_rounded), findsOneWidget);
  });

  testWidgets('Guest opening Sell/Rent is redirected to login', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(_wrapWithAuth(const HomeShell()));
    await tester.pump();

    await tester.tap(find.byIcon(Icons.add_home_outlined).last);
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsNWidgets(2));
    expect(find.byType(LanguagePicker), findsOneWidget);
  });
}
