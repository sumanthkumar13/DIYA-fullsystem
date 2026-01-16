import 'package:flutter/material.dart';

class WholesalerDashboard extends StatelessWidget {
  const WholesalerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Wholesaler Dashboard")),
      body: const Center(
        child: Text(
          "Welcome, Wholesaler!",
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}
