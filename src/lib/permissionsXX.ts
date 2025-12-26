export const PERMISSIONS = {
  super_admin: {
    view_dashboard: true,

    view_organizations: true,
    manage_organizations: true,

    view_users: true,
    manage_users: true,

    view_campaigns: true,
    view_donors: true,
    view_donations: true,
    view_pledges: true,
    view_payments: true,
    view_yahrzeits: true,
    view_torah_scholar: true,
    view_settings: true,
  },

  synagogue_admin: {
    view_dashboard: true,

    view_organizations: false,
    manage_organizations: false,

    view_users: true,
    manage_users: true,

    view_campaigns: true,
    view_donors: true,
    view_donations: true,
    view_pledges: true,
    view_payments: true,
    view_yahrzeits: true,
    view_torah_scholar: true,
    view_settings: true,
  },

  manager: {
    view_dashboard: true,

    view_organizations: false,
    manage_organizations: false,

    view_users: false,
    manage_users: false,

    view_campaigns: true,
    view_donors: true,
    view_donations: true,
    view_pledges: true,
    view_payments: true,
    view_yahrzeits: true,
    view_torah_scholar: true,

    view_settings: false,
  },

  accountant: {
    view_dashboard: true,

    view_organizations: false,
    manage_organizations: false,

    view_users: true,
    manage_users: false,

    view_donors: true,
    view_donations: true,
    view_pledges: true,
    view_payments: true,

    view_campaigns: false,
    view_yahrzeits: false,
    view_settings: false,
    view_torah_scholar: false,
  },

  donor: {
    view_dashboard: true,

    view_organizations: false,
    manage_organizations: false,

    view_users: false,
    manage_users: false,

    view_donors: false,
    view_donations: true,
    view_pledges: true,
    view_payments: true,

    view_campaigns: false,
    view_yahrzeits: false,
    view_settings: false,
    view_torah_scholar: false,
  },

  member: {
    view_dashboard: true,

    view_organizations: false,
    manage_organizations: false,

    view_users: false,
    manage_users: false,

    view_donors: false,
    view_donations: false,
    view_pledges: false,
    view_payments: false,

    view_campaigns: false,
    view_yahrzeits: true,
    view_settings: false,
    view_torah_scholar: false,
  },
};
