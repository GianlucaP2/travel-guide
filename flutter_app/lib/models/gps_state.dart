class GPSState {
  final double? lat;
  final double? lng;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final int? timestamp;
  final String? error;
  final bool tracking;
  final bool following;

  const GPSState({
    this.lat,
    this.lng,
    this.accuracy,
    this.speed,
    this.heading,
    this.timestamp,
    this.error,
    this.tracking = false,
    this.following = false,
  });

  GPSState copyWith({
    double? lat,
    double? lng,
    double? accuracy,
    double? speed,
    double? heading,
    int? timestamp,
    String? error,
    bool? tracking,
    bool? following,
  }) {
    return GPSState(
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      accuracy: accuracy ?? this.accuracy,
      speed: speed ?? this.speed,
      heading: heading ?? this.heading,
      timestamp: timestamp ?? this.timestamp,
      error: error,
      tracking: tracking ?? this.tracking,
      following: following ?? this.following,
    );
  }

  bool get hasPosition => lat != null && lng != null;
}
