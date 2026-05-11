library;

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
  TrackingHubHttpTransport({HttpClient? client})
      : _client = client ?? HttpClient();

  final HttpClient _client;

  Future<void> call(
    Uri endpoint,
    Map<String, Object?> body,
    Map<String, String> headers,
  ) async {
    final request = await _client.postUrl(endpoint);
    for (final entry in headers.entries) {
      request.headers.set(entry.key, entry.value);
    }
    request.write(jsonEncode(body));
    final response = await request.close();
    final responseBody = await utf8.decoder.bind(response).join();

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

class TrackingHubClient {
  const TrackingHubClient({
    required this.config,
    required this.transport,
    this.sdkVersion = '0.1.0',
  });

  final TrackingHubConfig config;
  final TrackingHubTransport transport;
  final String sdkVersion;

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
  }) {
    final event = TrackingHubEvent(
      config: config,
      eventName: eventName,
      timestamp: timestamp ?? DateTime.now().toUtc(),
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

    return transport(config.endpoint, event.toJson(), <String, String>{
      'content-type': 'application/json',
      'x-trackinghub-write-key': config.writeKey,
    });
  }
}
