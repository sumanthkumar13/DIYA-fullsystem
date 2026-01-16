class PageResponse<T> {
  final List<T> content;
  final int number;
  final int size;
  final int totalPages;
  final int totalElements;
  final bool last;

  PageResponse({
    required this.content,
    required this.number,
    required this.size,
    required this.totalPages,
    required this.totalElements,
    required this.last,
  });

  factory PageResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) mapper,
  ) {
    final list = (json['content'] as List<dynamic>? ?? [])
        .map((e) => mapper(e as Map<String, dynamic>))
        .toList();

    return PageResponse(
      content: list,
      number: (json['number'] as num? ?? 0).toInt(),
      size: (json['size'] as num? ?? 20).toInt(),
      totalPages: (json['totalPages'] as num? ?? 1).toInt(),
      totalElements: (json['totalElements'] as num? ?? list.length).toInt(),
      last: (json['last'] as bool?) ?? true,
    );
  }
}
