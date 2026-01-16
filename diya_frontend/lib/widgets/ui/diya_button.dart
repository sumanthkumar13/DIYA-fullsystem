import 'package:flutter/material.dart';

enum DiyaButtonVariant { primary, secondary, outline, ghost, destructive }
enum DiyaButtonSize { sm, md, lg }

class DiyaButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;

  final DiyaButtonVariant variant;
  final DiyaButtonSize size;

  final bool isLoading;
  final bool fullWidth;

  const DiyaButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = DiyaButtonVariant.primary,
    this.size = DiyaButtonSize.md,
    this.isLoading = false,
    this.fullWidth = false,
  });

  double get _height {
    return switch (size) {
      DiyaButtonSize.sm => 36,
      DiyaButtonSize.md => 48,
      DiyaButtonSize.lg => 56,
    };
  }

  TextStyle get _textStyle {
    final fontSize = switch (size) {
      DiyaButtonSize.sm => 12.0,
      DiyaButtonSize.md => 14.0,
      DiyaButtonSize.lg => 16.0,
    };
    return TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700);
  }

  BorderRadius get _radius => BorderRadius.circular(12);

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : Text(text, style: _textStyle);

    final ButtonStyle baseStyle = ButtonStyle(
      shape: MaterialStatePropertyAll(
        RoundedRectangleBorder(borderRadius: _radius),
      ),

      // ✅ FIX: do NOT force infinite width
      minimumSize: MaterialStatePropertyAll(Size(0, _height)),
    );

    Widget button;

    switch (variant) {
      case DiyaButtonVariant.primary:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: baseStyle.copyWith(
            backgroundColor: const MaterialStatePropertyAll(Color(0xFFFF7A00)),
            foregroundColor: const MaterialStatePropertyAll(Colors.white),
            elevation: const MaterialStatePropertyAll(0),
            shadowColor: MaterialStatePropertyAll(
              const Color(0xFFFF7A00).withOpacity(0.25),
            ),
          ),
          child: child,
        );
        break;

      case DiyaButtonVariant.secondary:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: baseStyle.copyWith(
            backgroundColor: const MaterialStatePropertyAll(Color(0xFFFFE7D1)),
            foregroundColor: const MaterialStatePropertyAll(Color(0xFFFF7A00)),
            elevation: const MaterialStatePropertyAll(0),
          ),
          child: Text(text, style: _textStyle.copyWith(color: const Color(0xFFFF7A00))),
        );
        break;

      case DiyaButtonVariant.outline:
        button = OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: baseStyle.copyWith(
            foregroundColor: const MaterialStatePropertyAll(Color(0xFF404040)),
            side: const MaterialStatePropertyAll(
              BorderSide(color: Color(0xFFE5E5E5), width: 2),
            ),
          ),
          child: Text(text, style: _textStyle.copyWith(color: const Color(0xFF404040))),
        );
        break;

      case DiyaButtonVariant.ghost:
        button = TextButton(
          onPressed: isLoading ? null : onPressed,
          style: baseStyle.copyWith(
            foregroundColor: const MaterialStatePropertyAll(Color(0xFF525252)),
          ),
          child: Text(text, style: _textStyle.copyWith(color: const Color(0xFF525252))),
        );
        break;

      case DiyaButtonVariant.destructive:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: baseStyle.copyWith(
            backgroundColor: const MaterialStatePropertyAll(Color(0xFFF04343)),
            foregroundColor: const MaterialStatePropertyAll(Colors.white),
            elevation: const MaterialStatePropertyAll(0),
            shadowColor: MaterialStatePropertyAll(
              const Color(0xFFF04343).withOpacity(0.25),
            ),
          ),
          child: child,
        );
        break;
    }

    if (fullWidth) return SizedBox(width: double.infinity, child: button);
    return button;
  }
}
