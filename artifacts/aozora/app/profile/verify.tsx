import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  Modal,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { ActionSheet } from "@/components/ActionSheet";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  useSubmitVerification,
  useUpdateProfile,
  customFetch,
} from "@workspace/api-client-react";
import type { VerificationRecord } from "@workspace/api-client-react";
import PhoneField, { parsePhone, buildPhone, type Country } from "@/components/PhoneField";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const ID_TYPES = [
  "National ID",
  "Passport",
  "Driver's License",
  "PhilSys ID",
  "Student ID",
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatBirthday(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function BirthdayPickerField({
  label,
  value,
  onChange,
  colors,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: any;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ageError, setAgeError] = useState(false);

  const today = new Date();
  const maxYear = today.getFullYear() - 18;
  const maxMonth = today.getMonth() + 1;
  const maxDay = today.getDate();

  const isUnder18 = (year: number, month: number, day: number) => {
    if (year > maxYear) return true;
    if (year === maxYear && month > maxMonth) return true;
    if (year === maxYear && month === maxMonth && day > maxDay) return true;
    return false;
  };

  const initFromValue = () => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) return { year: y, month: m, day: d };
    }
    return { year: maxYear, month: maxMonth, day: maxDay };
  };

  const [tempDate, setTempDate] = useState(initFromValue);

  const openPicker = () => {
    setTempDate(initFromValue());
    setAgeError(false);
    setOpen(true);
  };

  const confirm = () => {
    const clampedDay = Math.min(tempDate.day, daysInMonth(tempDate.year, tempDate.month));
    if (isUnder18(tempDate.year, tempDate.month, clampedDay)) {
      setAgeError(true);
      return;
    }
    const mm = String(tempDate.month).padStart(2, "0");
    const dd = String(clampedDay).padStart(2, "0");
    onChange(`${tempDate.year}-${mm}-${dd}`);
    setAgeError(false);
    setOpen(false);
  };

  const prevMonth = () => {
    setAgeError(false);
    setTempDate((d) => {
      if (d.month === 1) return { ...d, month: 12, year: d.year - 1 };
      return { ...d, month: d.month - 1 };
    });
  };

  const nextMonth = () => {
    setAgeError(false);
    setTempDate((d) => {
      const nextM = d.month === 12 ? 1 : d.month + 1;
      const nextY = d.month === 12 ? d.year + 1 : d.year;
      if (nextY > maxYear || (nextY === maxYear && nextM > maxMonth)) return d;
      return { ...d, month: nextM, year: nextY };
    });
  };

  const prevYear = () => {
    setAgeError(false);
    setTempDate((d) => ({ ...d, year: d.year - 1 }));
  };

  const nextYear = () => {
    setAgeError(false);
    setTempDate((d) => {
      if (d.year >= maxYear) return d;
      return { ...d, year: d.year + 1 };
    });
  };

  const totalDays = daysInMonth(tempDate.year, tempDate.month);
  const firstDow = new Date(tempDate.year, tempDate.month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = (() => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (y === tempDate.year && m === tempDate.month) return d;
    return null;
  })();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
        {required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={openPicker}
        style={[
          styles.input,
          styles.datePickerRow,
          { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
        activeOpacity={0.7}
      >
        <Feather name="calendar" size={16} color={value ? colors.foreground : colors.mutedForeground} />
        <Text
          style={[
            styles.datePickerText,
            { color: value ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {value ? formatBirthday(value) : "Select your birthday"}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.dpBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.dpCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 4 },
            ]}
            onPress={() => {}}
          >
            <View style={styles.dpHeader}>
              <TouchableOpacity onPress={prevYear} style={styles.dpNavBtn}>
                <Feather name="chevrons-left" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={prevMonth} style={styles.dpNavBtn}>
                <Feather name="chevron-left" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.dpHeaderTitle, { color: colors.foreground }]}>
                {MONTHS[tempDate.month - 1]} {tempDate.year}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.dpNavBtn}>
                <Feather name="chevron-right" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextYear} style={styles.dpNavBtn}>
                <Feather name="chevrons-right" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.dpDowRow}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                <Text key={d} style={[styles.dpDowLabel, { color: colors.mutedForeground }]}>{d}</Text>
              ))}
            </View>

            <View style={styles.dpGrid}>
              {cells.map((day, idx) => {
                const isSelected = day !== null && day === selectedDay;
                const isToday =
                  day !== null &&
                  tempDate.year === today.getFullYear() &&
                  tempDate.month === today.getMonth() + 1 &&
                  day === today.getDate();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dpCell,
                      isSelected && { backgroundColor: colors.primary, borderRadius: 20 },
                    ]}
                    onPress={() => day && setTempDate((d) => ({ ...d, day }))}
                    disabled={!day}
                    activeOpacity={0.7}
                  >
                    {day !== null && (
                      <Text
                        style={[
                          styles.dpCellText,
                          { color: isSelected ? "#fff" : isToday ? colors.primary : colors.foreground },
                          isToday && !isSelected && { fontWeight: "700" },
                        ]}
                      >
                        {day}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {ageError && (
              <View style={styles.dpAgeError}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.dpAgeErrorText}>
                  You must be at least 18 years old to verify.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.dpConfirmBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={confirm}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.dpConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

type Step = "personal" | "id";

interface PersonalInfo {
  fullName: string;
  phone: string;
  email: string;
  universityOrWorkplace: string;
  birthday: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  colors,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  multiline?: boolean;
  colors: any;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
        {required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.foreground,
            backgroundColor: colors.card,
            borderRadius: colors.radius,
          },
          multiline && { height: 80, textAlignVertical: "top" },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      />
      {hint && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>
      )}
    </View>
  );
}

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const handleAppeal = () => {
    router.push("/help-center?type=appeal_rejection");
  };

  const [step, setStep] = useState<Step>("personal");

  const parsedPhone = parsePhone(user?.phone ?? "");
  const [phoneCountry, setPhoneCountry] = useState<Country>(parsedPhone.country);
  const [phoneNational, setPhoneNational] = useState(parsedPhone.national);

  const parsedEmergency = parsePhone(user?.emergencyContactPhone ?? "");
  const [emergencyCountry, setEmergencyCountry] = useState<Country>(parsedEmergency.country);
  const [emergencyNational, setEmergencyNational] = useState(parsedEmergency.national);

  const [info, setInfo] = useState<PersonalInfo>({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    universityOrWorkplace: user?.universityOrWorkplace ?? "",
    birthday: user?.birthday ?? "",
    emergencyContactName: user?.emergencyContactName ?? "",
    emergencyContactPhone: user?.emergencyContactPhone ?? "",
  });
  const [idType, setIdType] = useState(ID_TYPES[0]!);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const verificationStatus = user?.verificationStatus;
  const isVerified = verificationStatus === "verified";
  const isPending = verificationStatus === "pending";
  const isRejected = verificationStatus === "rejected";
  const [canResubmit, setCanResubmit] = useState(false);

  const { data: latestRecord } = useQuery<VerificationRecord | null>({
    queryKey: ["my-verification", user?.id],
    queryFn: () => customFetch<VerificationRecord | null>("/api/users/me/verification"),
    enabled: !!user && isRejected,
  });

  const updateProfile = useUpdateProfile();
  const submitVerification = useSubmitVerification({
    mutation: {
      onSuccess: () => {
        updateUser({ ...user!, verificationStatus: "pending" });
        setCanResubmit(false);
        toast.success("Submitted!", "Your identity verification is under review. We'll notify you once it's approved.");
        router.back();
      },
      onError: () =>
        toast.error("Error", "Could not submit verification. Try again."),
    },
  });

  const updateField = (key: keyof PersonalInfo) => (val: string) =>
    setInfo((prev) => ({ ...prev, [key]: val }));

  const fullPhone = buildPhone(phoneCountry, phoneNational);
  const fullEmergency = buildPhone(emergencyCountry, emergencyNational);

  const personalInfoComplete =
    info.fullName.trim() &&
    (fullPhone || info.email.trim()) &&
    info.emergencyContactName.trim() &&
    fullEmergency;

  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  const handleNextStep = () => {
    if (!personalInfoComplete) {
      toast.warning("Missing info", "Please fill in your name, contact (phone or email), and emergency contact before continuing.");
      return;
    }
    updateProfile.mutate(
      {
        data: {
          fullName: info.fullName,
          phone: fullPhone || undefined,
          birthday: info.birthday || undefined,
          universityOrWorkplace: info.universityOrWorkplace || undefined,
          emergencyContactName: info.emergencyContactName || undefined,
          emergencyContactPhone: fullEmergency || undefined,
        },
      },
      {
        onSuccess: (data) => {
          updateUser(data);
          setStep("id");
        },
        onError: () =>
          toast.error("Error", "Could not save your information. Try again."),
      }
    );
  };

  const requestPermission = async (type: "camera" | "gallery") => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        toast.warning("Permission Required", "Camera access is needed to take a photo of your ID.");
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.warning("Permission Required", "Photo library access is needed to select your ID.");
        return false;
      }
    }
    return true;
  };

  const pickFromGallery = async () => {
    if (!(await requestPermission("gallery"))) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const takePhoto = async () => {
    if (!(await requestPermission("camera"))) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleSubmit = () => {
    if (!imageUri) return;
    const idImageUrl = imageBase64
      ? `data:image/jpeg;base64,${imageBase64}`
      : imageUri;
    submitVerification.mutate({ data: { idType, idImageUrl } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => (step === "id" ? setStep("personal") : router.back())}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Identity Verification
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!isVerified && !isPending && (
        <View style={[styles.steps, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(["personal", "id"] as Step[]).map((s, i) => {
            const active = step === s;
            const done = step === "id" && s === "personal";
            return (
              <View key={s} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: done
                        ? "#10b981"
                        : active
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {done ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: active ? colors.primary : done ? "#10b981" : colors.mutedForeground,
                      fontWeight: active ? "700" : "400",
                    },
                  ]}
                >
                  {s === "personal" ? "Personal Info" : "ID Document"}
                </Text>
              </View>
            );
          })}
          <View
            style={[
              styles.stepLine,
              { backgroundColor: step === "id" ? "#10b981" : colors.border },
            ]}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
      >
        {isVerified ? (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: "#10b98115", borderRadius: colors.radius },
            ]}
          >
            <Ionicons name="checkmark-circle" size={56} color="#10b981" />
            <Text style={[styles.statusTitle, { color: "#10b981" }]}>
              Identity Verified
            </Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              Your identity has been verified. You can now access all platform features.
            </Text>
          </View>
        ) : isPending ? (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: "#f59e0b15", borderRadius: colors.radius },
            ]}
          >
            <Feather name="clock" size={56} color="#f59e0b" />
            <Text style={[styles.statusTitle, { color: "#f59e0b" }]}>
              Under Review
            </Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              Your ID is being reviewed. This usually takes 1–2 business days.
            </Text>
          </View>
        ) : isRejected && !canResubmit ? (
          <>
            <View
              style={[
                styles.statusCard,
                { backgroundColor: "#ef444415", borderRadius: colors.radius },
              ]}
            >
              <Feather name="x-circle" size={56} color="#ef4444" />
              <Text style={[styles.statusTitle, { color: "#ef4444" }]}>
                Verification Rejected
              </Text>
              <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                Your ID submission was not approved. Review the reason below and resubmit with a clearer photo or the correct document.
              </Text>
            </View>

            {latestRecord?.reviewNote ? (
              <View
                style={[
                  styles.rejectionReasonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: "#ef444440",
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.rejectionReasonHeader}>
                  <Feather name="message-circle" size={16} color="#ef4444" />
                  <Text style={[styles.rejectionReasonLabel, { color: "#ef4444" }]}>
                    Reason from reviewer
                  </Text>
                </View>
                <Text style={[styles.rejectionReasonText, { color: colors.foreground }]}>
                  {latestRecord.reviewNote}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.rejectionReasonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.rejectionReasonHeader}>
                  <Feather name="info" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.rejectionReasonLabel, { color: colors.mutedForeground }]}>
                    No specific reason provided
                  </Text>
                </View>
                <Text style={[styles.rejectionReasonText, { color: colors.mutedForeground }]}>
                  Please make sure your ID photo is clear, well-lit, and shows all four corners of the document.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.resubmitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
              onPress={() => {
                setStep("personal");
                setCanResubmit(true);
              }}
            >
              <Feather name="refresh-cw" size={18} color="#fff" />
              <Text style={styles.resubmitBtnText}>Resubmit Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.appealVerifyBtn,
                { borderColor: "#ef444460", borderRadius: colors.radius },
              ]}
              onPress={handleAppeal}
              activeOpacity={0.8}
            >
              <Feather name="message-circle" size={18} color="#ef4444" />
              <Text style={styles.appealVerifyBtnText}>Appeal to Admin</Text>
            </TouchableOpacity>
          </>
        ) : step === "personal" ? (
          <>
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.primary + "12", borderRadius: colors.radius },
              ]}
            >
              <Feather name="shield" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                First, confirm your personal details. This information helps dorm owners and admins know who you are.
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              BASIC INFORMATION
            </Text>

            <Field label="Full Name" value={info.fullName} onChange={updateField("fullName")} placeholder="e.g. Ana Dela Cruz" colors={colors} required />
            <PhoneField
              label="Phone Number"
              value={fullPhone}
              onChange={(full) => {
                const p = parsePhone(full);
                setPhoneCountry(p.country);
                setPhoneNational(p.national);
              }}
              colors={colors}
            />
            <Field label="Email Address" value={info.email} onChange={updateField("email")} placeholder="you@example.com" keyboardType="email-address" colors={colors} />
            <Field label="University / Workplace" value={info.universityOrWorkplace} onChange={updateField("universityOrWorkplace")} placeholder="e.g. Quezon National High School" colors={colors} />
            <BirthdayPickerField
              label="Birthday"
              value={info.birthday}
              onChange={updateField("birthday")}
              colors={colors}
            />
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>
              EMERGENCY CONTACT
            </Text>

            <Field label="Contact Person Name" value={info.emergencyContactName} onChange={updateField("emergencyContactName")} placeholder="e.g. Maria Dela Cruz" colors={colors} required />
            <PhoneField
              label="Contact Person Phone"
              value={fullEmergency}
              onChange={(full) => {
                const p = parsePhone(full);
                setEmergencyCountry(p.country);
                setEmergencyNational(p.national);
              }}
              colors={colors}
            />

            <View
              style={[
                styles.privacyCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <View style={styles.privacyHeader}>
                <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />
                <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
                  Data Privacy Notice
                </Text>
              </View>
              <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                Your personal information is collected and processed in accordance with Republic Act No. 10173 (Data Privacy Act of 2012). It is used solely for identity verification and platform safety purposes, viewed only by authorized Aozora administrators, and will not be shared with third parties. By proceeding, you consent to this processing.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                (!personalInfoComplete || updateProfile.isPending) && { opacity: 0.5 },
              ]}
              disabled={!personalInfoComplete || updateProfile.isPending}
              onPress={handleNextStep}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Continue to ID Upload</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.primary + "12", borderRadius: colors.radius },
              ]}
            >
              <Feather name="credit-card" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Upload a clear photo of a valid government-issued ID. Make sure all text is readable.
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>ID Type *</Text>
            <View style={styles.idTypeList}>
              {ID_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.idTypeBtn,
                    {
                      borderColor: idType === type ? colors.primary : colors.border,
                      backgroundColor: idType === type ? colors.primary + "15" : colors.card,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => setIdType(type)}
                >
                  {idType === type ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  ) : (
                    <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                  )}
                  <Text
                    style={[
                      styles.idTypeName,
                      { color: idType === type ? colors.primary : colors.foreground },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              ID Photo *
            </Text>

            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={[
                    styles.previewImage,
                    { borderRadius: colors.radius, borderColor: colors.border },
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.retakeBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => setShowPhotoSheet(true)}
                >
                  <Feather name="refresh-cw" size={15} color={colors.foreground} />
                  <Text style={[styles.retakeBtnText, { color: colors.foreground }]}>
                    Retake / Change Photo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.primary,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={takePhoto}
                  activeOpacity={0.8}
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="camera" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBtnTitle, { color: colors.foreground }]}>
                    Take Photo
                  </Text>
                  <Text style={[styles.uploadBtnSub, { color: colors.mutedForeground }]}>
                    Use camera
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.primary,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={pickFromGallery}
                  activeOpacity={0.8}
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="image" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBtnTitle, { color: colors.foreground }]}>
                    From Gallery
                  </Text>
                  <Text style={[styles.uploadBtnSub, { color: colors.mutedForeground }]}>
                    Choose existing
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.privacyCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <View style={styles.privacyHeader}>
                <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />
                <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
                  Data Privacy Notice
                </Text>
              </View>
              <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                Your ID image is collected solely for identity verification under RA 10173. It is viewed only by authorized admins, not shared with third parties, and retained securely for compliance. By submitting, you consent to this processing.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                (!imageUri || submitVerification.isPending) && { opacity: 0.5 },
              ]}
              disabled={!imageUri || submitVerification.isPending}
              onPress={handleSubmit}
            >
              {submitVerification.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Submit for Review</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ActionSheet
        visible={showPhotoSheet}
        title="Change Photo"
        message="Choose how to update your ID photo."
        items={[
          { label: "Take Photo", icon: "camera" as const, onPress: () => { setShowPhotoSheet(false); takePhoto(); } },
          { label: "Choose from Gallery", icon: "image" as const, onPress: () => { setShowPhotoSheet(false); pickFromGallery(); } },
        ]}
        onClose={() => setShowPhotoSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 0,
    borderBottomWidth: 1,
    position: "relative",
  },
  stepItem: { alignItems: "center", gap: 6, flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: 13, fontWeight: "700" },
  stepLabel: { fontSize: 12 },
  stepLine: {
    position: "absolute",
    top: 28,
    left: "30%",
    right: "30%",
    height: 2,
  },

  body: { padding: 20, gap: 14 },
  statusCard: { alignItems: "center", padding: 40, gap: 16 },
  statusTitle: { fontSize: 24, fontWeight: "bold" },
  statusSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 6,
  },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, padding: 13, fontSize: 15 },
  hint: { fontSize: 12 },

  idTypeList: { gap: 8 },
  idTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1.5,
  },
  idTypeName: { fontSize: 15, fontWeight: "500" },
  radioEmpty: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },

  uploadRow: { flexDirection: "row", gap: 12 },
  uploadBtn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnTitle: { fontSize: 14, fontWeight: "700" },
  uploadBtnSub: { fontSize: 12 },

  previewWrap: { gap: 10 },
  previewImage: { width: "100%", height: 200, borderWidth: 1, resizeMode: "cover" },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  retakeBtnText: { fontSize: 14, fontWeight: "600" },

  privacyCard: { borderWidth: 1, padding: 14, gap: 8 },
  privacyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacyTitle: { fontSize: 13, fontWeight: "700" },
  privacyText: { fontSize: 12, lineHeight: 18 },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginTop: 8,
  },
  actionBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  rejectionReasonCard: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  rejectionReasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rejectionReasonLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rejectionReasonText: {
    fontSize: 14,
    lineHeight: 22,
  },
  resubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginTop: 4,
  },
  resubmitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  appealVerifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  appealVerifyBtnText: { fontSize: 16, fontWeight: "700", color: "#ef4444" },

  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  datePickerText: { flex: 1, fontSize: 15 },

  dpBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dpCard: {
    width: "100%",
    maxWidth: 340,
    padding: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dpNavBtn: { padding: 6 },
  dpHeaderTitle: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  dpDowRow: { flexDirection: "row" },
  dpDowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingBottom: 6,
  },
  dpGrid: { flexDirection: "row", flexWrap: "wrap" },
  dpCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dpCellText: { fontSize: 14 },
  dpConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginTop: 4,
  },
  dpConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  dpAgeError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ef444415",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dpAgeErrorText: { fontSize: 13, color: "#ef4444", flex: 1, lineHeight: 18 },
});
