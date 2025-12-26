export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "view_dashboard",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "view_settings",
    "manage_users",
    "manage_organizations",
    "view_yahrzeits",
    "view_torah_scholar",
  ],

  synagogue_admin: [
    "view_dashboard",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "view_settings",
    "manage_users",
    "view_yahrzeits",
    "view_torah_scholar",
  ],

  member: [
    "view_dashboard",
    "view_donors",
    "view_campaigns",
    "view_yahrzeits",
    "view_torah_scholar",
  ],
};
