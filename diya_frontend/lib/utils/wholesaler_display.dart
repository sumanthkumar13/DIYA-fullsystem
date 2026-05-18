import '../models/connections/connection_response_dto.dart';
import 'image_url_utils.dart';

/// Formats city, state, and pincode for retailer-facing wholesaler cards.
String formatWholesalerLocation({
  String city = '',
  String state = '',
  String pincode = '',
}) {
  final c = city.trim();
  final s = state.trim();
  final p = pincode.trim();

  final parts = <String>[];
  if (c.isNotEmpty) parts.add(c);
  if (s.isNotEmpty) parts.add(s);

  if (parts.isEmpty) {
    return p;
  }
  if (p.isNotEmpty) {
    return '${parts.join(', ')} • $p';
  }
  return parts.join(', ');
}

String wholesalerInitials(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return 'W';

  final parts = trimmed.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  return trimmed.substring(0, 1).toUpperCase();
}

extension WholesalerConnectionDisplay on ConnectionResponseDTO {
  String get displayLocation => formatWholesalerLocation(
        city: wholesalerCity,
        state: wholesalerState,
        pincode: wholesalerPincode,
      );

  String get displayPhone => wholesalerPhone.trim();

  /// User profile photo first (wholesaler settings), then business logo.
  String get profileImageUrl {
    return pickFirstImageUrl([
          wholesalerAvatarUrl,
          wholesalerLogoUrl,
        ]) ??
        '';
  }

  /// Stable token for image cache busting when profile URL changes.
  String get profileImageCacheToken {
    final url = profileImageUrl;
    if (url.isEmpty) return wholesalerId;
    return '${wholesalerId}_${url.hashCode}';
  }

  String get displayName {
    final name = wholesalerBusinessName.trim();
    return name.isEmpty ? 'Wholesaler' : name;
  }
}
