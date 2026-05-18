import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/ui/diya_button.dart';
import '../../widgets/ui/diya_input.dart';

/// Forgot password via existing retailer OTP APIs:
/// POST /api/retailer/request-otp → POST /api/retailer/verify-otp
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _loading = false;
  bool _otpSent = false;
  String? _errorMessage;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map && _phoneController.text.isEmpty) {
      final phone = args['phone']?.toString() ?? '';
      if (phone.isNotEmpty) {
        _phoneController.text = phone;
      }
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    final phone = _phoneController.text.trim();

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final res = await ref.read(authProvider.notifier).requestPasswordResetOtp(phone);
      if (!mounted) return;

      if (res['status']?.toString() == 'NOT_REGISTERED') {
        setState(() {
          _errorMessage = 'No retailer account found for this number.';
          _otpSent = false;
        });
        return;
      }

      final otp = res['otp']?.toString();
      if (otp != null && otp.length == 6) {
        _otpController.text = otp;
      }

      setState(() => _otpSent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP sent. Check your phone.')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Could not send OTP. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    if (!_otpSent) {
      await _sendOtp();
      return;
    }

    final phone = _phoneController.text.trim();
    final otp = _otpController.text.trim();
    final password = _passwordController.text.trim();
    final confirm = _confirmController.text.trim();

    if (otp.length != 6) {
      setState(() => _errorMessage = 'Enter the 6-digit OTP.');
      return;
    }
    if (password.length < 6) {
      setState(() => _errorMessage = 'Password must be at least 6 characters.');
      return;
    }
    if (password != confirm) {
      setState(() => _errorMessage = 'Passwords do not match.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final res = await ref.read(authProvider.notifier).resetPasswordWithOtp(
            phone,
            otp,
            password,
          );
      if (!mounted) return;

      final status = res['status']?.toString() ?? '';
      if (status == 'INVALID_OTP') {
        setState(() => _errorMessage = 'Invalid OTP. Please try again.');
        return;
      }
      if (status == 'OTP_EXPIRED') {
        setState(() {
          _errorMessage = 'OTP expired. Request a new code.';
          _otpSent = false;
        });
        return;
      }
      if (status == 'NOT_REGISTERED') {
        setState(() => _errorMessage = 'Account not found.');
        return;
      }
      if (status != 'ACCOUNT_ACTIVATED' && res['token'] == null) {
        setState(() => _errorMessage = 'Reset failed. Please try again.');
        return;
      }

      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated. Sign in with your new password.')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Reset failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF171717),
        title: const Text(
          'Forgot Password',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
      ),
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
                      const Text(
                        'Reset your password',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF171717),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _otpSent
                            ? 'Enter the OTP sent to your phone and choose a new password.'
                            : 'We\'ll send a one-time code to your registered mobile number.',
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.4,
                          color: Color(0xFF737373),
                        ),
                      ),
                      const SizedBox(height: 24),
                      DiyaInput(
                        label: 'Phone Number',
                        hintText: 'eg: 9876543210',
                        controller: _phoneController,
                        readOnly: _otpSent,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        validator: (v) {
                          final val = (v ?? '').trim();
                          if (val.isEmpty) return 'Enter phone number';
                          if (val.length < 10) return 'Enter a valid phone number';
                          return null;
                        },
                      ),
                      if (_otpSent) ...[
                        const SizedBox(height: 14),
                        DiyaInput(
                          label: 'OTP',
                          hintText: '6-digit code',
                          controller: _otpController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          validator: (v) {
                            if (!_otpSent) return null;
                            final val = (v ?? '').trim();
                            if (val.length != 6) return 'Enter 6-digit OTP';
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        DiyaInput(
                          label: 'New Password',
                          hintText: '••••••••',
                          controller: _passwordController,
                          obscurable: true,
                          validator: (v) {
                            if (!_otpSent) return null;
                            if ((v ?? '').trim().length < 6) {
                              return 'At least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        DiyaInput(
                          label: 'Confirm Password',
                          hintText: '••••••••',
                          controller: _confirmController,
                          obscurable: true,
                          validator: (v) {
                            if (!_otpSent) return null;
                            if ((v ?? '').trim() != _passwordController.text.trim()) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),
                      ],
                      if (_errorMessage != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: Color(0xFFDC2626),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                      const SizedBox(height: 22),
                      DiyaButton(
                        fullWidth: true,
                        size: DiyaButtonSize.lg,
                        text: _otpSent ? 'Update Password' : 'Send OTP',
                        isLoading: _loading,
                        onPressed: _loading
                            ? null
                            : () {
                                if (_otpSent) {
                                  if (_formKey.currentState!.validate()) {
                                    _resetPassword();
                                  }
                                } else {
                                  _sendOtp();
                                }
                              },
                      ),
                      if (_otpSent) ...[
                        const SizedBox(height: 12),
                        Center(
                          child: TextButton(
                            onPressed: _loading
                                ? null
                                : () {
                                    setState(() {
                                      _otpSent = false;
                                      _otpController.clear();
                                      _errorMessage = null;
                                    });
                                  },
                            child: const Text(
                              'Change phone number',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFFF7A00),
                              ),
                            ),
                          ),
                        ),
                        Center(
                          child: TextButton(
                            onPressed: _loading ? null : _sendOtp,
                            child: const Text(
                              'Resend OTP',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF737373),
                              ),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Center(
                        child: GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: const Text(
                            'Back to login',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFFF7A00),
                            ),
                          ),
                        ),
                      ),
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
