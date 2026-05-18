import 'package:flutter/material.dart';
import '../../utils/image_url_utils.dart';
import '../../utils/wholesaler_display.dart';

/// Circular wholesaler avatar — network image or initials fallback.
class WholesalerAvatar extends StatefulWidget {
  final String name;
  final String? imageUrl;
  final String? cacheKey;
  final double size;

  const WholesalerAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.cacheKey,
    this.size = 48,
  });

  @override
  State<WholesalerAvatar> createState() => _WholesalerAvatarState();
}

class _WholesalerAvatarState extends State<WholesalerAvatar> {
  bool _loadFailed = false;

  @override
  void didUpdateWidget(WholesalerAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl || oldWidget.cacheKey != widget.cacheKey) {
      _loadFailed = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final initials = wholesalerInitials(widget.name);
    final resolved = networkImageUrlWithCacheBust(
      widget.imageUrl ?? '',
      cacheToken: widget.cacheKey,
    );
    final showImage = resolved.isNotEmpty && !_loadFailed;

    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        color: const Color(0xFFFFE7D1),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: showImage
          ? Image.network(
              resolved,
              key: ValueKey(resolved),
              fit: BoxFit.cover,
              gaplessPlayback: true,
              loadingBuilder: (context, child, progress) {
                if (progress == null) return child;
                return Center(
                  child: SizedBox(
                    width: widget.size * 0.35,
                    height: widget.size * 0.35,
                    child: const CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFFFF7A00),
                    ),
                  ),
                );
              },
              errorBuilder: (_, __, ___) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_loadFailed) {
                    setState(() => _loadFailed = true);
                  }
                });
                return _Initials(initials: initials, size: widget.size);
              },
            )
          : _Initials(initials: initials, size: widget.size),
    );
  }
}

class _Initials extends StatelessWidget {
  final String initials;
  final double size;

  const _Initials({required this.initials, required this.size});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initials,
        style: TextStyle(
          fontSize: size * 0.36,
          fontWeight: FontWeight.w900,
          color: const Color(0xFFFF7A00),
        ),
      ),
    );
  }
}
