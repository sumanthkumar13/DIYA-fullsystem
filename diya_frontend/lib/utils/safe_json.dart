import 'package:flutter/foundation.dart';

import 'debug_log.dart';

/// Logs top-level response shape (debug only).
void logApiListStructure(dynamic raw, {required String tag}) {
  if (kReleaseMode) return;
  debugPrint('📦 [$tag] rawType=${raw.runtimeType}');
  if (raw is List) {
    debugPrint('📦 [$tag] list.length=${raw.length}');
    for (var i = 0; i < raw.length && i < 3; i++) {
      final item = raw[i];
      debugPrint('📦 [$tag][$i] itemType=${item.runtimeType}');
      if (item is Map) {
        final order = item['order'];
        debugPrint('📦 [$tag][$i] orderType=${order?.runtimeType} order=$order');
      }
    }
    return;
  }
  if (raw is Map) {
    debugPrint('📦 [$tag] map.keys=${raw.keys.toList()}');
    for (final key in const ['data', 'content', 'payments', 'items', 'results']) {
      final nested = raw[key];
      if (nested != null) {
        debugPrint('📦 [$tag] nested.$key type=${nested.runtimeType}');
      }
    }
  }
}

/// Unwraps common API list envelopes.
List<dynamic> extractApiList(dynamic raw) {
  if (raw is List) return raw;
  if (raw is Map) {
    for (final key in const ['data', 'content', 'payments', 'items', 'results']) {
      final nested = raw[key];
      if (nested is List) return nested;
    }
  }
  return const [];
}

Map<String, dynamic> mapFromJsonObject(dynamic value) {
  if (value is Map<String, dynamic>) {
    return Map<String, dynamic>.from(value);
  }
  if (value is Map) {
    return value.map((k, v) => MapEntry(k.toString(), v));
  }
  return <String, dynamic>{};
}

/// Jackson @JsonIdentityInfo may emit order as a UUID string on repeat references.
Map<String, dynamic>? normalizeOrderRef(dynamic order) {
  if (order == null) return null;
  if (order is String) {
    final id = order.trim();
    if (id.isEmpty) return null;
    return {'id': id};
  }
  if (order is Map) {
    return mapFromJsonObject(order);
  }
  return null;
}

Map<String, dynamic>? parsePaymentItem(dynamic item, {required String tag, int? index}) {
  if (item is! Map) {
    if (!kReleaseMode) {
      debugPrint('⚠️ [$tag] skip index=$index: expected Map, got ${item.runtimeType}');
    }
    return null;
  }

  try {
    final map = mapFromJsonObject(item);
    final normalizedOrder = normalizeOrderRef(map['order']);
    if (normalizedOrder != null) {
      map['order'] = normalizedOrder;
    } else {
      final flatOrderId = (map['orderId'] ?? '').toString().trim();
      if (flatOrderId.isNotEmpty) {
        map['order'] = <String, dynamic>{
          'id': flatOrderId,
          if (map['orderNumber'] != null) 'orderNumber': map['orderNumber'].toString(),
        };
      } else {
        map.remove('order');
      }
    }
    return map;
  } catch (e, st) {
    if (!kReleaseMode) {
      debugPrint('⚠️ [$tag] skip index=$index parse error: $e');
      debugPrint('$st');
    }
    return null;
  }
}

/// Compact payment metadata for debug logs (no amounts/PII).
List<Map<String, dynamic>> summarizePaymentsForDebug(
  List<Map<String, dynamic>> payments,
) {
  return payments.map((p) {
    final order = p['order'];
    return <String, dynamic>{
      'id': (p['id'] ?? '').toString(),
      'status': (p['status'] ?? '').toString(),
      'mode': (p['mode'] ?? '').toString(),
      'orderRefType': order == null
          ? 'null'
          : order is String
              ? 'string'
              : order is Map
                  ? 'map'
                  : order.runtimeType.toString(),
      'orderId': orderIdFromPayment(p),
      'source': (p['source'] ?? '').toString(),
    };
  }).toList();
}

/// Merges payment lists by id (newest first). Never drops existing entries.
List<Map<String, dynamic>> mergePaymentsById(
  List<Map<String, dynamic>> existing,
  List<Map<String, dynamic>> incoming,
) {
  final byId = <String, Map<String, dynamic>>{};
  for (final p in [...existing, ...incoming]) {
    final id = (p['id'] ?? '').toString();
    if (id.isEmpty) {
      byId['__anon_${byId.length}'] = p;
    } else {
      byId[id] = p;
    }
  }
  final merged = byId.values.toList();
  merged.sort((a, b) {
    final ad = DateTime.tryParse((a['createdAt'] ?? '').toString()) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final bd = DateTime.tryParse((b['createdAt'] ?? '').toString()) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    return bd.compareTo(ad);
  });
  return merged;
}

List<Map<String, dynamic>> parsePaymentListResponse(
  dynamic raw, {
  String tag = 'payments',
}) {
  logApiListStructure(raw, tag: tag);
  final list = extractApiList(raw);
  final out = <Map<String, dynamic>>[];
  final skipped = <Map<String, dynamic>>[];
  for (var i = 0; i < list.length; i++) {
    final parsed = parsePaymentItem(list[i], tag: tag, index: i);
    if (parsed != null) {
      out.add(parsed);
    } else {
      final item = list[i];
      skipped.add(<String, dynamic>{
        'index': i,
        'itemType': item.runtimeType.toString(),
        if (item is Map) 'id': (item['id'] ?? '').toString(),
        if (item is Map) 'status': (item['status'] ?? '').toString(),
        if (item is Map) 'mode': (item['mode'] ?? '').toString(),
        if (item is Map) 'orderType': item['order']?.runtimeType.toString(),
      });
    }
  }
  if (!kReleaseMode) {
    debugPrint('📦 [$tag] parsed ${out.length}/${list.length} items');
  }
  if (skipped.isNotEmpty) {
    // #region agent log
    agentDebugLog(
      location: 'safe_json.dart:parsePaymentListResponse',
      message: 'payments skipped during parse',
      hypothesisId: 'H-A',
      data: {
        'tag': tag,
        'rawListCount': list.length,
        'parsedCount': out.length,
        'skippedCount': skipped.length,
        'skipped': skipped,
      },
    );
    // #endregion
  }
  return out;
}

Map<String, dynamic>? parseLedgerItem(dynamic item, {required String tag, int? index}) {
  if (item is! Map) {
    if (!kReleaseMode) {
      debugPrint('⚠️ [$tag] skip index=$index: expected Map, got ${item.runtimeType}');
    }
    return null;
  }
  try {
    return mapFromJsonObject(item);
  } catch (e) {
    if (!kReleaseMode) {
      debugPrint('⚠️ [$tag] skip index=$index: $e');
    }
    return null;
  }
}

List<Map<String, dynamic>> parseLedgerListResponse(
  dynamic raw, {
  String tag = 'ledger',
}) {
  logApiListStructure(raw, tag: tag);
  final list = extractApiList(raw);
  final out = <Map<String, dynamic>>[];
  for (var i = 0; i < list.length; i++) {
    final parsed = parseLedgerItem(list[i], tag: tag, index: i);
    if (parsed != null) out.add(parsed);
  }
  return out;
}

/// Resolves order id whether [order] is a nested map or a Jackson identity string ref.
String orderIdFromPayment(Map<String, dynamic> payment) {
  final order = payment['order'];
  if (order is Map) {
    return (order['id'] ?? '').toString();
  }
  if (order is String) return order;
  return '';
}
