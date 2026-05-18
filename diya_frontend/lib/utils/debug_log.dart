import 'dart:async';

import 'package:dio/dio.dart';

/// Session debug logging (agent instrumentation). Fire-and-forget; never throws.
void agentDebugLog({
  required String location,
  required String message,
  required String hypothesisId,
  Map<String, dynamic>? data,
  String runId = 'pre-fix',
}) {
  // #region agent log
  unawaited(() async {
    try {
      await Dio().post(
        'http://127.0.0.1:7711/ingest/9cda8e85-2b13-471e-b6b5-066f56e10727',
        data: {
          'sessionId': '48e3b6',
          'runId': runId,
          'hypothesisId': hypothesisId,
          'location': location,
          'message': message,
          'data': data ?? <String, dynamic>{},
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '48e3b6',
          },
        ),
      );
    } catch (_) {}
  }());
  // #endregion
}
