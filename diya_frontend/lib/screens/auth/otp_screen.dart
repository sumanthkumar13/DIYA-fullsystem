import 'package:flutter/material.dart';
import '../../services/auth_service.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpController = TextEditingController();
  bool _loading = false;
  late final String _phone;
  late final String _retailerId;
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    // phone & retailerId will be read in didChangeDependencies
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    _phone = args != null ? (args['phone']?.toString() ?? '') : '';
    _retailerId = args != null ? (args['retailerId']?.toString() ?? '') : '';

    // For development: request OTP and auto-fill when possible
    _requestAndAutofillOtp();
  }

  Future<void> _requestAndAutofillOtp() async {
    if (_phone.isEmpty) return;
    try {
      final res = await _authService.requestRetailerOtp(_phone);
      final otp = res['otp']?.toString();
      if (otp != null && otp.length == 6) {
        print("Autofilling OTP from backend response: $otp");
        setState(() {
          _otpController.text = otp;
        });
      }
    } catch (e) {
      print("requestRetailerOtp error: $e");
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Enter 6-digit OTP")),
      );
      return;
    }

    // We now defer OTP verification + password setting to a single
    // backend call from the CreatePasswordScreen.
    setState(() => _loading = true);
    try {
      Navigator.pushNamed(
        context,
        '/create-password',
        arguments: {
          'phone': _phone,
          'retailerId': _retailerId,
          'otp': otp,
        },
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Verify OTP"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "OTP sent to $_phone",
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              "RetailerId: $_retailerId",
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(
                labelText: "Enter 6-digit OTP",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _verifyOtp,
                child: _loading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text("Verify OTP"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

