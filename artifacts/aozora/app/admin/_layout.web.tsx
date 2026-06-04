import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Slot, router, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAdminGetStats, getAdminGetStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AozoraLogo } from "@/components/AozoraLogo";

type NavItem = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  badgeKey?: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "PLATFORM",
    items: [
      { label: "Dashboard",         icon: "grid",           href: "/admin" },
      { label: "Listings",          icon: "home",           href: "/admin/dorms",            badgeKey: "pendingDorms" },
      { label: "Rejected Listings", icon: "x-circle",       href: "/admin/rejected-listings" },
      { label: "Verify IDs",        icon: "shield",         href: "/admin/verifications",    badgeKey: "pendingVerifications" },
      { label: "Users",             icon: "users",          href: "/admin/users" },
      { label: "Suspended Users",   icon: "user-x",         href: "/admin/suspended-users" },
      { label: "Reports",           icon: "flag",           href: "/admin/reports",          badgeKey: "pendingReports" },
      { label: "Support",           icon: "message-circle", href: "/admin/support-tickets",  badgeKey: "pendingTickets" },
      { label: "Violations",        icon: "alert-octagon",  href: "/admin/violations",       badgeKey: "recentViolations" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "My Profile", icon: "user", href: "/admin/profile" },
    ],
  },
];

export default function AdminLayoutWeb() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const { data } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey(), refetchInterval: 8_000 },
  });
  const stats = data as any;

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out", "See you next time!");
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.root}>
      {/* Sidebar */}
      <LinearGradient
        colors={["#0f0e1a", "#1a1740"]}
        style={styles.sidebar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <AozoraLogo size={38} />
          <View>
            <Text style={styles.brandName}>Aozora Admin</Text>
            <Text style={styles.brandTagline}>Manage. Verify. Protect.</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nav items */}
        <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
          {NAV_SECTIONS.map((section) => (
            <View key={section.label}>
              <Text style={styles.navSectionLabel}>{section.label}</Text>
              <View style={styles.navList}>
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const badge = item.badgeKey ? stats?.[item.badgeKey] : undefined;
                  const showBadge = badge && badge > 0;

                  return (
                    <TouchableOpacity
                      key={item.href}
                      style={[styles.navItem, isActive && styles.navItemActive]}
                      onPress={() => router.push(item.href as any)}
                      activeOpacity={0.75}
                    >
                      {isActive && (
                        <LinearGradient
                          colors={["rgba(129,140,248,0.18)", "rgba(79,70,229,0.10)"]}
                          style={StyleSheet.absoluteFillObject}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      )}
                      {isActive && <View style={styles.activeBar} />}
                      <Feather
                        name={item.icon}
                        size={17}
                        color={isActive ? "#a5b4fc" : "rgba(255,255,255,0.38)"}
                      />
                      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                        {item.label}
                      </Text>
                      {showBadge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer: user + logout */}
        <View style={styles.sidebarFooter}>
          <View style={styles.divider} />
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.[0]?.toUpperCase() ?? "A"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName ?? "Admin"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="log-out" size={16} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Main content */}
      <View style={styles.main}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    minHeight: "100%" as any,
  },

  sidebar: {
    width: 240,
    flexShrink: 0,
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  logoGradient: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 0.4,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 0,
  },

  navScroll: {
    flex: 1,
    paddingTop: 16,
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.22)",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  navList: {
    gap: 2,
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  navItemActive: {},
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: "#818cf8",
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.38)",
  },
  navLabelActive: {
    color: "#e0e7ff",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },

  sidebarFooter: {
    gap: 0,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  userEmail: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 1,
  },
  logoutBtn: {
    padding: 4,
    flexShrink: 0,
  },

  main: {
    flex: 1,
    overflow: "hidden" as any,
  },
});
