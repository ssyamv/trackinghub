library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

typedef TrackingHubTransport = Future<void> Function(
  Uri endpoint,
  Map<String, Object?> body,
  Map<String, String> headers,
);

class TrackingHubTransportException implements Exception {
  const TrackingHubTransportException({
    required this.statusCode,
    required this.responseBody,
  });

  final int statusCode;
  final String responseBody;

  @override
  String toString() {
    return 'TrackingHubTransportException(statusCode: $statusCode, responseBody: $responseBody)';
  }
}

class TrackingHubHttpTransport {
  TrackingHubHttpTransport({
    HttpClient? client,
    this.timeout = const Duration(seconds: 10),
  }) : _client = client ?? HttpClient();

  final HttpClient _client;
  final Duration timeout;

  Future<void> call(
    Uri endpoint,
    Map<String, Object?> body,
    Map<String, String> headers,
  ) async {
    final request = await _client.postUrl(endpoint).timeout(timeout);
    for (final entry in headers.entries) {
      request.headers.set(entry.key, entry.value);
    }
    request.write(jsonEncode(body));
    final response = await request.close().timeout(timeout);
    final responseBody =
        await utf8.decoder.bind(response).join().timeout(timeout);

    if (response.statusCode < 200 || response.statusCode >= 400) {
      throw TrackingHubTransportException(
        statusCode: response.statusCode,
        responseBody: responseBody,
      );
    }
  }

  void close() {
    _client.close(force: true);
  }
}

class TrackingHubRetryPolicy {
  const TrackingHubRetryPolicy({
    this.maxAttempts = 5,
    this.maxQueueSize = 1000,
    this.eventTtl = const Duration(days: 7),
    this.retryDelays = const [
      Duration(seconds: 30),
      Duration(minutes: 2),
      Duration(minutes: 10),
      Duration(minutes: 30),
    ],
  });

  final int maxAttempts;
  final int maxQueueSize;
  final Duration eventTtl;
  final List<Duration> retryDelays;

  Duration delayForAttempt(int failedAttempts) {
    if (retryDelays.isEmpty) {
      return Duration.zero;
    }

    final index = failedAttempts - 1;
    if (index < retryDelays.length) {
      return retryDelays[index];
    }

    return retryDelays.last;
  }
}

class TrackingHubFlushResult {
  const TrackingHubFlushResult({
    required this.delivered,
    required this.deferred,
    required this.dropped,
  });

  final int delivered;
  final int deferred;
  final int dropped;
}

enum TrackingHubEnvironment {
  test('test'),
  develop('develop'),
  production('production'),
  dev('dev'),
  staging('staging'),
  prod('prod');

  const TrackingHubEnvironment(this.value);

  final String value;
}

class TrackingHubConfig {
  const TrackingHubConfig({
    required this.endpoint,
    required this.projectId,
    required this.environment,
    required this.writeKey,
  });

  final Uri endpoint;
  final String projectId;
  final TrackingHubEnvironment environment;
  final String writeKey;
}

class TrackingHubEvent {
  const TrackingHubEvent({
    required this.config,
    required this.eventName,
    required this.timestamp,
    required this.sdkVersion,
    this.userId,
    this.anonymousId,
    this.deviceId,
    this.sessionId,
    this.appVersion,
    this.channel,
    this.campaign,
    this.country,
    this.properties = const <String, Object?>{},
    this.context = const <String, Object?>{},
  });

  final TrackingHubConfig config;
  final String eventName;
  final DateTime timestamp;
  final String sdkVersion;
  final String? userId;
  final String? anonymousId;
  final String? deviceId;
  final String? sessionId;
  final String? appVersion;
  final String? channel;
  final String? campaign;
  final String? country;
  final Map<String, Object?> properties;
  final Map<String, Object?> context;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'project_id': config.projectId,
      'environment': config.environment.value,
      'source': 'flutter',
      'event_name': eventName,
      'user_id': userId,
      'anonymous_id': anonymousId,
      'device_id': deviceId,
      'session_id': sessionId,
      'timestamp': timestamp.toUtc().millisecondsSinceEpoch,
      'app_version': appVersion,
      'sdk_version': sdkVersion,
      'channel': channel,
      'campaign': campaign,
      'country': country,
      'properties': properties,
      'context': context,
    };
  }
}

class TrackingHubQueuedEvent {
  const TrackingHubQueuedEvent({
    required this.id,
    required this.endpoint,
    required this.body,
    required this.headers,
    required this.createdAt,
    this.attempts = 0,
    this.nextAttemptAt,
  });

