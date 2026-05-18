import '../../utils/image_url_utils.dart';

class ConnectionResponseDTO {
  final String id;
  final String wholesalerId;
  final String status;

  final String wholesalerBusinessName;
  final String wholesalerHandle;
  final String wholesalerCity;
  final String wholesalerState;
  final String wholesalerPincode;
  final String wholesalerPhone;
  final String wholesalerLogoUrl;
  final String wholesalerAvatarUrl;

  final String? retailerId;
  final String? retailerBusinessName;
  final String? retailerCity;
  final String? retailerPhone;

  ConnectionResponseDTO({
    required this.id,
    required this.wholesalerId,
    required this.status,
    required this.wholesalerBusinessName,
    required this.wholesalerHandle,
    required this.wholesalerCity,
    this.wholesalerState = '',
    this.wholesalerPincode = '',
    this.wholesalerPhone = '',
    this.wholesalerLogoUrl = '',
    this.wholesalerAvatarUrl = '',
    this.retailerId,
    this.retailerBusinessName,
    this.retailerCity,
    this.retailerPhone,
  });

  static String _field(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final v = json[key];
      if (v == null) continue;
      final s = v.toString().trim();
      if (s.isNotEmpty && s != 'null') return s;
    }
    return '';
  }

  factory ConnectionResponseDTO.fromJson(Map<String, dynamic> json) {
    final avatarRaw = _field(json, [
      'wholesalerAvatarUrl',
      'wholesaler_avatar_url',
      'avatarUrl',
    ]);
    final logoRaw = _field(json, [
      'wholesalerLogoUrl',
      'wholesaler_logo_url',
      'logoUrl',
    ]);

    return ConnectionResponseDTO(
      id: _field(json, ['id']),
      wholesalerId: _field(json, ['wholesalerId', 'wholesaler_id']),
      status: _field(json, ['status']),

      wholesalerBusinessName: _field(json, ['wholesalerBusinessName', 'wholesaler_business_name']),
      wholesalerHandle: _field(json, ['wholesalerHandle', 'wholesaler_handle']),
      wholesalerCity: _field(json, ['wholesalerCity', 'wholesaler_city']),
      wholesalerState: _field(json, ['wholesalerState', 'wholesaler_state']),
      wholesalerPincode: _field(json, ['wholesalerPincode', 'wholesaler_pincode']),
      wholesalerPhone: _field(json, ['wholesalerPhone', 'wholesaler_phone']),
      wholesalerLogoUrl: normalizeNetworkImageUrl(logoRaw),
      wholesalerAvatarUrl: normalizeNetworkImageUrl(avatarRaw),

      retailerId: json['retailerId']?.toString(),
      retailerBusinessName: json['retailerBusinessName']?.toString(),
      retailerCity: json['retailerCity']?.toString(),
      retailerPhone: json['retailerPhone']?.toString(),
    );
  }
}
