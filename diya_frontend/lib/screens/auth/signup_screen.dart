import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
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
  final _pincode = TextEditingController();
  final _cityTown = TextEditingController();
  final _address = TextEditingController();
  final _state = TextEditingController();
  String? _selectedCityTown;
  List<String> _postOfficeOptions = <String>[];
  bool _pinLoading = false;
  String? _pinError;
  String? _lastFetchedPincode;

  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _pincode.addListener(() {
      final pin = _pincode.text.trim();
      if (pin.length == 6 && RegExp(r'^\d{6}$').hasMatch(pin)) {
        _fetchLocationFromPincode(pin);
      } else {
        if (_pinError != null ||
            _postOfficeOptions.isNotEmpty ||
            (_selectedCityTown ?? '').isNotEmpty ||
            _cityTown.text.isNotEmpty ||
            _state.text.isNotEmpty) {
          setState(() {
            _pinError = null;
            _postOfficeOptions = <String>[];
            _selectedCityTown = null;
            _cityTown.text = '';
            _state.text = '';
          });
        }
      }
    });
  }

  static final RegExp _nameLettersOnly = RegExp(r'^[a-zA-Z ]+$');
  static final RegExp _emailFormat = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Letters and spaces only (no digits or symbols). Required.
  String? _validateFullName(String? value) {
    final s = (value ?? '').trim();
    if (s.isEmpty) return 'Please enter your name';
    if (!_nameLettersOnly.hasMatch(s)) {
      return 'Use only letters and spaces (no numbers or special characters)';
    }
    return null;
  }

  /// Required, standard email shape (e.g. abc@domain.com).
  String? _validateEmail(String? value) {
    final s = (value ?? '').trim();
    if (s.isEmpty) return 'Please enter your email address';
    if (!_emailFormat.hasMatch(s)) {
      return 'Enter a valid email (e.g. abc@domain.com)';
    }
    return null;
  }

  /// Min 8 chars; upper, lower, digit, special.
  String? _validatePassword(String? value) {
    final s = value ?? '';
    if (s.isEmpty) return 'Please enter a password';
    if (s.length < 8) return 'Password must be at least 8 characters';
    if (!RegExp(r'[A-Z]').hasMatch(s)) {
      return 'Include at least one uppercase letter';
    }
    if (!RegExp(r'[a-z]').hasMatch(s)) {
      return 'Include at least one lowercase letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(s)) {
      return 'Include at least one number';
    }
    if (!RegExp(r'[^A-Za-z0-9]').hasMatch(s)) {
      return 'Include at least one special character (e.g. ! @ #)';
    }
    return null;
  }

  Future<void> _fetchLocationFromPincode(String pincode) async {
    final pin = pincode.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      setState(() {
        _pinError = 'Enter a valid 6-digit pincode';
        _postOfficeOptions = <String>[];
        _selectedCityTown = null;
        _cityTown.text = '';
        _state.text = '';
      });
      return;
    }

    if (_lastFetchedPincode == pin && _postOfficeOptions.isNotEmpty) return;

    setState(() {
      _pinLoading = true;
      _pinError = null;
    });

    try {
      final dio = Dio();
      final res = await dio.get('https://api.postalpincode.in/pincode/$pin');
      final data = res.data;
      final decoded = data is String ? jsonDecode(data) : data;
      if (decoded is! List || decoded.isEmpty) {
        throw Exception('Invalid response');
      }

      final first = decoded.first as Map<String, dynamic>;
      final status = (first['Status'] as String?)?.trim();
      final postOffices = first['PostOffice'];

      if (status != 'Success' || postOffices is! List || postOffices.isEmpty) {
        setState(() {
          _pinError = 'Invalid pincode';
          _postOfficeOptions = <String>[];
          _selectedCityTown = null;
          _cityTown.text = '';
          _state.text = '';
          _lastFetchedPincode = pin;
        });
        return;
      }

      final po0 = postOffices.first as Map<String, dynamic>;
      final stateName = (po0['State'] as String?)?.trim() ?? '';

      final names = postOffices
          .map((e) => (e is Map ? (e['Name'] as String?) : null) ?? '')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toSet()
          .toList()
        ..sort();

      setState(() {
        _postOfficeOptions = names;
        _state.text = stateName;
        _pinError = null;
        _selectedCityTown = null;
        _cityTown.text = '';
        _lastFetchedPincode = pin;
      });
    } catch (_) {
      setState(() {
        _pinError = 'Unable to fetch location for this pincode';
        _postOfficeOptions = <String>[];
        _selectedCityTown = null;
        _cityTown.text = '';
        _state.text = '';
      });
    } finally {
      if (mounted) {
        setState(() => _pinLoading = false);
      }
    }
  }

  Future<void> _openCityTownPicker() async {
    if (_pinLoading) return;
    if (_postOfficeOptions.isEmpty) return;

    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 6),
                const Text(
                  'Select City / Town',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF171717),
                  ),
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _postOfficeOptions.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (c, i) {
                      final name = _postOfficeOptions[i];
                      return ListTile(
                        title: Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        onTap: () => Navigator.pop(c, name),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selected == null) return;
    setState(() {
      _selectedCityTown = selected;
      _cityTown.text = selected;
    });
  }

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

    final regionValue = _selectedCityTown?.trim();

    final payload = {
      "name": _name.text.trim(),
      "email": _email.text.trim(),
      "phone": _phone.text.trim(),
      "password": _password.text.trim(),

      // ✅ retailer-only enforced
      "role": "RETAILER",

      // ✅ business details used by backend
      "businessName": _businessName.text.trim(),
      // ✅ critical: wholesaler dashboard uses retailer region for territory/filters
      // We store the selected City/Town (PostOffice name) as retailer region.
      "region": regionValue,
      // Optional informational field (kept aligned with UI "City / Town")
      "city": regionValue,
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
      Navigator.pushReplacementNamed(context, '/home');
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
    _pincode.dispose();
    _cityTown.dispose();
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
                                  keyboardType: TextInputType.name,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(
                                      RegExp(r'[a-zA-Z ]'),
                                    ),
                                  ],
                                  validator: _validateFullName,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Email",
                                  hintText: "john@email.com",
                                  controller: _email,
                                  keyboardType: TextInputType.emailAddress,
                                  validator: _validateEmail,
                                ),
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "Mobile Number",
                                  hintText: "eg : 9876543210",
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
                                  obscurable: true,
                                  validator: _validatePassword,
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
                                  label: "Pincode",
                                  hintText: "e.g. 500034",
                                  controller: _pincode,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(6),
                                  ],
                                  validator: (v) {
                                    final s = (v ?? _pincode.text).trim();
                                    if (s.isEmpty) return 'Enter pincode';
                                    if (!RegExp(r'^\d{6}$').hasMatch(s)) {
                                      return 'Pincode must be 6 digits';
                                    }
                                    if (_pinError != null && _pinError!.isNotEmpty) {
                                      return _pinError;
                                    }
                                    return null;
                                  },
                                ),
                                if (_pinLoading) ...[
                                  const SizedBox(height: 8),
                                  const Align(
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      'Fetching location…',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF737373),
                                      ),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 14),
                                DiyaInput(
                                  label: "City / Town",
                                  hintText: _postOfficeOptions.isEmpty
                                      ? "Enter pincode to see suggestions"
                                      : "Tap to select",
                                  controller: _cityTown,
                                  readOnly: true,
                                  onTap: _openCityTownPicker,
                                  validator: (_) {
                                    if ((_selectedCityTown ?? '').trim().isEmpty) {
                                      return 'Select a City / Town';
                                    }
                                    return null;
                                  },
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
                                  label: "State",
                                  hintText: "Maharashtra",
                                  controller: _state,
                                  readOnly: true,
                                  validator: (_) {
                                    if (_state.text.trim().isEmpty) return "State will auto-fill";
                                    return null;
                                  },
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
