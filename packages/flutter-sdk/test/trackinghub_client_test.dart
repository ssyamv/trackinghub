import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';
import 'package:trackinghub_flutter/trackinghub_flutter.dart';

void main() {
  test('serializes the shared Flutter event envelope', () {
    final config = TrackingHubConfig(
      endpoint: Uri.parse('https://tracking.example.com/api/events'),
      projectId: 'project_x',
      environment: TrackingHubEnvironment.production,
      writeKey: 'write_key',
    );

    final event = TrackingHubEvent(
      config: config,
      eventName: 'pay_button_click',
      timestamp:
          DateTime.fromMillisecondsSinceEpoch(1710000000000, isUtc: true),
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
      'environment': 'production',
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

  test('default HTTP transport posts JSON envelope with write key header',
      () async {
    final receivedRequests = <_ReceivedRequest>[];
    final server = await _startTestServer((request, body) {
      receivedRequests.add(_ReceivedRequest(request, body));
      request.response.statusCode = 202;
      request.response.write('{"ok":true}');
    });
    final transport = TrackingHubHttpTransport();
    final client = TrackingHubClient(
      config: TrackingHubConfig(
        endpoint: server.endpoint,
        projectId: '0f4b8b21-4d76-4f7e-ae20-8b3ad4891f21',
        environment: TrackingHubEnvironment.production,
        writeKey: 'write_key',
      ),
      transport: transport.call,
    );

    try {
      await client.track(
        'frame_enter',
        userId: 'user_123',
        deviceId: 'device_456',
        properties: const {'frame_id': 'frame_1'},
      );
    } finally {
      transport.close();
      await server.close();
    }

    expect(receivedRequests, hasLength(1));
    expect(receivedRequests.single.request.uri.path, '/api/events');
    expect(receivedRequests.single.request.headers.contentType?.mimeType,
        'application/json');
    expect(
      receivedRequests.single.request.headers.value('x-trackinghub-write-key'),
      'write_key',
    );
    expect(receivedRequests.single.body,
        contains('"project_id":"0f4b8b21-4d76-4f7e-ae20-8b3ad4891f21"'));
    expect(receivedRequests.single.body, contains('"source":"flutter"'));
    expect(
        receivedRequests.single.body, contains('"event_name":"frame_enter"'));
  });

  test('default HTTP transport throws when ingestion rejects the event',
      () async {
    final server = await _startTestServer((request, _) {
      request.response.statusCode = 503;
      request.response.write('{"ok":false}');
    });
    final transport = TrackingHubHttpTransport();

    try {
      await expectLater(
        transport.call(
          server.endpoint,
          const {'event_name': 'frame_enter'},
          const {'x-trackinghub-write-key': 'write_key'},
        ),
        throwsA(isA<TrackingHubTransportException>()),
      );
    } finally {
      transport.close();
      await server.close();
    }
  });
}

class _ReceivedRequest {
  const _ReceivedRequest(this.request, this.body);

  final HttpRequest request;
  final String body;
}

class _TestServer {
  const _TestServer(this.server, this.subscription);

  final HttpServer server;
  final StreamSubscription<HttpRequest> subscription;

  Uri get endpoint =>
      Uri.parse('http://${server.address.host}:${server.port}/api/events');

  Future<void> close() async {
    await subscription.cancel();
    await server.close(force: true);
  }
}

Future<_TestServer> _startTestServer(
  void Function(HttpRequest request, String body) handler,
) async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
  late final StreamSubscription<HttpRequest> subscription;
  subscription = server.listen((request) async {
    final body = await utf8.decoder.bind(request).join();
    handler(request, body);
    await request.response.close();
  });

  return _TestServer(server, subscription);
}
