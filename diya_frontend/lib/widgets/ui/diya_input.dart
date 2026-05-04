import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DiyaInput extends StatelessWidget {
  final String? label;
  final String hintText;
  final TextEditingController controller;
  final TextInputType keyboardType;
  final bool obscureText;
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
    this.readOnly = false,
    this.onTap,
    this.error,
    this.style,
    this.inputFormatters,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final hasError = (error != null && error!.isNotEmpty);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              label!,
              style: const TextStyle(
                fontSize: 14, // text-sm
                fontWeight: FontWeight.w600,
                color: Color(0xFF404040), // neutral-700
              ),
            ),
          ),
        ],
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          inputFormatters: inputFormatters,
          readOnly: readOnly,
          onTap: onTap,
          style: style ??
              const TextStyle(
                color: Color(0xFF171717),
                fontWeight: FontWeight.w600,
              ),
          validator: validator,
          decoration: InputDecoration(
            hintText: hintText,
            filled: true,
            fillColor: const Color(0xFFFAFAFA), // neutral-50
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12), // rounded-xl
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
              error!,
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
