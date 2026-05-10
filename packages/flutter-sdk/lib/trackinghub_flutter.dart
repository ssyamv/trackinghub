library;

typedef TrackingHubTransport = Future<void> Function(
  Uri endpoint,
  Map<String, Object?> body,
  Map<String, String> headers,
);

enum TrackingHubEnvironment {
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
