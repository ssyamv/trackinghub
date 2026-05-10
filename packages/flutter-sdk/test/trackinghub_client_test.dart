import 'package:test/test.dart';
import 'package:trackinghub_flutter/trackinghub_flutter.dart';

void main() {
  test('serializes the shared Flutter event envelope', () {
    final config = TrackingHubConfig(
      endpoint: Uri.parse('https://tracking.example.com/api/events'),
      projectId: 'project_x',
      environment: TrackingHubEnvironment.prod,
      writeKey: 'write_key',
    );

    final event = TrackingHubEvent(
      config: config,
      eventName: 'pay_button_click',
      timestamp: DateTime.fromMillisecondsSinceEpoch(1710000000000, isUtc: true),
      anonymousId: 'anon_123',
      sessionId: 'session_789',
      sdkVersion: '0.1.0',
      properties: const {'product_id': 'p_123'},
      context: const {
        'locale': 'en-US',
        'timezone': 'Asia/Shanghai',
      },
    );

    expect(event.toJson(), {
      'project_id': 'project_x',
      'environment': 'prod',
      'source': 'flutter',
      'event_name': 'pay_button_click',
      'user_id': null,
      'anonymous_id': 'anon_123',
      'device_id': null,
      'session_id': 'session_789',
      'timestamp': 1710000000000,
      'app_version': null,
      'sdk_version': '0.1.0',
      'channel': null,
      'campaign': null,
      'country': null,
      'properties': {'product_id': 'p_123'},
      'context': {
        'locale': 'en-US',
        'timezone': 'Asia/Shanghai',
      },
    });
  });
}
