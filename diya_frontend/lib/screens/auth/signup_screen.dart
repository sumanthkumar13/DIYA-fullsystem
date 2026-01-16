import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_input.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _pageController = PageController();
  int _step = 0;

  final _formKey1 = GlobalKey<FormState>();
  final _formKey2 = GlobalKey<FormState>();

  // Step 1
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();

  // Step 2
  final _businessName = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  final _state = TextEditingController();

  bool _loading = false;

  void _goToStep(int step) {
    setState(() => _step = step);
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
    );
  }

  Future<void> _submitSignup() async {
    if (!_formKey2.currentState!.validate()) return;

    setState(() => _loading = true);

    final payload = {
      "name": _name.text.trim(),
      "email": _email.text.trim().isEmpty ? null : _email.text.trim(),
      "phone": _phone.text.trim(),
      "password": _password.text.trim(),

      // ✅ retailer-only enforced
      "role": "RETAILER",

      // ✅ business details used by backend
      "businessName": _businessName.text.trim(),
      "city": _city.text.trim(),
      "address": _address.text.trim(),

      // optional
      "state": _state.text.trim().isEmpty ? null : _state.text.trim(),
    };

    final ok = await ref.read(authProvider.notifier).register(payload);

    setState(() => _loading = false);

    if (!mounted) return;

    if (ok) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text("Registration successful! Please login.")),
  );
  Navigator.pushReplacementNamed(context, '/home'); // ✅ changed
} else {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text("Registration failed!")),
  );
}
  }
  @override
  void dispose() {
    _pageController.dispose();

    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();

    _businessName.dispose();
    _city.dispose();
    _address.dispose();
    _state.dispose();
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
              child: Column(
                children: [
                  // Header (Next.js style Back)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () {
                        if (_step == 0) {
                          Navigator.pushReplacementNamed(context, '/welcome');
                        } else {
                          _goToStep(0);
                        }
                      },
                      icon: const Icon(Icons.chevron_left, color: Color(0xFF737373)),
                      label: Text(
                        _step == 0 ? "Back" : "Account",
                        style: const TextStyle(
                          color: Color(0xFF737373),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 6),

                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _step == 0 ? "Create Account" : "Business Details",
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF171717),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      _step == 0
                          ? "Let's get your business set up."
                          : "Few more details to activate your retailer profile.",
                      style: const TextStyle(fontSize: 16, color: Color(0xFF737373)),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Steps
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 4,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF7A00),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 4,
                          decoration: BoxDecoration(
                            color: _step == 1
                                ? const Color(0xFFFF7A00)
                                : const Color(0xFFE5E5E5),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Pages
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        // Step 1 Form
                        Form(
                          key: _formKey1,
                          child: SingleChildScrollView(
                            child: Column(
                              children: [
                                DiyaInput(
                                  label: "Your Name",
                                  hintText: "John Doe",
                                  controller: _name,
                                  validator: (v) => (v == null || v.trim().isEmpty)
                                      ? "Enter your name"
                                      : null,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Email (optional)",
                                  hintText: "john@email.com",
                                  controller: _email,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Mobile Number",
                                  hintText: "9876543210",
                                  controller: _phone,
                                  keyboardType: TextInputType.phone,
                                  style: const TextStyle(fontSize: 18, letterSpacing: 2),
                                  validator: (v) {
                                    final val = (v ?? '').trim();
                                    if (val.length != 10) return "Enter valid 10-digit mobile";
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Password",
                                  hintText: "••••••••",
                                  controller: _password,
                                  obscureText: true,
                                  validator: (v) => (v == null || v.trim().isEmpty)
                                      ? "Enter password"
                                      : null,
                                ),
                                const SizedBox(height: 22),

                                DiyaButton(
                                  text: "Continue",
                                  onPressed: () {
                                    if (!_formKey1.currentState!.validate()) return;
                                    _goToStep(1);
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Step 2 Form
                        Form(
                          key: _formKey2,
                          child: SingleChildScrollView(
                            child: Column(
                              children: [
                                DiyaInput(
                                  label: "Shop / Business Name",
                                  hintText: "Jai Hind Kirana",
                                  controller: _businessName,
                                  validator: (v) => (v == null || v.trim().isEmpty)
                                      ? "Enter business name"
                                      : null,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "City / District",
                                  hintText: "Mumbai",
                                  controller: _city,
                                  validator: (v) => (v == null || v.trim().isEmpty)
                                      ? "Enter city"
                                      : null,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Address",
                                  hintText: "Shop no. 22, Main road",
                                  controller: _address,
                                  validator: (v) => (v == null || v.trim().isEmpty)
                                      ? "Enter address"
                                      : null,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "State (optional)",
                                  hintText: "Maharashtra",
                                  controller: _state,
                                ),

                                const SizedBox(height: 22),

                                DiyaButton(
                                  text: "Create Account",
                                  isLoading: _loading,
                                  onPressed: _loading ? null : _submitSignup,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Footer link
                  const SizedBox(height: 12),
                  Wrap(
                    alignment: WrapAlignment.center,
                    children: [
                      const Text(
                        "Already have an account? ",
                        style: TextStyle(fontSize: 13, color: Color(0xFF737373)),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pushReplacementNamed(context, '/login'),
                        child: const Text(
                          "Login",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFFF7A00),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
