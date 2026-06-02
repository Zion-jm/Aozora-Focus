import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type Country = {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  hint: string;
  maxLen: number;
};

export const COUNTRIES: Country[] = [
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭", hint: "9XX XXX XXXX", maxLen: 10 },
  { name: "Afghanistan", code: "AF", dialCode: "+93", flag: "🇦🇫", hint: "7XX XXX XXX", maxLen: 9 },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺", hint: "4XX XXX XXX", maxLen: 9 },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩", hint: "1XXX XXXXXX", maxLen: 10 },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷", hint: "XX 9XXXX XXXX", maxLen: 11 },
  { name: "Cambodia", code: "KH", dialCode: "+855", flag: "🇰🇭", hint: "1X XXX XXXX", maxLen: 9 },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦", hint: "XXX XXX XXXX", maxLen: 10 },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳", hint: "1XX XXXX XXXX", maxLen: 11 },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬", hint: "1XX XXX XXXX", maxLen: 10 },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷", hint: "6 XX XX XX XX", maxLen: 9 },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪", hint: "1XX XXXXXXXX", maxLen: 11 },
  { name: "Hong Kong", code: "HK", dialCode: "+852", flag: "🇭🇰", hint: "XXXX XXXX", maxLen: 8 },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳", hint: "XXXXX XXXXX", maxLen: 10 },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩", hint: "8XX XXXX XXXX", maxLen: 11 },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹", hint: "3XX XXX XXXX", maxLen: 10 },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵", hint: "80 XXXX XXXX", maxLen: 10 },
  { name: "Laos", code: "LA", dialCode: "+856", flag: "🇱🇦", hint: "20 XX XXX XXX", maxLen: 9 },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾", hint: "1X XXXX XXXX", maxLen: 10 },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽", hint: "XXX XXX XXXX", maxLen: 10 },
  { name: "Myanmar", code: "MM", dialCode: "+95", flag: "🇲🇲", hint: "9X XXX XXXX", maxLen: 9 },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱", hint: "6 XXXX XXXX", maxLen: 9 },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿", hint: "21 XXX XXXX", maxLen: 9 },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬", hint: "803 XXX XXXX", maxLen: 10 },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰", hint: "3XX XXXXXXX", maxLen: 10 },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦", hint: "5X XXX XXXX", maxLen: 9 },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬", hint: "XXXX XXXX", maxLen: 8 },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷", hint: "10 XXXX XXXX", maxLen: 10 },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸", hint: "6XX XXX XXX", maxLen: 9 },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰", hint: "7X XXX XXXX", maxLen: 9 },
  { name: "Taiwan", code: "TW", dialCode: "+886", flag: "🇹🇼", hint: "9XX XXX XXX", maxLen: 9 },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭", hint: "8X XXX XXXX", maxLen: 9 },
  { name: "Timor-Leste", code: "TL", dialCode: "+670", flag: "🇹🇱", hint: "7XXX XXXX", maxLen: 8 },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪", hint: "5X XXX XXXX", maxLen: 9 },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧", hint: "7XXX XXX XXX", maxLen: 10 },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸", hint: "XXX XXX XXXX", maxLen: 10 },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳", hint: "9XX XXX XXXX", maxLen: 9 },
];

export function parsePhone(raw: string): { country: Country; national: string } {
  const ph = COUNTRIES.find((c) => c.code === "PH")!;
  if (!raw) return { country: ph, national: "" };

  const cleaned = raw.replace(/[\s\-()]/g, "");
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dialCode)) {
      return { country: c, national: cleaned.slice(c.dialCode.length) };
    }
  }
  return { country: ph, national: raw };
}

export function buildPhone(country: Country, national: string): string {
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  return `${country.dialCode}${digits}`;
}

type Props = {
  label: string;
  value: string;
  onChange: (full: string) => void;
  colors: any;
  editable?: boolean;
};

export default function PhoneField({ label, value, onChange, colors, editable = true }: Props) {
  const insets = useSafeAreaInsets();
  const parsed = useMemo(() => parsePhone(value), [value]);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [national, setNational] = useState(parsed.national);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const digits = national.replace(/\D/g, "");
  const isValid = digits.length === country.maxLen;
  const hasInput = digits.length > 0;
  const isPHWrong = country.code === "PH" && hasInput && !digits.startsWith("9");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleNationalChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    setNational(digits);
    onChange(buildPhone(country, digits));
  };

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setPickerOpen(false);
    setSearch("");
    onChange(buildPhone(c, national));
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>

      <View
        style={[
          styles.row,
          {
            borderColor: colors.border,
            borderRadius: colors.radius,
            backgroundColor: editable ? colors.card : colors.background,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.countryBtn, { borderRightColor: colors.border }]}
          onPress={() => editable && setPickerOpen(true)}
          activeOpacity={editable ? 0.7 : 1}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.dialCode, { color: colors.foreground }]}>{country.dialCode}</Text>
          {editable && <Feather name="chevron-down" size={14} color={colors.mutedForeground} />}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={national}
          onChangeText={handleNationalChange}
          placeholder={country.hint}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          editable={editable}
          maxLength={country.maxLen + 4}
        />
      </View>

      <View style={styles.hint}>
        {hasInput ? (
          isPHWrong ? (
            <View style={styles.hintRow}>
              <Feather name="x-circle" size={12} color="#ef4444" />
              <Text style={[styles.hintText, { color: "#ef4444" }]}>
                Mobile number is wrong — PH numbers must start with 9
              </Text>
            </View>
          ) : isValid ? (
            <View style={styles.hintRow}>
              <Feather name="check-circle" size={12} color="#10b981" />
              <Text style={[styles.hintText, { color: "#10b981" }]}>Valid format</Text>
            </View>
          ) : (
            <View style={styles.hintRow}>
              <Feather name="alert-circle" size={12} color="#f59e0b" />
              <Text style={[styles.hintText, { color: "#f59e0b" }]}>
                {digits.length < country.maxLen
                  ? `${country.maxLen - digits.length} more digit${country.maxLen - digits.length === 1 ? "" : "s"} needed`
                  : "Too many digits"}
              </Text>
            </View>
          )
        ) : (
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Format: {country.hint} · {country.maxLen} digits
          </Text>
        )}
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => { setPickerOpen(false); setSearch(""); }}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Country</Text>

            <View
              style={[
                styles.searchRow,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search country or dial code..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === country.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.countryRow,
                      { borderBottomColor: colors.border },
                      selected && { backgroundColor: colors.primary + "12" },
                    ]}
                    onPress={() => handleCountrySelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>
                        {item.dialCode} · {item.hint}
                      </Text>
                    </View>
                    {selected && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={{ color: colors.mutedForeground }}>No countries found</Text>
                </View>
              }
            />

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { setPickerOpen(false); setSearch(""); }}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRightWidth: 1,
  },
  flag: { fontSize: 20 },
  dialCode: { fontSize: 15, fontWeight: "600", minWidth: 36 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 12, paddingVertical: 13 },
  hint: { minHeight: 18 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hintText: { fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 0,
    gap: 0,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowFlag: { fontSize: 24 },
  rowName: { fontSize: 15, fontWeight: "500" },
  rowHint: { fontSize: 12, marginTop: 1 },
  emptyList: { padding: 24, alignItems: "center" },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});
