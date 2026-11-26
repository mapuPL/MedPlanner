import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'screens/home_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/cabinet_screen.dart';
import 'screens/therapies_screen.dart';
import 'screens/backup_sync_screen.dart';
import 'services/database_service.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pl_PL', null);

  await DatabaseService.instance.database;
  try {
    await NotificationService.instance.initialize();
    await NotificationService.instance.rescheduleAllUpcomingDoses();
  } catch (_) {}

  runApp(const MedPlanerApp());
}

class MedPlanerApp extends StatelessWidget {
  const MedPlanerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MedPlaner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF4F7F7),
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
      ),
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _idx = 0;
  final List<Widget> _screens = const [
    HomeScreen(),
    CalendarScreen(),
    CabinetScreen(),
    TherapiesScreen(),
    BackupSyncScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _idx, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today), label: 'Dziś'),
          NavigationDestination(icon: Icon(Icons.calendar_month), label: 'Kalendarz'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Apteczka'),
          NavigationDestination(icon: Icon(Icons.healing), label: 'Terapie'),
          NavigationDestination(icon: Icon(Icons.cloud_sync_outlined), label: 'Kopia'),
        ],
      ),
    );
  }
}
