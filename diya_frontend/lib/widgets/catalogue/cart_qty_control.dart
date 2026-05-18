import 'package:flutter/material.dart';

/// Amazon-style quantity stepper: [-] qty [+]
class CartQtyControl extends StatelessWidget {
  final int quantity;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final bool compact;

  const CartQtyControl({
    super.key,
    required this.quantity,
    required this.onDecrement,
    required this.onIncrement,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final btnSize = compact ? 32.0 : 36.0;
    final iconSize = compact ? 16.0 : 18.0;

    return Container(
      height: compact ? 36 : 40,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFF7A00)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.max,
        children: [
          _QtyBtn(
            icon: Icons.remove,
            size: btnSize,
            iconSize: iconSize,
            onPressed: onDecrement,
          ),
          Expanded(
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: compact ? 13 : 14,
                color: const Color(0xFF171717),
              ),
            ),
          ),
          _QtyBtn(
            icon: Icons.add,
            size: btnSize,
            iconSize: iconSize,
            onPressed: onIncrement,
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final double size;
  final double iconSize;
  final VoidCallback onPressed;

  const _QtyBtn({
    required this.icon,
    required this.size,
    required this.iconSize,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(10),
          child: Icon(icon, size: iconSize, color: const Color(0xFFFF7A00)),
        ),
      ),
    );
  }
}