  final String id;
  final Uri endpoint;
  final Map<String, Object?> body;
  final Map<String, String> headers;
  final DateTime createdAt;
  final int attempts;
  final DateTime? nextAttemptAt;

  TrackingHubQueuedEvent copyWith({
    int? attempts,
    DateTime? nextAttemptAt,
  }) {
    return TrackingHubQueuedEvent(
      id: id,
      endpoint: endpoint,
      body: body,
      headers: headers,
      createdAt: createdAt,
      attempts: attempts ?? this.attempts,
      nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'endpoint': endpoint.toString(),
      'body': body,
      'headers': headers,
      'created_at': createdAt.toUtc().millisecondsSinceEpoch,
      'attempts': attempts,
      'next_attempt_at': nextAttemptAt?.toUtc().millisecondsSinceEpoch,
    };
  }

  static TrackingHubQueuedEvent fromJson(Map<String, Object?> json) {
    final headers = <String, String>{};
    final rawHeaders = json['headers'];
    if (rawHeaders is Map) {
      for (final entry in rawHeaders.entries) {
        if (entry.key is String && entry.value is String) {
          headers[entry.key as String] = entry.value as String;
        }
      }
    }

    return TrackingHubQueuedEvent(
      id: json['id'] as String,
      endpoint: Uri.parse(json['endpoint'] as String),
      body: _stringKeyedMap(json['body']),
      headers: headers,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        json['created_at'] as int,
        isUtc: true,
      ),
      attempts: json['attempts'] as int? ?? 0,
      nextAttemptAt: json['next_attempt_at'] == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              json['next_attempt_at'] as int,
              isUtc: true,
            ),
    );
  }
}

abstract class TrackingHubQueueStore {
  Future<List<TrackingHubQueuedEvent>> load();
  Future<void> save(List<TrackingHubQueuedEvent> events);

  Future<int> pendingCount() async {
    return (await load()).length;
  }
}

class TrackingHubMemoryQueueStore extends TrackingHubQueueStore {
  List<TrackingHubQueuedEvent> _events = <TrackingHubQueuedEvent>[];

  @override
  Future<List<TrackingHubQueuedEvent>> load() async {
    return List<TrackingHubQueuedEvent>.of(_events);
  }

  @override
  Future<void> save(List<TrackingHubQueuedEvent> events) async {
    _events = List<TrackingHubQueuedEvent>.of(events);
  }
}

class TrackingHubFileQueueStore extends TrackingHubQueueStore {
  TrackingHubFileQueueStore(this.file);

  final File file;

  @override
  Future<List<TrackingHubQueuedEvent>> load() async {
    if (!await file.exists()) {
      return <TrackingHubQueuedEvent>[];
    }

    final text = await file.readAsString();
    if (text.trim().isEmpty) {
      return <TrackingHubQueuedEvent>[];
    }

    final decoded = jsonDecode(text);
    if (decoded is! List) {
      return <TrackingHubQueuedEvent>[];
    }

    return decoded
        .whereType<Map>()
        .map((item) => TrackingHubQueuedEvent.fromJson(
              item.cast<String, Object?>(),
            ))
        .toList();
  }

  @override
  Future<void> save(List<TrackingHubQueuedEvent> events) async {
    await file.parent.create(recursive: true);
    await file.writeAsString(
      jsonEncode(events.map((event) => event.toJson()).toList()),
      flush: true,
    );
  }
}

class TrackingHubClient {
  const TrackingHubClient({
    required this.config,
    required this.transport,
    this.sdkVersion = '0.1.0',
    this.queueStore,
    this.retryPolicy = const TrackingHubRetryPolicy(),
    this.now,
  });

  final TrackingHubConfig config;
  final TrackingHubTransport transport;
  final String sdkVersion;
  final TrackingHubQueueStore? queueStore;
  final TrackingHubRetryPolicy retryPolicy;
  final DateTime Function()? now;

  Future<void> track(
    String eventName, {
    Map<String, Object?> properties = const <String, Object?>{},
    Map<String, Object?> context = const <String, Object?>{},
    DateTime? timestamp,
    String? userId,
    String? anonymousId,
    String? deviceId,
    String? sessionId,
    String? appVersion,
    String? channel,
    String? campaign,
    String? country,
  }) async {
    final event = TrackingHubEvent(
      config: config,
      eventName: eventName,
      timestamp: timestamp ?? _now(),
      sdkVersion: sdkVersion,
      userId: userId,
      anonymousId: anonymousId,
      deviceId: deviceId,
      sessionId: sessionId,
      appVersion: appVersion,
      channel: channel,
      campaign: campaign,
      country: country,
      properties: properties,
      context: context,
    );

    final headers = <String, String>{
      'content-type': 'application/json',
      'x-trackinghub-write-key': config.writeKey,
    };

    final body = event.toJson();
    final store = queueStore;
    if (store == null) {
      return transport(config.endpoint, body, headers);
    }

    final queue = await store.load();
    queue.add(TrackingHubQueuedEvent(
      id: _fallbackId('event'),
      endpoint: config.endpoint,
      body: body,
      headers: headers,
      createdAt: _now(),
    ));
    await store.save(_trimQueue(queue));
    await flush(force: false);
  }

