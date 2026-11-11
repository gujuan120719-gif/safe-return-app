import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { LocationCoords, SafetyFacility, MapFilterState, RouteType } from '../types';

interface SafeMapProps {
  currentCoords: LocationCoords;
  facilities: SafetyFacility[];
  filters: MapFilterState;
  showRoutes: boolean;
  selectedRouteType: RouteType;
  onFacilityClick?: (facility: SafetyFacility) => void;
}

export const SafeMap: React.FC<SafeMapProps> = ({
  currentCoords,
  facilities,
  filters,
  showRoutes,
  selectedRouteType,
  onFacilityClick,
}) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  const userSourceRef = useRef<VectorSource>(new VectorSource());
  const facilitySourceRef = useRef<VectorSource>(new VectorSource());
  const routeSourceRef = useRef<VectorSource>(new VectorSource());

  const vworldKey = import.meta.env.VITE_VWORLD_API_KEY;

  // 1. 지도 초기화
  useEffect(() => {
    if (!mapElement.current) return;

    // V-World API 키가 있으면 V-World 2D 타일, 없으면 OSM 사용
    const baseSource = vworldKey && vworldKey !== 'YOUR_VWORLD_API_KEY_HERE'
      ? new XYZ({
          url: `https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/Base/{z}/{y}/{x}.png`,
          crossOrigin: 'anonymous',
        })
      : new OSM();

    const baseLayer = new TileLayer({ source: baseSource });

    const routeLayer = new VectorLayer({
      source: routeSourceRef.current,
      zIndex: 5,
    });

    const facilityLayer = new VectorLayer({
      source: facilitySourceRef.current,
      zIndex: 10,
    });

    const userLayer = new VectorLayer({
      source: userSourceRef.current,
      zIndex: 20,
    });

    const initialCenter = fromLonLat([currentCoords.longitude, currentCoords.latitude]);

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer, routeLayer, facilityLayer, userLayer],
      view: new View({
        center: initialCenter,
        zoom: 17,
        maxZoom: 19,
        minZoom: 12,
      }),
      controls: [], // 모바일 풀스크린 깔끔한 뷰를 위해 기본 컨트롤 숨김
    });

    // 마커 클릭 이벤트
    map.on('click', (evt) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const facilityData = feature.get('facilityData') as SafetyFacility;
        if (facilityData && onFacilityClick) {
          onFacilityClick(facilityData);
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, [vworldKey]);

  // 2. 내 위치 마커 업데이트 & 부드러운 카메라 이동
  useEffect(() => {
    if (!mapRef.current) return;

    const userCoord = fromLonLat([currentCoords.longitude, currentCoords.latitude]);
    userSourceRef.current.clear();

    // 외부 파동 링
    const pulseFeature = new Feature(new Point(userCoord));
    pulseFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 18,
          fill: new Fill({ color: 'rgba(59, 130, 246, 0.25)' }),
          stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.6)', width: 1.5 }),
        }),
      })
    );

    // 내부 중심 점
    const centerDot = new Feature(new Point(userCoord));
    centerDot.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2563EB' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        }),
      })
    );

    userSourceRef.current.addFeatures([pulseFeature, centerDot]);

    mapRef.current.getView().animate({
      center: userCoord,
      duration: 600,
    });
  }, [currentCoords]);

  // 3. 방범 시설물(CCTV, 가로등, 비상벨) 마커 렌더링
  useEffect(() => {
    facilitySourceRef.current.clear();

    facilities.forEach((item) => {
      if (item.type === 'CCTV' && !filters.cctv) return;
      if (item.type === 'STREETLIGHT' && !filters.streetlight) return;
      if (item.type === 'BELL' && !filters.bell) return;

      const coord = fromLonLat([item.longitude, item.latitude]);
      const feature = new Feature({
        geometry: new Point(coord),
        facilityData: item,
      });

      let bgColor = '#3B82F6';
      let symbol = '📷';

      if (item.type === 'STREETLIGHT') {
        bgColor = '#F59E0B';
        symbol = '💡';
      } else if (item.type === 'BELL') {
        bgColor = '#EF4444';
        symbol = '🚨';
      }

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 12,
            fill: new Fill({ color: bgColor }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
          }),
          text: new Text({
            text: symbol,
            font: '11px sans-serif',
            offsetY: 1,
          }),
        })
      );

      facilitySourceRef.current.addFeature(feature);
    });
  }, [facilities, filters]);

  // 4. 안심 대안 경로 vs 최단 지름길 경로 동시 렌더링 & 선택 강조
  useEffect(() => {
    routeSourceRef.current.clear();
    if (!showRoutes || !currentCoords) return;

    const startLng = currentCoords.longitude;
    const startLat = currentCoords.latitude;
    const destCoord = fromLonLat([startLng + 0.0035, startLat + 0.0020]);

    // 1) 안심 우회 경로 (CCTV, 가로등이 많은 큰길 경유)
    const safePathCoords = [
      fromLonLat([startLng, startLat]),
      fromLonLat([startLng + 0.0012, startLat + 0.0008]),
      fromLonLat([startLng + 0.0025, startLat + 0.0014]),
      destCoord,
    ];

    const isSafeSelected = selectedRouteType === 'safe';

    const safeRouteFeature = new Feature({
      geometry: new LineString(safePathCoords),
      routeType: 'safe',
    });
    safeRouteFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: isSafeSelected ? '#10B981' : 'rgba(16, 185, 129, 0.4)',
          width: isSafeSelected ? 7 : 4,
          lineCap: 'round',
        }),
      })
    );

    // 2) 최단 지름길 경로 (어둡고 CCTV 사각지대 골목길 통과)
    const shortestPathCoords = [
      fromLonLat([startLng, startLat]),
      fromLonLat([startLng + 0.0015, startLat + 0.0003]),
      destCoord,
    ];

    const isShortestSelected = selectedRouteType === 'shortest';

    const shortestRouteFeature = new Feature({
      geometry: new LineString(shortestPathCoords),
      routeType: 'shortest',
    });
    shortestRouteFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: isShortestSelected ? '#EF4444' : 'rgba(239, 68, 68, 0.45)',
          width: isShortestSelected ? 6 : 3,
          lineDash: [8, 6],
          lineCap: 'round',
        }),
      })
    );

    // 3) 목적지 도착 깃발 마커
    const destFeature = new Feature({
      geometry: new Point(destCoord),
    });
    destFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: '#8B5CF6' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
        }),
        text: new Text({
          text: '🏁',
          font: '13px sans-serif',
          offsetY: -15,
        }),
      })
    );

    // 선택되지 않은 경로를 먼저 깔고, 선택된 경로를 위에 표시
    if (isSafeSelected) {
      routeSourceRef.current.addFeatures([shortestRouteFeature, safeRouteFeature, destFeature]);
    } else {
      routeSourceRef.current.addFeatures([safeRouteFeature, shortestRouteFeature, destFeature]);
    }
  }, [showRoutes, selectedRouteType, currentCoords]);

  return (
    <div
      ref={mapElement}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
};
