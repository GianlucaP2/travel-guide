import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:travel_guide/models/gps_state.dart';

class GpsService {
  StreamSubscription<Position>? _subscription;
  final _controller = StreamController<GPSState>.broadcast();

  Stream<GPSState> get positionStream => _controller.stream;

  Future<bool> startTracking() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _controller.add(const GPSState(error: 'Location services are disabled'));
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _controller.add(const GPSState(error: 'Location permission denied'));
        return false;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      _controller.add(const GPSState(error: 'Location permission permanently denied'));
      return false;
    }

    _subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      ),
    ).listen(
      (position) {
        _controller.add(GPSState(
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
          speed: position.speed > 0 ? position.speed : null,
          heading: position.heading > 0 ? position.heading : null,
          timestamp: position.timestamp.millisecondsSinceEpoch,
          tracking: true,
          following: true,
        ));
      },
      onError: (e) {
        _controller.add(GPSState(error: e.toString(), tracking: false));
      },
    );

    return true;
  }

  void stopTracking() {
    _subscription?.cancel();
    _subscription = null;
    _controller.add(const GPSState());
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}
