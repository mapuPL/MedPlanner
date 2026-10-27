import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:flutter_timezone/flutter_timezone.dart';
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

  Future<void> initialize({Function(String doseId)? onDoseTaken}) async {
    tz.initializeTimeZones();
    try {
      final String timeZoneName = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(timeZoneName));
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
        } else if (response.actionId == actionSnooze15) {
          await DatabaseService.instance.snoozeDose(payload, 15);
          scheduleSnoozeNotification(doseId: payload, title: 'Odroczony lek', body: 'Czas zażyć dawkę!', minutes: 15);
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
    required DateTime scheduledDateTime,
  }) async {
    final tz.TZDateTime tzTime = tz.TZDateTime.from(scheduledDateTime, tz.local);
    if (tzTime.isBefore(tz.TZDateTime.now(tz.local))) return;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
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
      'Dawka: $doseAmount ($therapyName)',
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
    final notificationId = doseId.hashCode + minutes;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      actions: const <AndroidNotificationAction>[
        AndroidNotificationAction(actionTake, 'Wziąłem', showsUserInterface: false, cancelNotification: true),
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
}
