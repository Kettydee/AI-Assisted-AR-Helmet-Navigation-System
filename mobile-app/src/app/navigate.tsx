import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Banner, Button, EmptyState, ListRow, Screen, SectionTitle } from "../components/ui";
import { useRide } from "../hooks/useRide";
import { useSettings } from "../hooks/useSettings";
import { searchPlaces, type Place } from "../nav/osrmClient";
import { formatDistance, haversineMeters, type LatLon } from "../nav/geo";
import { colors, fonts, radius, spacing, TOUCH_TARGET } from "../theme";

export default function NavigateScreen() {
  const router = useRouter();
  const ride = useRide();
  const { settings } = useSettings();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [here, setHere] = useState<LatLon | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    void ride.getCurrentPosition().then(setHere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchPlaces(q, here));
    } catch (e) {
      setSearchError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const go = async (place: Place) => {
    setStartingId(place.id);
    await ride.startRide(place);
    setStartingId(null);
  };

  useEffect(() => {
    if (ride.phase === "active") {
      router.replace("/ride");
    }
  }, [ride.phase, router]);

  return (
    <Screen>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={22} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search a place or address"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          returnKeyType="search"
          autoFocus
          accessibilityLabel="Destination search"
        />
        {searching ? <ActivityIndicator color={colors.accent} /> : null}
      </View>
      <Button label="Search" icon="search" onPress={() => void search()} disabled={query.trim().length < 2} loading={searching} />

      {ride.locationBlocked ? (
        <Banner
          tone="danger"
          title="Location blocked"
          message="Allow location access for this app in system settings to navigate."
          action={<Button label="Open settings" compact onPress={ride.openLocationSettings} />}
        />
      ) : null}
      {ride.error ? <Banner tone="danger" title="Couldn't start" message={ride.error} /> : null}
      {searchError ? <Banner tone="danger" title="Search failed" message={searchError} /> : null}

      {results === null ? (
        <EmptyState
          icon="navigate-circle"
          title="Where are you riding?"
          message="Search for a destination. Turn arrows will appear on your helmet visor and be spoken aloud."
        />
      ) : results.length === 0 ? (
        <EmptyState icon="sad-outline" title="No places found" message="Try a different name or add the city." />
      ) : (
        <>
          <SectionTitle>Results</SectionTitle>
          {results.map((p) => (
            <ListRow
              key={p.id}
              icon="location"
              title={p.name}
              subtitle={
                (here ? `${formatDistance(haversineMeters(here, p.location), settings.units)} away · ` : "") + p.address
              }
              showChevron={false}
              onPress={startingId ? undefined : () => void go(p)}
              right={startingId === p.id ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="navigate" size={22} color={colors.accent} />}
            />
          ))}
        </>
      )}

      <AppText variant="caption" color={colors.textFaint} align="center">
        Routes by OSRM · Search by OpenStreetMap Nominatim
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
});
