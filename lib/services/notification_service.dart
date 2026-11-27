import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:flutter_timezone/flutter_timezone.dart';
import '../models/dose_log.dart';
import 'database_service.dart';

class NotificationService {
  static final NotificationService instance = NotificationService._internal();
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static const String channelId = 'medication_reminders_exact';
  static const String channelName = 'Przypomnienia o Lekach';
  static const String channelDesc = 'Dokładne alarmy o porach zażywania leków';

  static const String actionTake = 'ACTION_TAKE';
  static const String actionSnooze5 = 'ACTION_SNOOZE_5';
  static const String actionSnooze15 = 'ACTION_SNOOZE_15';
  static const String actionSnooze30 = 'ACTION_SNOOZE_30';

  static int _doseNotificationId(String doseId) => doseId.hashCode & 0x7fffffff;
  static int _snoozeNotificationId(String doseId) => ('${doseId}_snooze').hashCode & 0x7fffffff;

  Future<void> initialize({Function(String doseId)? onDoseTaken}) async {
    tz.initializeTimeZones();
    try {
      final TimezoneInfo currentTimeZone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(currentTimeZone.identifier));
    } catch (_) {
      tz.setLocalLocation(tz.getLocation('Europe/Warsaw'));
    }

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final InitializationSettings initSettings = InitializationSettings(android: androidSettings);

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        final payload = response.payload;
        if (payload == null) return;

