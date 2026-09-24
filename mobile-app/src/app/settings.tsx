import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadContacts, saveContacts, isValidPhone } from "../sos/contactsStore";
import type { SosContact } from "../sos/contactValidation";

/**
 * Local, on-device emergency contacts (see contactsStore.ts). Syncing these
 * with website/supabase_schema.sql's sos_contacts table needs this app to
 * have its own Supabase auth, which it doesn't yet - see README.md's Next
 * section.
 */
export default function SettingsScreen() {
  const [contacts, setContacts] = useState<SosContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadContacts()
      .then(setContacts)
      .finally(() => setLoaded(true));
  }, []);

  const persist = async (next: SosContact[]) => {
    setContacts(next);
    await saveContacts(next);
  };

  const addContact = async () => {
    if (!name.trim() || !isValidPhone(phone)) {
      return;
    }
    const contact: SosContact = { id: `${Date.now()}`, name: name.trim(), phone: phone.trim() };
    await persist([...contacts, contact]);
    setName("");
    setPhone("");
  };

  const removeContact = async (id: string) => {
    await persist(contacts.filter((c) => c.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Emergency contacts</Text>
      <Text style={styles.hint}>
        Shown on the SOS screen if a crash is detected and not cancelled in time, so whoever has the
        phone can call or text them in one tap.
      </Text>

      {loaded && contacts.length === 0 ? <Text style={styles.hint}>No contacts saved yet.</Text> : null}

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.contactRow}>
            <View>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
            <Pressable onPress={() => void removeContact(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor="#6b7280"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        {phone.length > 0 && !isValidPhone(phone) ? (
          <Text style={styles.errorText}>That doesn't look like a valid phone number.</Text>
        ) : null}
        <Pressable
          style={[styles.addButton, (!name.trim() || !isValidPhone(phone)) && styles.addButtonDisabled]}
          disabled={!name.trim() || !isValidPhone(phone)}
          onPress={() => void addContact()}
        >
          <Text style={styles.addButtonText}>Add contact</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  hint: {
    color: "#9ca3af",
    fontSize: 13,
  },
  list: {
    flexGrow: 0,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161f33",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  contactName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  contactPhone: {
    color: "#9ca3af",
    fontSize: 13,
  },
  removeText: {
    color: "#f87171",
    fontSize: 13,
  },
  form: {
    marginTop: "auto",
    gap: 10,
    paddingTop: 12,
  },
  input: {
    backgroundColor: "#161f33",
    color: "#ffffff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#1f2937",
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
