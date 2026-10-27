import 'package:flutter/material.dart';

class SnoozeBottomSheet extends StatelessWidget {
  final String medicationName;
  final Function(int minutes) onSnoozeSelected;

  const SnoozeBottomSheet({
    super.key,
    required this.medicationName,
    required this.onSnoozeSelected,
  });

  static void show(BuildContext context, {
    required String medicationName,
    required Function(int minutes) onSnoozeSelected,
  }) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SnoozeBottomSheet(
        medicationName: medicationName,
        onSnoozeSelected: onSnoozeSelected,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Odłóż przypomnienie',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              medicationName,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            const SizedBox(height: 20),
            _btn(context, 5, 'Za 5 minut', Icons.timer_outlined),
            const SizedBox(height: 10),
            _btn(context, 15, 'Za 15 minut (rekomendowane)', Icons.timelapse),
            const SizedBox(height: 10),
            _btn(context, 30, 'Za 30 minut', Icons.alarm),
          ],
        ),
      ),
    );
  }

  Widget _btn(BuildContext context, int minutes, String label, IconData icon) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      icon: Icon(icon, color: Colors.teal),
      label: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      onPressed: () {
        Navigator.pop(context);
        onSnoozeSelected(minutes);
      },
    );
  }
}
