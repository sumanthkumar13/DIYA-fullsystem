class ConnectionResponseDTO {
  final String id;
  final String wholesalerId;
  final String status;

  final String wholesalerBusinessName;
  final String wholesalerHandle;
  final String wholesalerCity;

  // ✅ NEW OPTIONAL retail fields
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
    this.retailerId,
    this.retailerBusinessName,
    this.retailerCity,
    this.retailerPhone,
  });

  factory ConnectionResponseDTO.fromJson(Map<String, dynamic> json) {
    return ConnectionResponseDTO(
      id: (json["id"] ?? "").toString(),
      wholesalerId: (json["wholesalerId"] ?? "").toString(),
      status: (json["status"] ?? "").toString(),

      wholesalerBusinessName: (json["wholesalerBusinessName"] ?? "").toString(),
      wholesalerHandle: (json["wholesalerHandle"] ?? "").toString(),
      wholesalerCity: (json["wholesalerCity"] ?? "").toString(),

      // ✅ parse retailer side too (safe optional)
      retailerId: json["retailerId"]?.toString(),
      retailerBusinessName: json["retailerBusinessName"]?.toString(),
      retailerCity: json["retailerCity"]?.toString(),
      retailerPhone: json["retailerPhone"]?.toString(),
    );
  }
}
