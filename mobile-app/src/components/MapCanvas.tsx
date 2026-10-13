import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { colors, radius, spacing } from "../theme";
import type { LatLon } from "../nav/geo";

export interface MapCanvasProps {
  riderPosition: LatLon | null;
  destination: { lat: number; lon: number; name?: string } | null;
  routeCoordinates?: LatLon[];
  bearing?: number | null;
  interactive?: boolean;
  style?: object;
}

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0B1220; overflow: hidden; font-family: sans-serif; }
    .rider-marker {
      width: 22px;
      height: 22px;
      background: #00E5FF;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 16px #00E5FF, 0 0 4px #000;
      position: relative;
    }
    .rider-pulse {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: rgba(0, 229, 255, 0.25);
      animation: pulse 1.8s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .dest-marker {
      width: 24px;
      height: 24px;
      background: #10B981;
      border: 2px solid #FFF;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 0 12px #10B981;
    }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map, riderMarker, destMarker, routePolyline;
    var followRider = true;

    function initMap() {
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      map.on('dragstart', function() {
        followRider = false;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'drag' }));
        }
      });
    }

    var riderIcon = L.divIcon({
      className: '',
      html: '<div class="rider-marker"><div class="rider-pulse"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    var destIcon = L.divIcon({
      className: '',
      html: '<div class="dest-marker">&#9873;</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    function updateRider(lat, lon) {
      if (!map) return;
      var pos = [lat, lon];
      if (!riderMarker) {
        riderMarker = L.marker(pos, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
        if (followRider) map.setView(pos, 16);
      } else {
        riderMarker.setLatLng(pos);
        if (followRider) map.panTo(pos, { animate: true, duration: 0.5 });
      }
    }

    function updateDestination(lat, lon) {
      if (!map) return;
      var pos = [lat, lon];
      if (!destMarker) {
        destMarker = L.marker(pos, { icon: destIcon }).addTo(map);
      } else {
        destMarker.setLatLng(pos);
      }
    }

    function setRoute(coords) {
      if (!map) return;
      if (routePolyline) { map.removeLayer(routePolyline); }
      if (coords && coords.length > 0) {
        routePolyline = L.polyline(coords, {
          color: '#00E5FF',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round'
        }).addTo(map);
        if (!riderMarker) {
          map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });
        }
      }
    }

    function setFollow(enabled) {
      followRider = enabled;
      if (enabled && riderMarker) {
        map.setView(riderMarker.getLatLng(), 16, { animate: true });
      }
    }

    function zoomIn() { if (map) map.zoomIn(); }
    function zoomOut() { if (map) map.zoomOut(); }

    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'update_rider') updateRider(msg.lat, msg.lon);
        else if (msg.type === 'update_dest') updateDestination(msg.lat, msg.lon);
        else if (msg.type === 'set_route') setRoute(msg.coords);
        else if (msg.type === 'set_follow') setFollow(msg.enabled);
        else if (msg.type === 'zoom_in') zoomIn();
        else if (msg.type === 'zoom_out') zoomOut();
      } catch (err) {}
    });

    document.addEventListener("DOMContentLoaded", initMap);
    setTimeout(initMap, 100);
  </script>
</body>
</html>
`;

export function MapCanvas({
  riderPosition,
  destination,
  routeCoordinates,
  interactive = true,
  style,
}: MapCanvasProps) {
  const webViewRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [following, setFollowing] = useState(true);

  const post = (msg: object) => {
    webViewRef.current?.postMessage(JSON.stringify(msg));
  };

  useEffect(() => {
    if (!loaded) return;
    if (riderPosition) {
      post({ type: "update_rider", lat: riderPosition.lat, lon: riderPosition.lon });
    }
  }, [riderPosition, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (destination) {
      post({ type: "update_dest", lat: destination.lat, lon: destination.lon });
    }
  }, [destination, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (routeCoordinates && routeCoordinates.length > 0) {
      post({
        type: "set_route",
        coords: routeCoordinates.map((c) => [c.lat, c.lon]),
      });
    }
  }, [routeCoordinates, loaded]);

  const toggleFollow = () => {
    const next = !following;
    setFollowing(next);
    post({ type: "set_follow", enabled: next });
  };

  const handleZoomIn = () => post({ type: "zoom_in" });
  const handleZoomOut = () => post({ type: "zoom_out" });

  const WebViewComponent = WebView as any;

  return (
    <View style={[styles.container, style]}>
      <WebViewComponent
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: MAP_HTML }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={interactive}
        onLoadEnd={() => {
          setLoaded(true);
          if (riderPosition) post({ type: "update_rider", lat: riderPosition.lat, lon: riderPosition.lon });
          if (destination) post({ type: "update_dest", lat: destination.lat, lon: destination.lon });
          if (routeCoordinates && routeCoordinates.length > 0) {
            post({ type: "set_route", coords: routeCoordinates.map((c) => [c.lat, c.lon]) });
          }
        }}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "drag") setFollowing(false);
          } catch {}
        }}
      />

      {!loaded ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="caption" color={colors.textMuted} style={styles.loadingText}>
            Loading map canvas...
          </AppText>
        </View>
      ) : null}

      {interactive ? (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.btn, following && styles.btnActive]}
            onPress={toggleFollow}
            accessibilityLabel="Recenter on rider"
          >
            <Ionicons name="locate" size={20} color={following ? colors.accent : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleZoomIn} accessibilityLabel="Zoom in">
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleZoomOut} accessibilityLabel="Zoom out">
            <Ionicons name="remove" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    letterSpacing: 1,
  },
  controls: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "rgba(11, 18, 32, 0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
});
