class Defs {}

module.exports = {
  reqAreYouServerUuid: "a962ed99-e788-49cd-aa67-b0a8317f1573",
  rspAreYouServerUuid: "7589c403-984c-4c8a-885b-48a65131d17b",

  reqDiscoveryUuid: "24e1c790-20b9-47e9-b4b7-77f15da4e191",
  rspDiscoveryUuid: "9c96377f-ee54-4d39-b4f0-fde43283ac73",

  pingTarget: "google.com",

  urlAbout: "/about",
  urlAddUser: "/addUser",
  urlAdministration: "/administration",
  urlBlank: "/blank",
  urlClients: "/clients",
  urlClientUpdate: "/clientUpdate",
  urlCloseSentinel: "/closeSentinel",
  urlDebug: "/debug",
  urlDevices: "/devices",
  urlDownload: "/download",
  urlEditUser: "/editUser",
  urlForgotPassword: "/forgotPassword",
  urlHome: "/home",
  urlIipzy: "/iipzy",
  urlLogin: "/login",
  urlLogLevel: "/logLevel",
  urlLogSend: "/logSend",
  urlNavigator: "/navigator",
  urlPingPlot: "/pingPlot",
  urlScheduler: "/scheduler",
  urlSentinelAdmin: "/sentinelAdmin",
  urlSentinelDiscovery: "/sentinelDiscovery",
  urlSentinelInUse: "/sentinelInUse",
  urlSentinelOnlineCheck: "/sentinelOnlineCheck",
  urlSentinels: "/sentinels",
  urlSettings: "/settings",
  urlStartup: "/startup",
  urlThroughputTest: "/throughputTest",
  urlUpdater: "/updater",

  ipcAAATest: "ipc_000",
  ipcAuthCredentialsUpdate: "ipc_001",
  ipcBloatLatencyStatusIperf3Down: "ipc_002",
  ipcBloatLatencyStatusIperf3DownFinal: "ipc_003",
  ipcBloatLatencyStatusIperf3Up: "ipc_004",
  ipcBloatLatencyStatusIperf3UpFinal: "ipc_005",
  ipcClearDials: "ipc_006",
  ipcClientLoginNeeded: "ipc_007",
  ipcClientName: "ipc_074",
  ipcClientShutdown: "ipc_008",
  ipcConnectionToken: "ipc_129",
  ipcConsoleLog: "ipc_009",
  ipcConsoleLogVerbose: "ipc_092",
  ipcDevicesReady: "ipc_075",
  ipcDeviceUpdated: "ipc_072",
  ipcDumpSentinelDeviceTable: "ipc_068",
  ipcExit: "ipc_010",
  ipcExiting: "ipc_011",
  ipcIperf3StatusDown: "ipc_012",
  ipcIperf3StatusUp: "ipc_013",
  ipcLinkTo: "ipc_014",
  ipcLoginStatus: "ipc_015",
  ipcLoginVerifyStatus: "ipc_157",
  ipcNominalLatencyStatus: "ipc_016",
  ipcNominalLatencyStatusFinal: "ipc_017",
  ipcNoop: "ipc_044",
  ipcPingPlotConvertDB: "ipc_056",
  ipcPingPlotData: "ipc_024",
  ipcPingPlotWindowButtonHome: "ipc_025",
  ipcPingPlotWindowButtonLeft: "ipc_026",
  ipcPingPlotWindowButtonLeftDropped: "ipc_027",
  ipcPingPlotWindowButtonRight: "ipc_028",
  ipcPingPlotWindowButtonRightDropped: "ipc_029",
  ipcPingPlotWindowButtonZoomChange: "ipc_030",
  ipcPingPlotWindowMount: "ipc_031",
  ipcPingPlotWindowButtonHomeEx: "ipc_114",
  ipcPingPlotWindowButtonLeftEx: "ipc_115",
  ipcPingPlotWindowButtonLeftDroppedEx: "ipc_116",
  ipcPingPlotWindowButtonRightEx: "ipc_117",
  ipcPingPlotWindowButtonRightDroppedEx: "ipc_118",
  ipcPingPlotWindowButtonZoomChangeEx: "ipc_119",
  ipcPingPlotWindowMountEx: "ipc_120",
  ipcQuit: "ipc_067",
  ipcRendererReady: "ipc_033",
  ipcSentinelDiscoveryTryingSentinelIPAddress: "ipc_018",
  ipcSentinelDiscovery: "ipc_019",
  ipcSentinelSendState: "ipc_020",
  ipcSentinelOnlineCheck: "ipc_021",
  ipcSentinelOnlineStatus: "ipc_022",
  ipcServerAddress: "ipc_064",
  ipcShowNavBar: "ipc_146",
  ipcTestingState: "ipc_036",
  ipcTickStatusIperf3Down: "ipc_037",
  ipcThroughputTestFailedToGetServer: "ipc_038",
  ipcThrouputTestStatus: "ipc_087",
  ipcThroughputTestWindowButtonLeft: "ipc_089",
  ipcThroughputTestWindowButtonNewest: "ipc_088",
  ipcThroughputTestWindowButtonOldest: "ipc_091",
  ipcThroughputTestWindowButtonRight: "ipc_090",
  ipcThroughputTestWindowMount: "ipc_039",
  ipcThroughputTestWindowCancel: "ipc_175",
  ipcThroughputTestWindowStart: "ipc_174",
  ipcThroughputTestWindowStartStop: "ipc_040",
  ipcTickStatusIperf3Up: "ipc_041",
  ipcTickStatusNominalLatency: "ipc_042",
  ipcTimeOfTest: "ipc_043",
  ipcUserAddVerified: "ipc_127",
  ipcZZZNext: "ipc_176",

  configFilename: "iipzy",

  crashFilename: "iipzy-crash.txt",

  // -- login status
  loginStatusLoggedOut: 0,
  loginStatusLoggedIn: 1,
  loginStatusLoginFailed: 2,
  loginStatusVerified: 3,
  loginStatusVerifyFailed: 4,
  loginStatusNoServerAddress: 5,

  // -- sentinel discovery
  sentinelStatusOnline: 0,
  sentinelStatusOffline: 1,
  sentinelStatusInUse: 2,
  sentinelStatusNoAddress: 3,
  sentinelStatusUnknown: 4,
  sentinelStatusOnlineLoggedOut: 5,

  // -- pi internal events
  // NB: don't overlap with ipc...
  pevLoginStatus: "pev_1001",
  pevLoginNeeded: "pev_1002",
  pevZZZNext: "pev_1003",

  // -- http custome headers
  httpCustomHeader_XAuthToken: "x-auth-token",
  httpCustomHeader_XClientToken: "x-client-token",
  httpCustomHeader_XConnToken: "x-conn-token",
  httpCustomHeader_XTimestamp: "x-timestamp",
  httpCustomHeader_XWebClient: "x-web-client",

  // -- http
  httpStatusOk: 200,
  httpStatusCreated: 201,
  httpStatusAccepted: 202,
  httpStatusNoContent: 204,
  httpStatusMultiStatus: 207,
  httpStatusFound: 302,
  httpStatusBadRequest: 400,
  httpStatusUnauthorized: 401,
  httpStatusForbidden: 403,
  httpStatusNotFound: 404,
  httpStatusConflict: 409,
  httpStatusGone: 410,
  httpStatusUnprocessableEntity: 422,
  httpStatusInternalError: 500,
  httpStatusNotImplemented: 501,
  httpStatusConnRefused: 900,
  httpStatusConnAborted: 901,
  httpStatusConnReset: 902,
  httpStatusSentinelInUse: 903,
  httpStatusException: 999,

  statusOk: 0,
  statusAlreadyExists: 10001,
  statusDoesNotExist: 10002,
  statusInvalidVerificationCode: 10003,
  statusGeneralSqlFailure: 10004,
  statusException: 10005,
  statusInvalidUserName: 10006,
  statusInvalidPasswordResetCode: 10007,
  statusCannotAllocateIperf3Server: 10008,
  statusDailyIperf3LimitReached: 10009,
  statusInvalidUpdateType: 10010,
  statusUpdateInProgress: 10011,
  statusRouteError: 10012,
  statusMissingClientToken: 10013,
  statusInvalidClientToken: 10014,
  statusMissingAuthToken: 10015,
  statusInvalidAuthToken: 10016,
  statusMissingParam: 10017,
  statusInvalidParam: 10018,
  statusInvalidCredentials: 10019,
  statusMissingConnectionToken: 10020,
  statusInvalidConnectionToken: 10021,
  statusAdminPriviledgeRequired: 10022,
  statusInvalidClientType: 10023,
  statusIperf3ServerBusy: 10024,
  statusHttpError: 10025,
  statusInvalidThirdPartyApi: 10026,
  statusSentinelInUse: 10027,
  statusAdminInProgress: 10028,
  statusInvalidDownloadClient: 10029,
  statusUserNotInWhiteList: 10030,
  statusIperf3ServerFailed: 10031,

  // -- events
  // objectType
  objectType_null: "",
  objectType_clientInstance: "clientInstance",
  objectType_networkDevice: "networkDevice",
  objectType_server: "server",

  // eventClass
  eventClass_null: "",
  eventClass_clientAdded: "clientAdded",
  eventClass_clientAddressChanged: "clientAddressChanged",
  eventClass_clientOnLineStatus: "clientOnLineStatus",
  eventClass_clientLoginStatus: "clientLoginStatus",
  eventClass_cpuusage: "cpuusage",
  eventClass_crash: "crash",
  eventClass_networkDeviceAdded: "networkDeviceAdded",
  eventClass_networkDeviceDeleted: "networkDeviceDeleted",
  eventClass_networkDeviceIPAddressChanged: "networkDeviceIPAddressChanged",
  eventClass_networkDeviceStatus: "networkDeviceStatus",
  eventClass_pingFail: "pingFail",

  // eventId
  eventId_null: "",

  // eventActive
  eventActive_inactive: 0,
  eventActive_active: 1,
  eventActive_activeAutoInactive: 2, // becomes inactive when alert sent.

  // alert target
  alertTarget_null: 0,
  alertTarget_email: 1,
  alertTarget_sms: 2,

  // -- administrative commands to sentinels/clients
  adminCmd_admin: "admin",
  adminCmd_getLogLevel: "get-log-level",
  adminCmd_setLogLevel: "set-log-level",
  adminCmd_sendLogs: "send-logs",

  adminCmd_sentinel_none: "none",
  adminCmd_sentinel_reboot: "reboot",
  adminCmd_sentinel_resetNetworkDevicesDatabase:
    "reset-network-devices-database",
  adminCmd_sentinel_restartSentinel: "restart-sentinel",
  adminCmd_sentinel_restartSentinelAdmin: "restart-sentinel-admin",
  adminCmd_sentinel_restartSentinelWeb: "restart-sentinel-web",
  adminCmd_sentinel_restartUpdater: "restart-updater",
  adminCmd_sentinel_sendLogs: "send-logs",
  adminCmd_sentinel_setLogLevelDetailed: "set-log-level-detailed",
  adminCmd_sentinel_setLogLevelNormal: "set-log-level-normal",

  // client type.
  clientType_null: "null",
  clientType_appliance: "appliance",
  clientType_pc: "pc",
  clientType_web: "web",

  // client mode.
  clientMode_null: "null",
  clientMode_pcOnly: "pc-only",
  clientMode_sentinel: "sentinel",

  // third party apis.
  thirdPartyApiName_null: "null",
  thirdPartyApiName_email: "email",
  thirdPartyApiName_ipApi: "ipApi",
  thirdPartyApiName_ipGeolocation: "ipGeolocation",
  thirdPartyApiName_sms: "sms",

  headBuzzardUserId: 1,

  //
  endOfFile: 0
};
