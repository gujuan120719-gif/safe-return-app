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
import { DualRouteResult } from '../services/pedestrianRouting';
import { LocateFixed, Plus, Minus } from 'lucide-react';

interface SafeMapProps {
  currentCoords: LocationCoords;
  facilities: SafetyFacility[];
  filters: MapFilterState;
  showRoutes: boolean;
  selectedRouteType: RouteType;
  destination: DestinationPoint | null;
  routeData: DualRouteResult | null;
  isLoadingRoute: boolean;
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
  routeData,
  isLoadingRoute,
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
      controls: [], // 오리지널 커스텀 플로팅 버튼 사용
    });

    // 모바일 터치 오작동을 줄이기 위해 singleclick 이벤트 사용
    map.on('singleclick', (evt) => {
      let clickedFacility = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const facilityData = feature.get('facilityData') as SafetyFacility;
        if (facilityData && onFacilityClick) {
          onFacilityClick(facilityData);
          clickedFacility = true;
        }
      });

      // 시설물을 클릭한 것이 아닐 때 -> 터치한 좌표를 새로운 목적지로 지정
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

  // 2. 내 현재 위치 마커 (깔끔한 블루 펄스 링)
  useEffect(() => {
    if (!mapRef.current) return;

    const userCoord = fromLonLat([currentCoords.longitude, currentCoords.latitude]);
    userSourceRef.current.clear();

    const pulseFeature = new Feature(new Point(userCoord));
    pulseFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 16,
          fill: new Fill({ color: 'rgba(37, 99, 235, 0.18)' }),
          stroke: new Stroke({ color: 'rgba(37, 99, 235, 0.5)', width: 1.5 }),
        }),
      })
    );

    const centerDot = new Feature(new Point(userCoord));
    centerDot.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#2563EB' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
        }),
      })
    );

    userSourceRef.current.addFeatures([pulseFeature, centerDot]);
  }, [currentCoords]);

  // 3. 방범 시설물 마커 렌더링 (CCTV / 가로등 / 비상벨)
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

  // 4. 실제 도로망(보행로)을 따라 꺾어지는 진짜 경로 렌더링
  useEffect(() => {
    routeSourceRef.current.clear();

    if (!destination || !showRoutes || !currentCoords) return;

    const destCoord = fromLonLat([destination.longitude, destination.latitude]);

    // 1) 목적지 오리지널 핀 마커
    const destFeature = new Feature({
      geometry: new Point(destCoord),
    });
    destFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: '#E11D48' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
        }),
        text: new Text({
          text: destination.name,
          font: 'bold 12px Pretendard, sans-serif',
          offsetY: -18,
          fill: new Fill({ color: '#0F172A' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 3 }),
        }),
      })
    );

    // 2) 실제 도로망 궤적이 준비되었을 때 도로선을 따라 그리기
    if (routeData) {
      const isSafeSelected = selectedRouteType === 'safe';

      // 최단 지름길 (실제 도로 보행 궤적)
      const shortestCoords = routeData.shortestRoute.coordinates.map((c) => fromLonLat(c));
      const shortestRouteFeature = new Feature({
        geometry: new LineString(shortestCoords),
      });
      shortestRouteFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: !isSafeSelected ? '#E11D48' : 'rgba(225, 29, 72, 0.35)',
            width: !isSafeSelected ? 6 : 3,
            lineDash: [8, 6],
            lineCap: 'round',
          }),
        })
      );

      // 안심 우회로 (안전시설물 밀집 및 큰길 위주 실제 도로 궤적)
      const safeCoords = routeData.safeRoute.coordinates.map((c) => fromLonLat(c));
      const safeRouteFeature = new Feature({
        geometry: new LineString(safeCoords),
      });
      safeRouteFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: isSafeSelected ? '#059669' : 'rgba(5, 150, 105, 0.35)',
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

      // 화면에 출발지와 목적지 경로 전체가 예쁘게 들어오도록 자동 줌 맞춤
      if (mapRef.current) {
        const extent = routeSourceRef.current.getExtent();
        if (extent && isFinite(extent[0])) {
          mapRef.current.getView().fit(extent, {
            padding: [90, 40, 200, 40],
            duration: 600,
            maxZoom: 17,
          });
        }
      }
    } else {
      // 로딩 중일 때는 목적지 핀만 먼저 표시
      routeSourceRef.current.addFeature(destFeature);
    }
  }, [destination, routeData, showRoutes, selectedRouteType, currentCoords]);

  // 플로팅 컨트롤
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

      {/* 우측 플로팅 컨트롤 (현재 위치 & 줌) */}
      <div className="original-map-controls">
        <button className="original-ctrl-btn" onClick={handleRecenter} title="내 위치로 이동">
          <LocateFixed size={18} color="#0F172A" />
        </button>
        <div className="zoom-btn-group">
          <button className="original-ctrl-btn zoom-top" onClick={() => handleZoom(1)} title="확대">
            <Plus size={16} color="#0F172A" />
          </button>
          <button className="original-ctrl-btn zoom-bottom" onClick={() => handleZoom(-1)} title="축소">
            <Minus size={16} color="#0F172A" />
          </button>
        </div>
      </div>
    </div>
  );
};