  Future<TrackingHubFlushResult> flush({bool force = true}) async {
    final store = queueStore;
    if (store == null) {
      return const TrackingHubFlushResult(
        delivered: 0,
        deferred: 0,
        dropped: 0,
      );
    }

    var delivered = 0;
    var deferred = 0;
    var dropped = 0;
    final remaining = <TrackingHubQueuedEvent>[];

    for (final event in await store.load()) {
      final outcome = await _flushOne(event, force: force);
      switch (outcome.status) {
        case _FlushStatus.delivered:
          delivered += 1;
          break;
        case _FlushStatus.deferred:
          deferred += 1;
          remaining.add(outcome.event);
          break;
        case _FlushStatus.dropped:
          dropped += 1;
          break;
      }
    }

    await store.save(_trimQueue(remaining));
    return TrackingHubFlushResult(
      delivered: delivered,
      deferred: deferred,
      dropped: dropped,
    );
  }

  DateTime _now() {
    return (now ?? DateTime.now)().toUtc();
  }

  List<TrackingHubQueuedEvent> _trimQueue(List<TrackingHubQueuedEvent> events) {
    final liveEvents = events
        .where((event) =>
            _now().difference(event.createdAt) <= retryPolicy.eventTtl)
        .toList();

    if (liveEvents.length <= retryPolicy.maxQueueSize) {
      return liveEvents;
    }

    return liveEvents.sublist(liveEvents.length - retryPolicy.maxQueueSize);
  }

  Future<_FlushOutcome> _flushOne(
    TrackingHubQueuedEvent queuedEvent, {
    required bool force,
  }) async {
    var event = queuedEvent;

    if (_now().difference(event.createdAt) > retryPolicy.eventTtl ||
        event.attempts >= retryPolicy.maxAttempts) {
      return _FlushOutcome.dropped(event);
    }

    final nextAttemptAt = event.nextAttemptAt;
    if (!force && nextAttemptAt != null && nextAttemptAt.isAfter(_now())) {
      return _FlushOutcome.deferred(event);
    }

    while (event.attempts < retryPolicy.maxAttempts) {
      try {
        await transport(event.endpoint, event.body, event.headers);
        return _FlushOutcome.delivered(event);
      } catch (error) {
        if (!_isRetryableError(error)) {
          return _FlushOutcome.dropped(event);
        }

        final attempts = event.attempts + 1;
        if (attempts >= retryPolicy.maxAttempts) {
          return _FlushOutcome.dropped(event.copyWith(attempts: attempts));
        }

        final delay = retryPolicy.delayForAttempt(attempts);
        final retryAt = _now().add(delay);
        event = event.copyWith(attempts: attempts, nextAttemptAt: retryAt);

        if (delay > Duration.zero) {
          return _FlushOutcome.deferred(event);
        }
      }
    }

    return _FlushOutcome.dropped(event);
  }
}

enum _FlushStatus { delivered, deferred, dropped }

class _FlushOutcome {
  const _FlushOutcome._(this.status, this.event);

  factory _FlushOutcome.delivered(TrackingHubQueuedEvent event) {
    return _FlushOutcome._(_FlushStatus.delivered, event);
  }

  factory _FlushOutcome.deferred(TrackingHubQueuedEvent event) {
    return _FlushOutcome._(_FlushStatus.deferred, event);
  }

  factory _FlushOutcome.dropped(TrackingHubQueuedEvent event) {
    return _FlushOutcome._(_FlushStatus.dropped, event);
  }

  final _FlushStatus status;
  final TrackingHubQueuedEvent event;
}

Map<String, Object?> _stringKeyedMap(Object? value) {
  if (value is! Map) {
    return <String, Object?>{};
  }

  return value.map((key, item) => MapEntry(key.toString(), item));
}

String _fallbackId(String prefix) {
  return '${prefix}_${DateTime.now().microsecondsSinceEpoch}';
}

bool _isRetryableError(Object error) {
  if (error is TrackingHubTransportException) {
    return error.statusCode == 408 ||
        error.statusCode == 425 ||
        error.statusCode == 429 ||
        error.statusCode >= 500;
  }

  return true;
}
