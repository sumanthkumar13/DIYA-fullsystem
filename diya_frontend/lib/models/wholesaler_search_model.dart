class WholesalerSearchModel {
  final String id;
  final String businessName;
  final String handle;
  final String city;
  final String state;
  final String pincode;
  final String visibilityMode;

  // ✅ new
  final String inviteCode;

  WholesalerSearchModel({
    required this.id,
    required this.businessName,
    required this.handle,
    required this.city,
    required this.state,
    required this.pincode,
    required this.visibilityMode,
    required this.inviteCode,
  });

  factory WholesalerSearchModel.fromJson(Map<String, dynamic> json) {
    return WholesalerSearchModel(
      id: (json['id'] ?? '').toString(),
      businessName: (json['businessName'] ?? '').toString(),
      handle: (json['handle'] ?? '').toString(),
      city: (json['city'] ?? '').toString(),
      state: (json['state'] ?? '').toString(),
      pincode: (json['pincode'] ?? '').toString(),
      visibilityMode: (json['visibilityMode'] ?? '').toString(),
      inviteCode: (json['inviteCode'] ?? '').toString(),
    );
  }
}
