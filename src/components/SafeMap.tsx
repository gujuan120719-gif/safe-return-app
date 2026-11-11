import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { LocationCoords, SafetyFacility, MapFilterState, RouteType, DestinationPoint } from '../types';
import { LocateFixed, Plus, Minus } from 'lucide-react';

interface SafeMapProps {
  currentCoords: LocationCoords;
  facilities: SafetyFacility[];
  filters: MapFilterState;
  showRoutes: boolean;
  selectedRouteType: RouteType;
  destination: DestinationPoint | null;
  onFacilityClick?: (facility: SafetyFacility) => void;
  onMapClickToSetDestination?: (coords: { latitude: number; longitude: number }) => void;
}

export const SafeMap: React.FC<SafeMapProps> = ({
  currentCoords,
  facilities,
  filters,
  showRoutes,
  selectedRouteType,
  destination,
  onFacilityClick,
  onMapClickToSetDestination,
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
        zoom: 16,
        maxZoom: 19,
        minZoom: 11,
      }),
      controls: [], // 네이버 지도 전용 커스텀 플로팅 버튼 사용
    });

    // 지도 탭 이벤트: 시설물이 아닌 빈 곳을 터치하면 그 자리가 목적지가 됨!
    map.on('click', (evt) => {
      let clickedFacility = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const facilityData = feature.get('facilityData') as SafetyFacility;
        if (facilityData && onFacilityClick) {
          onFacilityClick(facilityData);
          clickedFacility = true;
        }
      });

      if (!clickedFacility && onMapClickToSetDestination) {
        const lonLat = toLonLat(evt.coordinate);
        onMapClickToSetDestination({
          longitude: lonLat[0],
          latitude: lonLat[1],
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, [vworldKey]);

  // 2. 내 위치 마커 (네이버 지도 스타일 파란 원형 펄스)
  useEffect(() => {
    if (!mapRef.current) return;

    const userCoord = fromLonLat([currentCoords.longitude, currentCoords.latitude]);
    userSourceRef.current.clear();

    const pulseFeature = new Feature(new Point(userCoord));
    pulseFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 16,
          fill: new Fill({ color: 'rgba(3, 199, 90, 0.2)' }),
          stroke: new Stroke({ color: 'rgba(3, 199, 90, 0.6)', width: 1.5 }),
        }),
      })
    );

    const centerDot = new Feature(new Point(userCoord));
    centerDot.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#03C75A' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        }),
      })
    );

    userSourceRef.current.addFeatures([pulseFeature, centerDot]);
  }, [currentCoords]);

  // 3. 시설물 마커 렌더링 (CCTV / 가로등 / 비상벨)
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

      let bgColor = '#2563EB';
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
            radius: 11,
            fill: new Fill({ color: bgColor }),
            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
          }),
          text: new Text({
            text: symbol,
            font: '10px sans-serif',
            offsetY: 1,
          }),
        })
      );

      facilitySourceRef.current.addFeature(feature);
    });
  }, [facilities, filters]);

  // 4. 동적 경로 그리기 (사용자가 찍은 목적지까지 실시간 연결)
  useEffect(() => {
    routeSourceRef.current.clear();

    if (!destination || !showRoutes || !currentCoords) return;

    const startLng = currentCoords.longitude;
    const startLat = currentCoords.latitude;
    const destLng = destination.longitude;
    const destLat = destination.latitude;

    const destCoord = fromLonLat([destLng, destLat]);

    // 1) 목적지 네이버 스타일 빨간 핀 마커
    const destFeature = new Feature({
      geometry: new Point(destCoord),
    });
    destFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: '#F43F5E' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
        }),
        text: new Text({
          text: destination.name,
          font: 'bold 12px Pretendard, sans-serif',
          offsetY: -18,
          fill: new Fill({ color: '#1E293B' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        }),
      })
    );

    // 2) 최단 지름길 (직선 코스)
    const midLng = (startLng + destLng) / 2;
    const midLat = (startLat + destLat) / 2;
    const shortestPathCoords = [
      fromLonLat([startLng, startLat]),
      fromLonLat([midLng, midLat]),
      destCoord,
    ];

    const isShortestSelected = selectedRouteType === 'shortest';
    const shortestRouteFeature = new Feature({
      geometry: new LineString(shortestPathCoords),
    });
    shortestRouteFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: isShortestSelected ? '#F43F5E' : 'rgba(244, 63, 94, 0.35)',
          width: isShortestSelected ? 6 : 3,
          lineDash: [8, 6],
          lineCap: 'round',
        }),
      })
    );

    // 3) 안심 우회로 (가로등/대로변을 거치는 우회 곡선)
    const safePathCoords = [
      fromLonLat([startLng, startLat]),
      fromLonLat([startLng + (destLng - startLng) * 0.3, startLat + (destLat - startLat) * 0.15]),
      fromLonLat([startLng + (destLng - startLng) * 0.6, startLat + (destLat - startLat) * 0.85]),
      destCoord,
    ];

    const isSafeSelected = selectedRouteType === 'safe';
    const safeRouteFeature = new Feature({
      geometry: new LineString(safePathCoords),
    });
    safeRouteFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: isSafeSelected ? '#03C75A' : 'rgba(3, 199, 90, 0.35)',
          width: isSafeSelected ? 7 : 4,
          lineCap: 'round',
        }),
      })
    );

    if (isSafeSelected) {
      routeSourceRef.current.addFeatures([shortestRouteFeature, safeRouteFeature, destFeature]);
    } else {
      routeSourceRef.current.addFeatures([safeRouteFeature, shortestRouteFeature, destFeature]);
    }

    // 목적지가 찍히면 내 위치와 목적지 중간으로 카메라 이동
    if (mapRef.current) {
      mapRef.current.getView().animate({
        center: fromLonLat([(startLng + destLng) / 2, (startLat + destLat) / 2]),
        duration: 500,
      });
    }
  }, [destination, showRoutes, selectedRouteType, currentCoords]);

  // 플로팅 지도 컨트롤 핸들러
  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.getView().animate({
      center: fromLonLat([currentCoords.longitude, currentCoords.latitude]),
      zoom: 17,
      duration: 400,
    });
  };

  const handleZoom = (delta: number) => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const currentZoom = view.getZoom() || 16;
    view.animate({
      zoom: currentZoom + delta,
      duration: 200,
    });
  };

  return (
    <div className="map-wrapper">
      <div ref={mapElement} className="ol-map-container" />

      {/* 네이버 지도 스타일 우측 플로팅 컨트롤 (현재 위치 & 줌) */}
      <div className="naver-map-controls">
        <button className="naver-ctrl-btn" onClick={handleRecenter} title="내 위치로 이동">
          <LocateFixed size={18} color="#1E293B" />
        </button>
        <div className="zoom-btn-group">
          <button className="naver-ctrl-btn zoom-top" onClick={() => handleZoom(1)} title="확대">
            <Plus size={16} color="#1E293B" />
          </button>
          <button className="naver-ctrl-btn zoom-bottom" onClick={() => handleZoom(-1)} title="축소">
            <Minus size={16} color="#1E293B" />
          </button>
        </div>
      </div>
    </div>
  );
};
