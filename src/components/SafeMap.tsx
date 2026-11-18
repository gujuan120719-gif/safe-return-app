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
  hasRealGps: boolean;
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
  hasRealGps,
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
  const isFirstGpsCenteredRef = useRef(false);

  // 브이월드 키 자동 인식 (언더바 여부 상관없이 모두 지원)
  const vworldKey = import.meta.env.VITE_VWORLD_API_KEY || (import.meta.env as any).VITEVWORLDAPIKEY;

  // 1. 지도 인스턴스 초기화
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
        minZoom: 10,
      }),
      controls: [],
    });

    // 지도 터치 시 해당 좌표를 목적지로 지정
    map.on('singleclick', (evt) => {
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

  // 2. 실제 GPS 위치 획득 시: 서울에 멈춰있지 않고 사용자의 실제 위치로 즉시 자동 카메라 이동!
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

    // 첫 실제 GPS 감지 시 또는 사용자가 다른 지역에 있을 때 지도를 해당 지역으로 자동 이동!
    if (hasRealGps && !isFirstGpsCenteredRef.current) {
      isFirstGpsCenteredRef.current = true;
      mapRef.current.getView().animate({
        center: userCoord,
        zoom: 16,
        duration: 800,
      });
    }
  }, [currentCoords, hasRealGps]);

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

  // 4. 보행자 전용 도로망 궤적 렌더링 (차도/고속도로 배제)
  useEffect(() => {
    routeSourceRef.current.clear();

    if (!destination || !showRoutes || !currentCoords) return;

    const destCoord = fromLonLat([destination.longitude, destination.latitude]);

    // 목적지 핀 마커
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

    if (routeData) {
      const isSafeSelected = selectedRouteType === 'safe';

      // 1) 최단 지름길 (보행자 골목길)
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

      // 2) 안심 우회로 (가로등/CCTV 밀집 보행로)
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

      // 화면에 출발지와 목적지 전체가 적절히 들어오도록 자동 줌
      if (mapRef.current) {
        const extent = routeSourceRef.current.getExtent();
        if (extent && isFinite(extent[0])) {
          mapRef.current.getView().fit(extent, {
            padding: [90, 40, 220, 40],
            duration: 500,
            maxZoom: 17,
          });
        }
      }
    } else {
      routeSourceRef.current.addFeature(destFeature);
    }
  }, [destination, routeData, showRoutes, selectedRouteType, currentCoords]);

  // 플로팅 내 위치 바로가기
  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.getView().animate({
      center: fromLonLat([currentCoords.longitude, currentCoords.latitude]),
      zoom: 16,
      duration: 500,
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

      {/* 우측 플로팅 컨트롤 */}
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
