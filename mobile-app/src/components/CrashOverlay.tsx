import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useCrashAlert } from "../hooks/useCrashAlert";
import { crashLocationMessage, callContact, textContact } from "../sos/dispatchSos";
import { loadContacts } from "../sos/contactsStore";
import type { SosContact } from "../sos/contactValidation";

/** Always-mounted (not a routed screen) so a crash alert can interrupt
 *  whatever screen the rider is on, and can't be navigated away from
 *  during the countdown the way a pushed route could be. */
export function CrashOverlay() {
  const { phase, secondsRemaining, event, dismiss } = useCrashAlert();
  const [contacts, setContacts] = useState<SosContact[]>([]);

  useEffect(() => {
    if (phase === "dispatch") {
      loadContacts().then(setContacts).catch(() => setContacts([]));
    }
  }, [phase]);

  if (phase === "idle") {
    return null;
  }

  return (
    <Modal visible transparent={false} animationType="fade">
      <View style={styles.container}>
        {phase === "counting" ? (
          <>
            <Text style={styles.title}>CRASH DETECTED</Text>
            <Text style={styles.countdown}>{secondsRemaining}</Text>
            <Text style={styles.hint}>Press the helmet's PTT button now to cancel</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>SOS</Text>
            <Text style={styles.hint}>
              {event ? crashLocationMessage(event) : "Crash detected - no location available."}
            </Text>

            {contacts.length === 0 ? (
              <Text style={styles.hint}>
                No emergency contacts saved yet - add some from Settings so this screen can call/text
                them directly.
              </Text>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactRow}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      void callContact(contact);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Call</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      void textContact(contact, event ? crashLocationMessage(event) : "Crash detected.");
                    }}
                  >
                    <Text style={styles.actionButtonText}>Text</Text>
                  </Pressable>
                </View>
              ))
            )}

            <Pressable style={styles.dismissButton} onPress={dismiss}>
              <Text style={styles.dismissButtonText}>I'm safe, dismiss</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7a0d0d",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
  },
  countdown: {
    color: "#ffffff",
    fontSize: 96,
    fontWeight: "900",
  },
  hint: {
    color: "#ffe5e5",
    fontSize: 16,
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  contactName: {
    color: "#ffffff",
    fontSize: 18,
    flex: 1,
  },
  actionButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: "#7a0d0d",
    fontWeight: "700",
  },
  dismissButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffe5e5",
  },
  dismissButtonText: {
    color: "#ffe5e5",
    fontSize: 14,
  },
});
