package com.oceannexus.backend.controller;

import com.oceannexus.backend.entity.OceanDataPoint;
import com.oceannexus.backend.repository.OceanDataPointRepository;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ocean-data")
public class OceanDataController {

    @Autowired
    private OceanDataPointRepository repository;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Ocean Nexus Spatial Engine Online!");
    }

    @GetMapping("/sample")
    public ResponseEntity<Map<String, Object>> createSampleData(
            @RequestParam double longitude,
            @RequestParam double latitude,
            @RequestParam double depth,
            @RequestParam double temp,
            @RequestParam double salinity) {

        Point point = geometryFactory.createPoint(new Coordinate(longitude, latitude));

        OceanDataPoint dataPoint = OceanDataPoint.builder()
                .source("ARGO_FLOAT")
                .location(point)
                .depth(depth)
                .temperature(temp)
                .salinity(salinity)
                .recordedAt(LocalDateTime.now())
                .build();

        OceanDataPoint savedPoint = repository.save(dataPoint);

        // Build clean response payload
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS"); // Fixed line here
        response.put("message", "Spatial data saved to PostGIS!");
        response.put("id", savedPoint.getId());
        response.put("longitude", savedPoint.getLocation().getX());
        response.put("latitude", savedPoint.getLocation().getY());
        response.put("depth", savedPoint.getDepth());
        response.put("temperature", savedPoint.getTemperature());
        response.put("salinity", savedPoint.getSalinity());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/spatial-search")
    public ResponseEntity<List<Map<String, Object>>> getPointsInBox(
            @RequestParam double minLon,
            @RequestParam double minLat,
            @RequestParam double maxLon,
            @RequestParam double maxLat) {

        List<OceanDataPoint> points = repository.findPointsWithinBoundingBox(minLon, minLat, maxLon, maxLat);

        List<Map<String, Object>> responseList = points.stream().map(point -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", point.getId());
            map.put("source", point.getSource());
            map.put("longitude", point.getLocation().getX());
            map.put("latitude", point.getLocation().getY());
            map.put("depth", point.getDepth());
            map.put("temperature", point.getTemperature());
            map.put("salinity", point.getSalinity());
            map.put("recordedAt", point.getRecordedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(responseList);
    
    }
    // 93 Lakhs Argo Data Bounding Box Search
    @GetMapping("/argo-search")
    public ResponseEntity<List<Map<String, Object>>> searchArgoData(
            @RequestParam double minLon,
            @RequestParam double minLat,
            @RequestParam double maxLon,
            @RequestParam double maxLat) {
        
        return ResponseEntity.ok(repository.findArgoPointsInBoundingBox(minLon, minLat, maxLon, maxLat));
    }

    // PostGIS Radius Search (Distance in Kilometers)
    @GetMapping("/argo-radius-search")
    public ResponseEntity<List<Map<String, Object>>> searchArgoRadius(
            @RequestParam double lon,
            @RequestParam double lat,
            @RequestParam double radiusKm) {
        
        double radiusMeters = radiusKm * 1000;
        return ResponseEntity.ok(repository.findArgoPointsInRadius(lon, lat, radiusMeters));
    }
    // Spatial Clustering Endpoint (Distance in Kilometers for grouping)
    @GetMapping("/argo-clusters")
    public ResponseEntity<List<Map<String, Object>>> getSpatialClusters(
            @RequestParam(defaultValue = "50") double distanceKm) {
        
        double distanceMeters = distanceKm * 1000;
        return ResponseEntity.ok(repository.findSpatialClusters(distanceMeters));
    }
}