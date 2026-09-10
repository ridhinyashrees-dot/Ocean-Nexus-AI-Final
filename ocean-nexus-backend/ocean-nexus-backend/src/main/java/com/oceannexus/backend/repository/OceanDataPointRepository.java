package com.oceannexus.backend.repository;

import com.oceannexus.backend.entity.OceanDataPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public interface OceanDataPointRepository extends JpaRepository<OceanDataPoint, UUID> {

    // 1. Initial Test Table Bounding Box Search (For /spatial-search endpoint)
    @Query(value = "SELECT * FROM ocean_data_points " +
                   "WHERE ST_Within(location, ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326))", 
           nativeQuery = true)
    List<OceanDataPoint> findPointsWithinBoundingBox(
            @Param("minLon") double minLon,
            @Param("minLat") double minLat,
            @Param("maxLon") double maxLon,
            @Param("maxLat") double maxLat);

    // 2. Massive 93 Lakhs Argo Dataset Bounding Box Query (For /argo-search endpoint)
    @Query(value = "SELECT platform_code, longitude, latitude, temp, psal, pres, date_time " +
                   "FROM argo_ocean_data " +
                   "WHERE ST_Within(" +
                   "  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), " +
                   "  ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)" +
                   ") LIMIT 1000", 
           nativeQuery = true)
    List<Map<String, Object>> findArgoPointsInBoundingBox(
            @Param("minLon") double minLon,
            @Param("minLat") double minLat,
            @Param("maxLon") double maxLon,
            @Param("maxLat") double maxLat);

    // 3. Massive 93 Lakhs Argo Dataset Radius Search Query (For /argo-radius-search endpoint)
    @Query(value = "SELECT platform_code, longitude, latitude, temp, psal, pres, date_time " +
                   "FROM argo_ocean_data " +
                   "WHERE ST_DWithin(" +
                   "  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, " +
                   "  ST_SetSRID(ST_MakePoint(:centerLon, :centerLat), 4326)::geography, " +
                   "  :radiusMeters" +
                   ") LIMIT 1000", 
           nativeQuery = true)
    List<Map<String, Object>> findArgoPointsInRadius(
            @Param("centerLon") double centerLon,
            @Param("centerLat") double centerLat,
            @Param("radiusMeters") double radiusMeters);


    // 4. Spatial Grid Clustering Query for Massive Datasets (ST_ClusterDBSCAN)
    // 4. Safe Spatial Grid Clustering Query for Argo Data
    // 4. Guaranteed Safe Spatial Grid Clustering Query
    @Query(value = "SELECT " +
                   "  ROUND(CAST(longitude AS numeric), 1) AS center_longitude, " +
                   "  ROUND(CAST(latitude AS numeric), 1) AS center_latitude, " +
                   "  COUNT(*) AS point_count, " +
                   "  AVG(temp) AS avg_temperature, " +
                   "  AVG(psal) AS avg_salinity " +
                   "FROM argo_ocean_data " +
                   "WHERE longitude IS NOT NULL AND latitude IS NOT NULL " +
                   "GROUP BY center_longitude, center_latitude " +
                   "LIMIT 100", 
           nativeQuery = true)
    List<Map<String, Object>> findSpatialClusters(@Param("distanceMeters") double distanceMeters);
}