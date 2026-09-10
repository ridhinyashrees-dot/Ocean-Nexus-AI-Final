package com.oceannexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Point;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ocean_data_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OceanDataPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String source; // e.g., "ARGO", "OBIS", "INCOIS"

    @Column(columnDefinition = "geometry(Point,4326)", nullable = false)
    private Point location; // PostGIS Point (Longitude, Latitude)

    private Double depth;
    private Double temperature;
    private Double salinity;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}