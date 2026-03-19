import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileUpdate } from "@tae/shared";
import type { MeStackParamList } from "../navigation/MeStack";
import { useMyProfile } from "../state/profile";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type Props = NativeStackScreenProps<MeStackParamList, "EditProfile">;

interface FormState {
  full_name: string;
  headline: string;
  program: string;
  grad_year: string;
  current_work: string;
  qualifications: string;
  experience: string;
  skills: string;
}

function profileToForm(
  profile: {
    full_name?: string | null;
    headline?: string | null;
    program?: string | null;
    grad_year?: number | null;
    current_work?: string | null;
    qualifications?: string | null;
    experience?: string | null;
    skills?: string | string[] | null;
  } | null,
): FormState {
  // skills is a text[] column in Supabase — Supabase returns it as string[]
  const rawSkills = profile?.skills;
  const skillsStr = Array.isArray(rawSkills)
    ? rawSkills.join(", ")
    : rawSkills ?? "";

  return {
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    program: profile?.program ?? "",
    grad_year:
      profile?.grad_year != null ? String(profile.grad_year) : "",
    current_work: profile?.current_work ?? "",
    qualifications: profile?.qualifications ?? "",
    experience: profile?.experience ?? "",
    skills: skillsStr,
  };
}

export default function EditProfileScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { profile, loading: profileLoading, refresh } = useMyProfile();
  const [form, setForm] = useState<FormState>(profileToForm(null));
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Prefill form once profile loads
  useEffect(() => {
    if (profile && !initialized) {
      setForm(profileToForm(profile));
      setInitialized(true);
    }
  }, [profile, initialized]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const userId = session?.user.id;
    if (!userId) return;

    setSaving(true);

    // Convert comma-separated skills string to trimmed string[], dropping empties
    const skillsArray = form.skills
      ? form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const update: ProfileUpdate = {
      full_name: form.full_name || undefined,
      headline: form.headline || undefined,
      program: form.program || undefined,
      grad_year: form.grad_year ? Number(form.grad_year) : undefined,
      current_work: form.current_work || undefined,
      qualifications: form.qualifications || undefined,
      experience: form.experience || undefined,
      // Cast to any — DB column is text[] but shared type says string
      skills: (skillsArray.length > 0 ? skillsArray : undefined) as unknown as
        | string
        | undefined,
    };

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", userId);

    setSaving(false);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    await refresh();
    navigation.goBack();
  };

  if (profileLoading && !initialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Field
        label="Full Name"
        value={form.full_name}
        onChangeText={(v) => updateField("full_name", v)}
      />
      <Field
        label="Headline"
        value={form.headline}
        onChangeText={(v) => updateField("headline", v)}
      />
      <Field
        label="Program"
        value={form.program}
        onChangeText={(v) => updateField("program", v)}
      />
      <Field
        label="Graduation Year"
        value={form.grad_year}
        onChangeText={(v) => updateField("grad_year", v)}
        keyboardType="numeric"
      />
      <Field
        label="Current Work"
        value={form.current_work}
        onChangeText={(v) => updateField("current_work", v)}
        multiline
      />
      <Field
        label="Qualifications"
        value={form.qualifications}
        onChangeText={(v) => updateField("qualifications", v)}
        multiline
      />
      <Field
        label="Experience"
        value={form.experience}
        onChangeText={(v) => updateField("experience", v)}
        multiline
      />
      <Field
        label="Skills (comma-separated)"
        value={form.skills}
        onChangeText={(v) => updateField("skills", v)}
        multiline
      />

      <View style={styles.buttonRow}>
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Button title="Save" onPress={handleSave} />
        )}
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 16, paddingBottom: 48 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  buttonRow: { marginTop: 8, alignItems: "center" },
});
