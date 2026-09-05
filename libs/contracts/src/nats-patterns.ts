export const NATS_PATTERNS = {
  identity: {
    register: 'identity.register',
    login: 'identity.login',
    refresh: 'identity.refresh',
    logout: 'identity.logout',
    me: 'identity.me',
    health: 'identity.health',
    admin: {
      corporateAccountList: 'identity.admin.corporateAccount.list',
      corporateAccountCreate: 'identity.admin.corporateAccount.create',
      corporateAccountLinkManager: 'identity.admin.corporateAccount.linkManager',
    },
  },
  catalog: {
    health: 'catalog.health',
    vehicles: {
      list: 'catalog.vehicles.list',
      get: 'catalog.vehicles.get',
    },
    locations: {
      list: 'catalog.locations.list',
    },
    admin: {
      vehiclesList: 'catalog.admin.vehicles.list',
      vehicleGet: 'catalog.admin.vehicle.get',
      vehicleUpsert: 'catalog.admin.vehicle.upsert',
    },
  },
  cms: {
    health: 'cms.health',
    articles: {
      list: 'cms.articles.list',
      get: 'cms.articles.get',
    },
    faq: {
      list: 'cms.faq.list',
    },
    legal: {
      get: 'cms.legal.get',
    },
    admin: {
      articlesList: 'cms.admin.articles.list',
      articleGet: 'cms.admin.article.get',
      articleUpsert: 'cms.admin.article.upsert',
    },
  },
  booking: {
    health: 'booking.health',
    quote: {
      create: 'booking.quote.create',
      list: 'booking.quote.list',
      /** Ops sets confirmedPriceTnd (before payment). */
      price: 'booking.quote.price',
    },
    get: 'booking.get',
    /** Customer portal — list bookings for a customerId (gateway sets from JWT). */
    list: 'booking.list',
    confirm: 'booking.confirm',
    cancel: 'booking.cancel',
    status: {
      update: 'booking.status.update',
    },
  },
  notify: {
    health: 'notify.health',
    send: 'notify.send',
  },
  fleet: {
    health: 'fleet.health',
    availability: {
      search: 'fleet.availability.search',
    },
    hold: {
      acquire: 'fleet.hold.acquire',
      release: 'fleet.hold.release',
    },
    calendar: {
      block: 'fleet.calendar.block',
      release: 'fleet.calendar.release',
    },
  },
  billing: {
    health: 'billing.health',
    checkout: {
      create: 'billing.checkout.create',
    },
    payment: {
      get: 'billing.payment.get',
    },
    webhook: {
      handle: 'billing.webhook.handle',
    },
    invoice: {
      create: 'billing.invoice.create',
    },
    corporateProfile: {
      upsert: 'billing.corporateProfile.upsert',
      get: 'billing.corporateProfile.get',
    },
  },
  dispatch: {
    health: 'dispatch.health',
    driver: {
      list: 'dispatch.driver.list',
    },
    assign: 'dispatch.assign',
    trip: {
      status: 'dispatch.trip.status',
    },
  },
} as const;
