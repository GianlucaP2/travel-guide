import 'package:dio/dio.dart';
import 'package:travel_guide/models/wiki_data.dart';

class WikipediaService {
  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ));

  final Map<String, WikiData> _cache = {};

  Future<WikiData> fetchWikiData(String name, String region, double lat, double lng) async {
    final cacheKey = '${name}_$region';
    if (_cache.containsKey(cacheKey)) return _cache[cacheKey]!;

    WikiData data = const WikiData();

    // Step 1: Direct REST API lookup
    data = await _tryDirectLookup(name);
    if (data.extract != null) {
      // Try geo-search for image if none found
      if (data.imageUrl == null) {
        final geoImage = await _tryGeoSearch(lat, lng);
        if (geoImage != null) {
          data = WikiData(imageUrl: geoImage, extract: data.extract, wikiUrl: data.wikiUrl);
        }
      }
      _cache[cacheKey] = data;
      return data;
    }

    // Step 2: Strip parenthetical qualifiers
    final cleanName = name.replaceAll(RegExp(r'\s*\([^)]*\)'), '').trim();
    if (cleanName != name) {
      data = await _tryDirectLookup(cleanName);
      if (data.extract != null) {
        if (data.imageUrl == null) {
          final geoImage = await _tryGeoSearch(lat, lng);
          if (geoImage != null) {
            data = WikiData(imageUrl: geoImage, extract: data.extract, wikiUrl: data.wikiUrl);
          }
        }
        _cache[cacheKey] = data;
        return data;
      }
    }

    // Step 3: Search with validation
    data = await _trySearchFallback(name, region);
    if (data.extract != null) {
      if (data.imageUrl == null) {
        final geoImage = await _tryGeoSearch(lat, lng);
        if (geoImage != null) {
          data = WikiData(imageUrl: geoImage, extract: data.extract, wikiUrl: data.wikiUrl);
        }
      }
      _cache[cacheKey] = data;
      return data;
    }

    // Final fallback: just try geo-search for an image
    final geoImage = await _tryGeoSearch(lat, lng);
    data = WikiData(imageUrl: geoImage);
    _cache[cacheKey] = data;
    return data;
  }

  Future<WikiData> _tryDirectLookup(String title) async {
    try {
      final encoded = Uri.encodeComponent(title);
      final response = await _dio.get(
        'https://en.wikipedia.org/api/rest_v1/page/summary/$encoded',
      );
      if (response.statusCode == 200) {
        final data = response.data;
        String? imageUrl = data['thumbnail']?['source'] as String?;
        if (imageUrl != null) {
          imageUrl = imageUrl.replaceFirst(RegExp(r'/\d+px-'), '/800px-');
        }
        return WikiData(
          imageUrl: imageUrl,
          extract: data['extract'] as String?,
          wikiUrl: data['content_urls']?['desktop']?['page'] as String?,
        );
      }
    } catch (_) {}
    return const WikiData();
  }

  Future<WikiData> _trySearchFallback(String name, String region) async {
    try {
      final query = '$name $region';
      final response = await _dio.get(
        'https://en.wikipedia.org/w/api.php',
        queryParameters: {
          'action': 'query',
          'list': 'search',
          'srsearch': query,
          'srlimit': '3',
          'format': 'json',
          'origin': '*',
        },
      );
      if (response.statusCode == 200) {
        final results = response.data['query']?['search'] as List? ?? [];
        // Validate: first word of POI name must appear in result title
        final firstWord = name.split(' ').first.toLowerCase();
        for (final result in results) {
          final resultTitle = (result['title'] as String).toLowerCase();
          if (resultTitle.contains(firstWord)) {
            return await _tryDirectLookup(result['title'] as String);
          }
        }
      }
    } catch (_) {}
    return const WikiData();
  }

  Future<String?> _tryGeoSearch(double lat, double lng) async {
    try {
      final response = await _dio.get(
        'https://en.wikipedia.org/w/api.php',
        queryParameters: {
          'action': 'query',
          'generator': 'geosearch',
          'ggscoord': '$lat|$lng',
          'ggsradius': '500',
          'ggslimit': '5',
          'prop': 'pageimages',
          'piprop': 'thumbnail',
          'pithumbsize': '800',
          'format': 'json',
          'origin': '*',
        },
      );
      if (response.statusCode == 200) {
        final pages = response.data['query']?['pages'] as Map<String, dynamic>?;
        if (pages != null) {
          for (final page in pages.values) {
            final thumb = page['thumbnail']?['source'] as String?;
            if (thumb != null) return thumb;
          }
        }
      }
    } catch (_) {}
    return null;
  }
}
