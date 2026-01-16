import 'package:flutter/material.dart';
import 'signup_screen.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  void _goToSignup(BuildContext context, String role) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SignupScreen(role: role),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Choose Your Role")),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Create your account",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 40),

            // Retailer Button
            ElevatedButton(
              onPressed: () => _goToSignup(context, "RETAILER"),
              style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 55)),
              child: const Text("I am a Retailer"),
            ),

            const SizedBox(height: 20),

            // Wholesaler Button
            ElevatedButton(
              onPressed: () => _goToSignup(context, "WHOLESALER"),
              style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 55)),
              child: const Text("I am a Wholesaler"),
            ),

            const SizedBox(height: 40),
            const Divider(height: 1),
            const SizedBox(height: 20),

            // ⭐ NEW — Sign In button
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/login');
              },
              child: const Text(
                "Already have an account? Sign In",
                style: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
