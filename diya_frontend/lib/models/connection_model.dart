class ConnectionModel {
  final String id; // UUID string
  final String wholesalerId;
  final String retailerId;
  final String status; // enum as string
  final String? requestedAt;
  final String? respondedAt;

  final String? wholesalerBusinessName;
  final String? wholesalerHandle;
  final String? wholesalerCity;

  ConnectionModel({
    required this.id,
    required this.wholesalerId,
    required this.retailerId,
    required this.status,
    this.requestedAt,
    this.respondedAt,
    this.wholesalerBusinessName,
    this.wholesalerHandle,
    this.wholesalerCity,
  });

  factory ConnectionModel.fromJson(Map<String, dynamic> json) {
    return ConnectionModel(
      id: (json['id'] ?? '').toString(),
      wholesalerId: (json['wholesalerId'] ?? '').toString(),
      retailerId: (json['retailerId'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      requestedAt: json['requestedAt']?.toString(),
      respondedAt: json['respondedAt']?.toString(),
      wholesalerBusinessName: json['wholesalerBusinessName']?.toString(),
      wholesalerHandle: json['wholesalerHandle']?.toString(),
      wholesalerCity: json['wholesalerCity']?.toString(),
    );
  }
}
