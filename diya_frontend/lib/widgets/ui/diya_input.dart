import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DiyaInput extends StatefulWidget {
  final String? label;
  final String hintText;
  final TextEditingController controller;
  final TextInputType keyboardType;
  final bool obscureText;
  /// When true, shows an eye toggle to show/hide password (auth screens).
  final bool obscurable;
  final bool readOnly;
  final VoidCallback? onTap;
  final String? error;
  final TextStyle? style;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;

  const DiyaInput({
    super.key,
    this.label,
    required this.hintText,
    required this.controller,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.obscurable = false,
    this.readOnly = false,
    this.onTap,
    this.error,
    this.style,
    this.inputFormatters,
    this.validator,
  });

  @override
  State<DiyaInput> createState() => _DiyaInputState();
}

class _DiyaInputState extends State<DiyaInput> {
  late bool _obscured;

  @override
  void initState() {
    super.initState();
    _obscured = widget.obscurable || widget.obscureText;
  }

  @override
  void didUpdateWidget(DiyaInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.obscurable && oldWidget.obscurable) {
      _obscured = widget.obscureText;
    }
  }

  bool get _effectiveObscure =>
      widget.obscurable ? _obscured : widget.obscureText;

  @override
  Widget build(BuildContext context) {
    final hasError = (widget.error != null && widget.error!.isNotEmpty);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              widget.label!,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF404040),
              ),
            ),
          ),
        ],
        TextFormField(
          controller: widget.controller,
          keyboardType: widget.keyboardType,
          obscureText: _effectiveObscure,
          inputFormatters: widget.inputFormatters,
          readOnly: widget.readOnly,
          onTap: widget.onTap,
          style: widget.style ??
              const TextStyle(
                color: Color(0xFF171717),
                fontWeight: FontWeight.w600,
              ),
          validator: widget.validator,
          decoration: InputDecoration(
            hintText: widget.hintText,
            filled: true,
            fillColor: const Color(0xFFFAFAFA),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            suffixIcon: widget.obscurable
                ? IconButton(
                    tooltip: _obscured ? 'Show password' : 'Hide password',
                    onPressed: () => setState(() => _obscured = !_obscured),
                    icon: Icon(
                      _obscured
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 22,
                      color: const Color(0xFF737373),
                    ),
                  )
                : null,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? const Color(0xFFF04343) : Colors.transparent,
                width: 2,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? const Color(0xFFF04343) : const Color(0xFFFF7A00),
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFFF04343),
                width: 2,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFFF04343),
                width: 2,
              ),
            ),
            errorStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFFF04343),
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Text(
              widget.error!,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFFF04343),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
