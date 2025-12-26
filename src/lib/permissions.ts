export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "manage_home_page",
    "view_dashboard",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "manage_users",
    "manage_organizations",
    "view_yahrzeits",
    "view_torah_scholar",
    "view_comcom",
    "view_settings",
  ],

  synagogue_admin: [
    "manage_home_page",
    "view_dashboard",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "manage_users",
    "view_yahrzeits",
    "view_torah_scholar",
    "view_comcom",
    "view_settings",
  ],

  manager: [
    "manage_home_page",
    "view_dashboard",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "manage_users",
    "view_yahrzeits",
    "view_torah_scholar",
    "view_comcom",
    "view_settings",
  ],

  accountant: [
    "view_home_page",
    "view_donors",
    "view_donations",
    "view_pledges",
    "view_payments",
    "view_campaigns",
    "view_yahrzeits",
    "view_torah_scholar",
    "view_settings",
  ],

  member: [
    "view_home_page",
  ],

  donor: [
    "view_home_page",
    "view_campaigns",
  ],

};
