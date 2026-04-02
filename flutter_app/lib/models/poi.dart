class POI {
  final String id;
  final String name;
  final String category;
  final int tier;
  final double lat;
  final double lng;
  final String description;
  final String? tips;
  final String? address;
  final String? hours;
  final String? price;
  final List<String>? tags;
  final String region;
  final double? distanceFromSF;

  const POI({
    required this.id,
    required this.name,
    required this.category,
    required this.tier,
    required this.lat,
    required this.lng,
    required this.description,
    this.tips,
    this.address,
    this.hours,
    this.price,
    this.tags,
    required this.region,
    this.distanceFromSF,
  });

  factory POI.fromJson(Map<String, dynamic> json) {
    return POI(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      tier: json['tier'] as int,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      description: json['description'] as String,
      tips: json['tips'] as String?,
      address: json['address'] as String?,
      hours: json['hours'] as String?,
      price: json['price'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
      region: json['region'] as String,
      distanceFromSF: (json['distanceFromSF'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'tier': tier,
        'lat': lat,
        'lng': lng,
        'description': description,
        'tips': tips,
        'address': address,
        'hours': hours,
        'price': price,
        'tags': tags,
        'region': region,
        'distanceFromSF': distanceFromSF,
      };
}