        if (response.actionId == actionTake) {
          await DatabaseService.instance.markDoseAsTaken(payload);
          if (onDoseTaken != null) onDoseTaken(payload);
        } else if (response.actionId == actionSnooze5) {
          await DatabaseService.instance.snoozeDose(payload, 5);
        } else if (response.actionId == actionSnooze15) {
          await DatabaseService.instance.snoozeDose(payload, 15);
        } else if (response.actionId == actionSnooze30) {
          await DatabaseService.instance.snoozeDose(payload, 30);
        }
      },
    );

    final androidImpl = _notificationsPlugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.requestNotificationsPermission();
      await androidImpl.requestExactAlarmsPermission();
    }
  }

  Future<void> scheduleExactDoseNotification({
    required int notificationId,
    required String doseId,
    required String medicationName,
    required String doseAmount,
    required String therapyName,
    String? instructions,
    required DateTime scheduledDateTime,
  }) async {
    final tz.TZDateTime tzTime = tz.TZDateTime.from(scheduledDateTime, tz.local);
    if (tzTime.isBefore(tz.TZDateTime.now(tz.local))) return;

    final trimmedInst = instructions?.trim() ?? '';
    final bodyText = trimmedInst.isNotEmpty
        ? 'Dawka: $doseAmount ($therapyName) · $trimmedInst'
        : 'Dawka: $doseAmount ($therapyName)';

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      styleInformation: BigTextStyleInformation(bodyText),
      actions: const <AndroidNotificationAction>[
        AndroidNotificationAction(
          actionTake,
          'Wziąłem',
          showsUserInterface: false,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          actionSnooze15,
          'Odłóż (15 min)',
          showsUserInterface: false,
          cancelNotification: true,
        ),
      ],
    );

    await _notificationsPlugin.zonedSchedule(
      notificationId,
      '💊 Czas na lek: $medicationName',
      bodyText,
      tzTime,
      NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      payload: doseId,
    );
  }

  Future<void> scheduleSnoozeNotification({
    required String doseId,
    required String title,
    required String body,
    required int minutes,
  }) async {
    final scheduledTime = tz.TZDateTime.now(tz.local).add(Duration(minutes: minutes));
    final notificationId = _snoozeNotificationId(doseId);

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      styleInformation: BigTextStyleInformation(body),
      actions: const <AndroidNotificationAction>[
        AndroidNotificationAction(actionTake, 'Wziąłem', showsUserInterface: false, cancelNotification: true),
        AndroidNotificationAction(actionSnooze15, 'Odłóż (15 min)', showsUserInterface: false, cancelNotification: true),
      ],
    );

    await _notificationsPlugin.zonedSchedule(
      notificationId,
      title,
      body,
      scheduledTime,
      NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      payload: doseId,
    );
  }

  /// Anuluje zaplanowane powiadomienie główne oraz odroczone dla podanej dawki
  Future<void> cancelNotificationForDose(String doseId) async {
    try {
      await _notificationsPlugin.cancel(_doseNotificationId(doseId));
      await _notificationsPlugin.cancel(_snoozeNotificationId(doseId));
    } catch (_) {}
  }

  /// Przelicza i planuje dokładne alarmy w tle dla wszystkich nadchodzących dawek (dzisiaj + 6 dni)
  /// Działa w trybie exactAllowWhileIdle, dzięki czemu budzi urządzenie nawet w trybie uśpienia (Doze mode)
  Future<void> rescheduleAllUpcomingDoses() async {
    try {
      final pending = await _notificationsPlugin.pendingNotificationRequests();
      for (final req in pending) {
        if (req.id != 999999) {
          await _notificationsPlugin.cancel(req.id);
        }
      }

      final now = DateTime.now();

      // Przelicz powiadomienia na dzisiaj oraz kolejne 6 dni w przód (łącznie 7 dni)
      for (int i = 0; i < 7; i++) {
        final targetDate = now.add(Duration(days: i));
        final doses = await DatabaseService.instance.getDosesForDate(targetDate);

        for (final dose in doses) {
          if (dose.status == DoseStatus.taken || dose.status == DoseStatus.skipped) continue;

          DateTime scheduledAt;
          int notifId;

          if (dose.status == DoseStatus.snoozed && dose.snoozedUntil != null) {
            final parts = dose.snoozedUntil!.split(':');
            if (parts.length >= 2) {
              final alarmBaseDate = dose.snoozedUntil!.compareTo(dose.scheduledTime) < 0
                  ? targetDate.add(const Duration(days: 1))
                  : targetDate;
              scheduledAt = DateTime(
                alarmBaseDate.year,
                alarmBaseDate.month,
                alarmBaseDate.day,
                int.tryParse(parts[0]) ?? 8,
                int.tryParse(parts[1]) ?? 0,
              );
              notifId = _snoozeNotificationId(dose.id);
            } else {
              continue;
            }
          } else {
            final parts = dose.scheduledTime.split(':');
            scheduledAt = DateTime(
              targetDate.year,
              targetDate.month,
              targetDate.day,
              int.tryParse(parts[0]) ?? 8,
              int.tryParse(parts[1]) ?? 0,
            );
            notifId = _doseNotificationId(dose.id);
          }

          if (scheduledAt.isAfter(now)) {
            await scheduleExactDoseNotification(
              notificationId: notifId,
              doseId: dose.id,
              medicationName: dose.medicationName ?? 'Lek',
              doseAmount: dose.formattedDose,
              therapyName: dose.therapyName ?? 'Terapia',
              instructions: dose.instructions,
              scheduledDateTime: scheduledAt,
            );
          }
        }
      }
    } catch (_) {}
  }

  /// Natychmiastowy test działania w tle – za x sekund (np. 5s)
  /// Pozwala użytkownikowi zablokować telefon lub wyjść na pulpit i sprawdzić czy powiadomienie wyskoczy
  Future<void> scheduleTestBackgroundNotification({int secondsDelay = 5}) async {
    final tz.TZDateTime tzTime = tz.TZDateTime.now(tz.local).add(Duration(seconds: secondsDelay));
    const androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(actionTake, 'Wziąłem', showsUserInterface: false, cancelNotification: true),
        AndroidNotificationAction(actionSnooze15, 'Odłóż (15 min)', showsUserInterface: false, cancelNotification: true),
      ],
    );

    await _notificationsPlugin.zonedSchedule(
      999999,
      '🔔 Test powiadomienia w tle MedPlaner',
      'Powiadomienie z górnego paska działa poprawnie nawet przy wyłączonej aplikacji!',
      tzTime,
      const NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
  }
}
