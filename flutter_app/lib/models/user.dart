class User {
  final String id;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final String authProvider;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    required this.displayName,
    this.avatarUrl,
    required this.authProvider,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['display_name'] as String,
      avatarUrl: json['avatar_url'] as String?,
      authProvider: json['auth_provider'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
