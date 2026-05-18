/// Normalizes image URLs from API (https, protocol-relative, whitespace).
String normalizeNetworkImageUrl(String? raw) {
  if (raw == null) return '';
  var url = raw.trim();
  if (url.isEmpty) return '';

  // Strip wrapping quotes occasionally present in stored values.
  if ((url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))) {
    url = url.substring(1, url.length - 1).trim();
  }

  if (url.startsWith('//')) {
    url = 'https:$url';
  }

  final lower = url.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return '';
  }

  return url;
}

/// Cache-bust query param so updated Cloudinary URLs refresh in Image cache.
String networkImageUrlWithCacheBust(String url, {String? cacheToken}) {
  final normalized = normalizeNetworkImageUrl(url);
  if (normalized.isEmpty) return '';

  final token = (cacheToken ?? '').trim();
  if (token.isEmpty) return normalized;

  final uri = Uri.tryParse(normalized);
  if (uri == null) return normalized;

  final params = Map<String, String>.from(uri.queryParameters);
  params['v'] = token;
  return uri.replace(queryParameters: params).toString();
}

String? pickFirstImageUrl(Iterable<String?> candidates) {
  for (final c in candidates) {
    final n = normalizeNetworkImageUrl(c);
    if (n.isNotEmpty) return n;
  }
  return null;
}
