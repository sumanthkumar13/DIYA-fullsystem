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

  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _loading = false;
  bool _showPasswordField = false;
  String? _loginStatus; // OTP_REQUIRED, PASSWORD_LOGIN_REQUIRED, NOT_REGISTERED

  Future<void> _handleContinue() async {
    if (!_formKey.currentState!.validate()) return;

    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return;

    setState(() => _loading = true);
    Map<String, dynamic>? res;

    try {
      res = await ref.read(authProvider.notifier).loginPhone(phone);
      print("Login phone raw response: $res");
    } catch (e) {
      print("loginPhone error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Login failed. Please try again.")),
      );
      if (mounted) setState(() => _loading = false);
      return;
    } finally {
      if (mounted) setState(() => _loading = false);
    }

    if (res == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Login failed. Please try again.")),
      );
      return;
    }

    final status = res['status']?.toString();
    print("Login phone status: $status");
    setState(() {
      _loginStatus = status;
    });

    if (status == "OTP_REQUIRED") {
      final retailerId = res['retailerId'];
      Navigator.pushNamed(
        context,
        '/otp',
        arguments: {'phone': phone, 'retailerId': retailerId},
      );
    } else if (status == "PASSWORD_LOGIN_REQUIRED") {
      setState(() {
        _showPasswordField = true;
      });
    } else if (status == "NOT_REGISTERED") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Retailer not registered")),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Login failed. Please try again.")),
      );
    }
  }

  Future<void> _handlePasswordLogin() async {
    if (!_showPasswordField) return;
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();
    if (phone.isEmpty || password.isEmpty) return;

    setState(() => _loading = true);

    final ok = await ref
        .read(authProvider.notifier)
        .loginWithPassword(phone, password);

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
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.only(bottom: bottomInset),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
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
                    const SizedBox(height: 24),

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
                      label: "Phone Number",
                      hintText: "9876543210",
                      controller: _phoneController,
                      validator: (v) {
                        final val = (v ?? '').trim();
                        if (val.isEmpty) return "Enter phone number";
                        return null;
                      },
                      style: const TextStyle(
                        fontSize: 18,
                        letterSpacing: 1.5,
                      ),
                    ),

                    const SizedBox(height: 14),

                    if (_showPasswordField)
                      DiyaInput(
                        label: "Password",
                        hintText: "••••••••",
                        controller: _passwordController,
                        obscureText: true,
                        validator: (v) {
                          if (!_showPasswordField) return null;
                          final val = (v ?? '').trim();
                          if (val.isEmpty) return "Enter password";
                          return null;
                        },
                      ),

                    const SizedBox(height: 22),

                    DiyaButton(
                      fullWidth: true,
                      size: DiyaButtonSize.lg,
                      text: _showPasswordField ? "Login" : "Continue",
                      isLoading: _loading,
                      onPressed: _loading
                          ? null
                          : () => _showPasswordField
                              ? _handlePasswordLogin()
                              : _handleContinue(),
                    ),

                    const SizedBox(height: 24),

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
    ),
    );
  }
}
