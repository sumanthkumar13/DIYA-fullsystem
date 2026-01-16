import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_input.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  final _identifier = TextEditingController();
  final _password = TextEditingController();

  bool _loading = false;

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    final ok = await ref
        .read(authProvider.notifier)
        .login(_identifier.text.trim(), _password.text.trim());

    setState(() => _loading = false);

    if (!mounted) return;

    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Invalid credentials ❌")),
      );
      return;
    }

    Navigator.pushReplacementNamed(context, '/home');

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Login successful 🎉")),
    );
  }

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Spacer(),

                    // Title like Next.js
                    const Text(
                      "Welcome Back!",
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF171717),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      "Enter your mobile number or email to continue.",
                      style: TextStyle(
                        fontSize: 16,
                        color: Color(0xFF737373),
                      ),
                    ),

                    const SizedBox(height: 26),

                    DiyaInput(
                      label: "Phone / Email",
                      hintText: "9876543210",
                      controller: _identifier,
                      validator: (v) {
                        final val = (v ?? '').trim();
                        if (val.isEmpty) return "Enter phone/email";
                        return null;
                      },
                      style: const TextStyle(
                        fontSize: 18,
                        letterSpacing: 1.5,
                      ),
                    ),

                    const SizedBox(height: 14),

                    DiyaInput(
                      label: "Password",
                      hintText: "••••••••",
                      controller: _password,
                      obscureText: true,
                      validator: (v) {
                        final val = (v ?? '').trim();
                        if (val.isEmpty) return "Enter password";
                        return null;
                      },
                    ),

                    const SizedBox(height: 22),

                    DiyaButton(
                      fullWidth: true,
                      size: DiyaButtonSize.lg,
                      text: "Continue",
                      isLoading: _loading,
                      onPressed: _loading ? null : _login,
                    ),

                    const Spacer(),

                    // Footer like Next.js
                    Center(
                      child: Wrap(
                        alignment: WrapAlignment.center,
                        children: [
                          const Text(
                            "Don't have an account? ",
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF737373),
                            ),
                          ),
                          GestureDetector(
                            onTap: () =>
                                Navigator.pushReplacementNamed(context, '/signup'),
                            child: const Text(
                              "Sign Up",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFFF7A00),
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
