import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const now = new Date();
const d = (days: number) => new Date(now.getTime() + days * 86400000);
const past = (days: number) => new Date(now.getTime() - days * 86400000);

// ===================== HELPERS =====================

async function createTimeline(caseId: string, createdById: string, events: { eventType: string; title: string; description?: string; daysAgo: number }[]) {
  for (const e of events) {
    await prisma.caseTimeline.create({ data: { caseId, eventType: e.eventType, title: e.title, description: e.description || null, eventDate: past(e.daysAgo), createdById } });
  }
}

async function createHearing(caseId: string, courtId: string, createdById: string, data: { type: string; daysAgo: number; outcome?: string; adjourned?: boolean; adjournDate?: number; adjournReason?: string }) {
  const h = await prisma.hearing.create({
    data: {
      caseId, courtId, createdById,
      hearingType: data.type as never,
      hearingDate: past(data.daysAgo),
      outcome: data.outcome || null,
      isAdjourned: data.adjourned || false,
      adjournmentDate: data.adjournDate ? past(data.adjournDate) : null,
      adjournmentReason: data.adjournReason || null,
      nextHearingDate: data.adjournDate ? d(data.adjournDate + 14) : null,
    },
  });
  return h;
}

async function createEvidence(caseId: string, collectorId: string, data: { exhibitNumber: string; description: string; type: string; status: string; daysAgo: number }) {
  const ev = await prisma.evidence.create({
    data: {
      caseId, exhibitNumber: data.exhibitNumber, description: data.description,
      evidenceType: data.type as never, status: data.status as never,
      location: "Police exhibit room", collectedBy: "Detective Mugisha",
      collectedDate: past(data.daysAgo),
    },
  });
  await prisma.evidenceChain.create({
    data: { evidenceId: ev.id, fromUserId: collectorId, toUserId: collectorId, purpose: "COLLECTION", notes: "Collected during initial investigation", transferDate: past(data.daysAgo) },
  });
  return ev;
}

async function createNotification(userId: string, data: { type: string; title: string; body: string; daysAgo: number; read: boolean; refId?: string; refType?: string }) {
  await prisma.notification.create({
    data: {
      userId, type: data.type, title: data.title, body: data.body,
      referenceId: data.refId || null, referenceType: data.refType || null,
      channel: "IN_APP", sentAt: past(data.daysAgo), isRead: data.read,
      readAt: data.read ? past(data.daysAgo + 1) : null,
    },
  });
}

// ===================== MAIN =====================

async function main() {
  console.log("🌍 Seeding Uganda CMS with comprehensive realistic data...\n");

  // Clean existing data
  console.log("Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.documentTag.deleteMany();
  await prisma.document.deleteMany();
  await prisma.prisonTransfer.deleteMany();
  await prisma.detentionRecord.deleteMany();
  await prisma.appealDecision.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.surety.deleteMany();
  await prisma.bailApplication.deleteMany();
  await prisma.evidenceChain.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.hearing.deleteMany();
  await prisma.courtSession.deleteMany();
  await prisma.caseTimeline.deleteMany();
  await prisma.caseParty.deleteMany();
  await prisma.civilCaseDetails.deleteMany();
  await prisma.criminalCaseDetails.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.case.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.court.deleteMany();
  await prisma.policeStation.deleteMany();
  await prisma.auditLog.deleteMany();
  console.log("  ✓ Cleaned");

  const pw = await bcrypt.hash("admin123", 12);

  // ===================== ROLES =====================
  console.log("Creating roles...");
  const roleDefs = [
    ["system_administrator", "System Administrator", 1, "Full system access"],
    ["supreme_court_justice", "Supreme Court Justice", 2, "Supreme Court operations"],
    ["court_of_appeal_justice", "Court of Appeal Justice", 3, "Court of Appeal operations"],
    ["high_court_judge", "High Court Judge", 4, "High Court operations"],
    ["chief_magistrate", "Chief Magistrate", 5, "Chief Magistrate Court"],
    ["magistrate_grade_i", "Magistrate Grade I", 6, "Grade I Magistrate"],
    ["magistrate_grade_ii", "Magistrate Grade II", 7, "Grade II Magistrate"],
    ["registrar", "Registrar", 8, "Court administration"],
    ["court_clerk", "Court Clerk", 9, "Clerical court operations"],
    ["dpp_prosecutor", "DPP Prosecutor", 10, "State Attorney / Prosecutor"],
    ["police_officer", "Police Officer", 11, "Police investigator"],
    ["oc_station", "Officer in Charge - Station", 12, "Station commander"],
    ["dpc", "District Police Commander", 13, "District police command"],
    ["advocate", "Advocate", 14, "Defence lawyer"],
    ["lc_official", "LC Official", 15, "Local Council Court official"],
    ["prison_officer", "Prison Officer", 16, "Prison administration"],
    ["complainant", "Complainant", 17, "Case complainant"],
    ["accused", "Accused", 18, "Accused person"],
    ["victim", "Victim", 19, "Victim"],
    ["surety", "Surety", 20, "Surety"],
  ] as const;
  const roles: Record<string, { id: string }> = {};
  for (const [slug, name, hierarchy, desc] of roleDefs) {
    const r = await prisma.role.upsert({ where: { slug }, update: {}, create: { name, slug, hierarchy, isSystem: true, description: desc } });
    roles[slug] = r;
  }
  console.log(`  ✓ ${roleDefs.length} roles`);

  // ===================== PERMISSIONS =====================
  console.log("Creating permissions...");
  const resources = ["CASE", "USER", "ROLE", "COURT", "HEARING", "EVIDENCE", "DOCUMENT", "BAIL_APPLICATION", "APPEAL", "DETENTION", "INVESTIGATION", "NOTIFICATION", "AUDIT_LOG", "REPORT", "SETTINGS"] as const;
  const actions = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "REJECT", "ASSIGN", "TRANSFER", "ARCHIVE", "EXPORT"] as const;
  const permIds: Record<string, string> = {};
  for (const r of resources) for (const a of actions) {
    const p = await prisma.permission.upsert({ where: { resource_action: { resource: r, action: a } }, update: {}, create: { resource: r, action: a } });
    permIds[`${r}:${a}`] = p.id;
  }
  console.log(`  ✓ ${Object.keys(permIds).length} permissions`);

  // Permissions → Roles
  const adminRoleId = roles.system_administrator.id;
  for (const pid of Object.values(permIds)) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: adminRoleId, permissionId: pid } }, update: {}, create: { roleId: adminRoleId, permissionId: pid } });
  const jResources = ["CASE", "HEARING", "COURT", "EVIDENCE", "DOCUMENT", "BAIL_APPLICATION", "APPEAL", "DETENTION", "REPORT"];
  for (const rs of ["supreme_court_justice", "court_of_appeal_justice", "high_court_judge", "chief_magistrate", "magistrate_grade_i", "magistrate_grade_ii"]) {
    for (const r of jResources) for (const a of ["CREATE", "READ", "UPDATE", "APPROVE"]) {
      if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:${a}`] } });
    }
  }
  for (const rs of ["registrar", "court_clerk"]) for (const r of ["CASE", "COURT", "HEARING", "DOCUMENT", "REPORT", "NOTIFICATION"]) for (const a of ["CREATE", "READ", "UPDATE", "DELETE", "ASSIGN", "EXPORT"]) {
    if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:${a}`] } });
  }
  for (const r of ["CASE", "INVESTIGATION", "EVIDENCE", "BAIL_APPLICATION", "DOCUMENT", "APPEAL", "HEARING", "REPORT"]) for (const a of ["CREATE", "READ", "UPDATE", "APPROVE", "REJECT"]) {
    if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles.dpp_prosecutor.id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: roles.dpp_prosecutor.id, permissionId: permIds[`${r}:${a}`] } });
  }
  for (const r of ["INVESTIGATION", "EVIDENCE", "CASE", "DOCUMENT"]) for (const a of ["CREATE", "READ", "UPDATE"]) {
    if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles.police_officer.id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: roles.police_officer.id, permissionId: permIds[`${r}:${a}`] } });
  }
  for (const r of ["CASE", "DOCUMENT", "BAIL_APPLICATION", "APPEAL", "HEARING"]) for (const a of ["CREATE", "READ"]) {
    if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles.advocate.id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: roles.advocate.id, permissionId: permIds[`${r}:${a}`] } });
  }
  for (const rs of ["complainant", "accused", "victim", "surety"]) for (const r of ["CASE", "DOCUMENT", "HEARING"]) {
    if (permIds[`${r}:READ`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:READ`] } }, update: {}, create: { roleId: (roles as Record<string,{id:string}>)[rs].id, permissionId: permIds[`${r}:READ`] } });
  }
  for (const r of ["DETENTION", "CASE"]) for (const a of ["CREATE", "READ", "UPDATE"]) {
    if (permIds[`${r}:${a}`]) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles.prison_officer.id, permissionId: permIds[`${r}:${a}`] } }, update: {}, create: { roleId: roles.prison_officer.id, permissionId: permIds[`${r}:${a}`] } });
  }
  console.log("  ✓ Permissions assigned to all roles");

  // ===================== COURTS =====================
  console.log("Creating courts...");
  const sc = await prisma.court.upsert({ where: { code: "SC" }, update: {}, create: { name: "Supreme Court of Uganda", code: "SC", level: "SUPREME", location: "Kampala", address: "Plot 10, The Square, Kampala" } });
  const ca = await prisma.court.upsert({ where: { code: "CA" }, update: {}, create: { name: "Court of Appeal of Uganda", code: "CA", level: "COURT_OF_APPEAL", location: "Kampala", address: "Plot 2, The Square, Kampala", parentCourtId: sc.id } });
  const hcKla = await prisma.court.upsert({ where: { code: "HC-KLA" }, update: {}, create: { name: "High Court - Kampala", code: "HC-KLA", level: "HIGH_COURT", location: "Kampala", division: "CIVIL", parentCourtId: ca.id } });
  const hcMbl = await prisma.court.upsert({ where: { code: "HC-MBL" }, update: {}, create: { name: "High Court - Mbale", code: "HC-MBL", level: "HIGH_COURT", location: "Mbale", division: "CRIMINAL", parentCourtId: ca.id } });
  const hcGul = await prisma.court.upsert({ where: { code: "HC-GUL" }, update: {}, create: { name: "High Court - Gulu", code: "HC-GUL", level: "HIGH_COURT", location: "Gulu", parentCourtId: ca.id } });
  const hcMbr = await prisma.court.upsert({ where: { code: "HC-MBR" }, update: {}, create: { name: "High Court - Mbarara", code: "HC-MBR", level: "HIGH_COURT", location: "Mbarara", parentCourtId: ca.id } });
  const hcJj = await prisma.court.upsert({ where: { code: "HC-JJ" }, update: {}, create: { name: "High Court - Jinja", code: "HC-JJ", level: "HIGH_COURT", location: "Jinja", parentCourtId: ca.id } });
  const hcFp = await prisma.court.upsert({ where: { code: "HC-FP" }, update: {}, create: { name: "High Court - Fort Portal", code: "HC-FP", level: "HIGH_COURT", location: "Fort Portal", parentCourtId: ca.id } });
  const hcLir = await prisma.court.upsert({ where: { code: "HC-LIR" }, update: {}, create: { name: "High Court - Lira", code: "HC-LIR", level: "HIGH_COURT", location: "Lira", parentCourtId: ca.id } });
  const hcMas = await prisma.court.upsert({ where: { code: "HC-MAS" }, update: {}, create: { name: "High Court - Masaka", code: "HC-MAS", level: "HIGH_COURT", location: "Masaka", parentCourtId: ca.id } });
  const acDiv = await prisma.court.upsert({ where: { code: "HC-ACD" }, update: {}, create: { name: "Anti-Corruption Division - High Court", code: "HC-ACD", level: "HIGH_COURT", division: "ANTI_CORRUPTION", location: "Kampala", parentCourtId: ca.id } });
  const commDiv = await prisma.court.upsert({ where: { code: "HC-COMM" }, update: {}, create: { name: "Commercial Division - High Court", code: "HC-COMM", level: "HIGH_COURT", division: "COMMERCIAL", location: "Kampala", parentCourtId: ca.id } });
  const famDiv = await prisma.court.upsert({ where: { code: "HC-FAM" }, update: {}, create: { name: "Family Division - High Court", code: "HC-FAM", level: "HIGH_COURT", division: "FAMILY", location: "Kampala", parentCourtId: ca.id } });
  const landDiv = await prisma.court.upsert({ where: { code: "HC-LAND" }, update: {}, create: { name: "Land Division - High Court", code: "HC-LAND", level: "HIGH_COURT", division: "LAND", location: "Kampala", parentCourtId: ca.id } });
  const cmKla = await prisma.court.upsert({ where: { code: "CM-KLA" }, update: {}, create: { name: "Chief Magistrate Court - Kampala", code: "CM-KLA", level: "CHIEF_MAGISTRATE", location: "Kampala", parentCourtId: hcKla.id } });
  const cmMbl = await prisma.court.upsert({ where: { code: "CM-MBL" }, update: {}, create: { name: "Chief Magistrate Court - Mbale", code: "CM-MBL", level: "CHIEF_MAGISTRATE", location: "Mbale", parentCourtId: hcMbl.id } });
  const cmGul = await prisma.court.upsert({ where: { code: "CM-GUL" }, update: {}, create: { name: "Chief Magistrate Court - Gulu", code: "CM-GUL", level: "CHIEF_MAGISTRATE", location: "Gulu", parentCourtId: hcGul.id } });
  const gmKla = await prisma.court.upsert({ where: { code: "GM-KLA" }, update: {}, create: { name: "Magistrate Grade I - Kampala", code: "GM-KLA", level: "MAGISTRATE_GRADE_I", location: "Kampala", parentCourtId: cmKla.id } });
  console.log(`  ✓ ${18} courts (SC → CA → 11 HC → 3 CM → 1 GM)`);

  // ===================== POLICE STATIONS =====================
  console.log("Creating police stations...");
  const psKla = await prisma.policeStation.upsert({ where: { code: "CPS-KLA" }, update: {}, create: { name: "Central Police Station - Kampala", code: "CPS-KLA", location: "Kampala", courtId: cmKla.id } });
  const psMbl = await prisma.policeStation.upsert({ where: { code: "CPS-MBL" }, update: {}, create: { name: "Central Police Station - Mbale", code: "CPS-MBL", location: "Mbale", courtId: cmMbl.id } });
  const psGul = await prisma.policeStation.upsert({ where: { code: "CPS-GUL" }, update: {}, create: { name: "Central Police Station - Gulu", code: "CPS-GUL", location: "Gulu", courtId: cmGul.id } });
  const psJj = await prisma.policeStation.upsert({ where: { code: "CPS-JJ" }, update: {}, create: { name: "Central Police Station - Jinja", code: "CPS-JJ", location: "Jinja", courtId: hcJj.id } });
  const psMbr = await prisma.policeStation.upsert({ where: { code: "CPS-MBR" }, update: {}, create: { name: "Central Police Station - Mbarara", code: "CPS-MBR", location: "Mbarara", courtId: hcMbr.id } });
  const psFp = await prisma.policeStation.upsert({ where: { code: "CPS-FP" }, update: {}, create: { name: "Central Police Station - Fort Portal", code: "CPS-FP", location: "Fort Portal", courtId: hcFp.id } });
  const psLir = await prisma.policeStation.upsert({ where: { code: "CPS-LIR" }, update: {}, create: { name: "Central Police Station - Lira", code: "CPS-LIR", location: "Lira", courtId: hcLir.id } });
  const psMas = await prisma.policeStation.upsert({ where: { code: "CPS-MAS" }, update: {}, create: { name: "Central Police Station - Masaka", code: "CPS-MAS", location: "Masaka", courtId: hcMas.id } });
  const cidKla = await prisma.policeStation.upsert({ where: { code: "CID-KLA" }, update: {}, create: { name: "CID Headquarters - Kampala", code: "CID-KLA", location: "Kampala", courtId: hcKla.id } });
  console.log(`  ✓ ${9} police stations`);

  // ===================== USERS =====================
  console.log("Creating users...");
  const users: Record<string, { id: string; email: string }> = {};

  const userDefs: { key: string; email: string; first: string; last: string; job: string; phone: string; nid: string; roles: [string, string | null][] }[] = [
    { key: "admin", email: "admin@ugcms.gov", first: "Patrick", last: "Mugenyi", job: "System Administrator", phone: "+256700000001", nid: "CF80001111110001", roles: [["system_administrator", null]] },
    { key: "cj", email: "cj.owiny@ugcms.gov", first: "Alfonse", last: "Owiny-Dollo", job: "Chief Justice", phone: "+256700000002", nid: "CF60002222220002", roles: [["supreme_court_justice", sc.id]] },
    { key: "scj2", email: "justice.tumwesigye@ugcms.gov", first: "Jotham", last: "Tumwesigye", job: "Supreme Court Justice", phone: "+256700000003", nid: "CF60003333330003", roles: [["supreme_court_justice", sc.id]] },
    { key: "scj3", email: "justice.kisaakye@ugcms.gov", first: "Esther", last: "Kisaakye", job: "Supreme Court Justice", phone: "+256700000004", nid: "CF60004444440004", roles: [["supreme_court_justice", sc.id]] },
    { key: "caj", email: "justice.mulyagonja@ugcms.gov", first: "Kakuru", last: "Mulyagonja", job: "Court of Appeal Justice", phone: "+256700000005", nid: "CF50005555550005", roles: [["court_of_appeal_justice", ca.id]] },
    { key: "caj2", email: "justice.egonda@ugcms.gov", first: "Geoffrey", last: "Egonda-Ntende", job: "Court of Appeal Justice", phone: "+256700000006", nid: "CF50006666660006", roles: [["court_of_appeal_justice", ca.id]] },
    { key: "judgeKla", email: "judge.kla@ugcms.gov", first: "Margaret", last: "Oumo-Oguli", job: "High Court Judge - Kampala", phone: "+256700000007", nid: "CF40007777770007", roles: [["high_court_judge", hcKla.id]] },
    { key: "judgeMbl", email: "judge.mbl@ugcms.gov", first: "David", last: "Wavamunno", job: "High Court Judge - Mbale", phone: "+256700000008", nid: "CF40008888880008", roles: [["high_court_judge", hcMbl.id]] },
    { key: "judgeGul", email: "judge.gul@ugcms.gov", first: "Stephen", last: "Mubiru", job: "High Court Judge - Gulu", phone: "+256700000009", nid: "CF40009999990009", roles: [["high_court_judge", hcGul.id]] },
    { key: "judgeMbr", email: "judge.mbr@ugcms.gov", first: "Joyce", last: "Kavuma", job: "High Court Judge - Mbarara", phone: "+256700000010", nid: "CF40010000010010", roles: [["high_court_judge", hcMbr.id]] },
    { key: "judgeJj", email: "judge.jj@ugcms.gov", first: "Michael", last: "Elubu", job: "High Court Judge - Jinja", phone: "+256700000011", nid: "CF40011000010011", roles: [["high_court_judge", hcJj.id]] },
    { key: "judgeAC", email: "judge.ac@ugcms.gov", first: "Jane", last: "Kiggundu", job: "Judge - Anti-Corruption Division", phone: "+256700000012", nid: "CF40012000010012", roles: [["high_court_judge", acDiv.id]] },
    { key: "judgeComm", email: "judge.comm@ugcms.gov", first: "Henry", last: "Adonyo", job: "Judge - Commercial Division", phone: "+256700000013", nid: "CF40013000010013", roles: [["high_court_judge", commDiv.id]] },
    { key: "dpp", email: "dpp.abodo@ugcms.gov", first: "Jane", last: "Abodo", job: "Director of Public Prosecutions", phone: "+256700000014", nid: "CF30014000010014", roles: [["dpp_prosecutor", null]] },
    { key: "prosecutor", email: "prosecutor.achieng@ugcms.gov", first: "Sarah", last: "Achieng", job: "Senior State Attorney", phone: "+256700000015", nid: "CF30015000010015", roles: [["dpp_prosecutor", null]] },
    { key: "prosecutor2", email: "prosecutor.ogwal@ugcms.gov", first: "Geoffrey", last: "Ogwal", job: "State Attorney", phone: "+256700000016", nid: "CF30016000010016", roles: [["dpp_prosecutor", null]] },
    { key: "police", email: "police.mugisha@ugcms.gov", first: "John", last: "Mugisha", job: "Detective Inspector", phone: "+256700000017", nid: "CF20017000010017", roles: [["police_officer", null]] },
    { key: "police2", email: "police.namutebi@ugcms.gov", first: "Agnes", last: "Namutebi", job: "Detective Constable", phone: "+256700000018", nid: "CF20018000010018", roles: [["police_officer", null]] },
    { key: "police3", email: "police.okumu@ugcms.gov", first: "Richard", last: "Okumu", job: "Detective Sergeant", phone: "+256700000019", nid: "CF20019000010019", roles: [["police_officer", null]] },
    { key: "ocKla", email: "oc.kla@ugcms.gov", first: "Robert", last: "Tumukunde", job: "OC Station - CPS Kampala", phone: "+256700000020", nid: "CF20020000010020", roles: [["oc_station", null]] },
    { key: "ocGul", email: "oc.gul@ugcms.gov", first: "Charles", last: "Otim", job: "OC Station - CPS Gulu", phone: "+256700000021", nid: "CF20021000010021", roles: [["oc_station", null]] },
    { key: "dpcKla", email: "dpc.kla@ugcms.gov", first: "Samuel", last: "Wandera", job: "DPC Kampala Metropolitan", phone: "+256700000022", nid: "CF20022000010022", roles: [["dpc", null]] },
    { key: "clerk", email: "clerk.nakamya@ugcms.gov", first: "Mary", last: "Nakamya", job: "Senior Court Clerk", phone: "+256700000023", nid: "CF10023000010023", roles: [["court_clerk", hcKla.id]] },
    { key: "clerk2", email: "clerk.waiswa@ugcms.gov", first: "Godfrey", last: "Waiswa", job: "Court Clerk", phone: "+256700000024", nid: "CF10024000010024", roles: [["court_clerk", cmKla.id]] },
    { key: "registrar", email: "registrar.akello@ugcms.gov", first: "Grace", last: "Akello", job: "Deputy Registrar - High Court", phone: "+256700000025", nid: "CF10025000010025", roles: [["registrar", hcKla.id]] },
    { key: "registrar2", email: "registrar.opio@ugcms.gov", first: "Francis", last: "Opio", job: "Registrar - Supreme Court", phone: "+256700000026", nid: "CF10026000010026", roles: [["registrar", sc.id]] },
    { key: "advocate1", email: "advocate.okello@ugcms.gov", first: "Peter", last: "Okello", job: "Advocate - Okello & Co. Advocates", phone: "+256700000027", nid: "CF00027000010027", roles: [["advocate", null]] },
    { key: "advocate2", email: "advocate.nabirye@ugcms.gov", first: "Florence", last: "Nabirye", job: "Advocate - Nabirye Advocates", phone: "+256700000028", nid: "CF00028000010028", roles: [["advocate", null]] },
    { key: "advocate3", email: "advocate.sserwanga@ugcms.gov", first: "Joseph", last: "Sserwanga", job: "Advocate - Sserwanga & Partners", phone: "+256700000029", nid: "CF00029000010029", roles: [["advocate", null]] },
    { key: "prison1", email: "prison.wasswa@ugcms.gov", first: "James", last: "Wasswa", job: "OC Prison - Luzira", phone: "+256700000030", nid: "CF00030000010030", roles: [["prison_officer", null]] },
    { key: "prison2", email: "prison.nyangoma@ugcms.gov", first: "Betty", last: "Nyangoma", job: "Prison Officer - Gulu", phone: "+256700000031", nid: "CF00031000010031", roles: [["prison_officer", null]] },
    { key: "lc1", email: "lc.kato@ugcms.gov", first: "Moses", last: "Kato", job: "LC I Chairman", phone: "+256700000032", nid: "CF00032000010032", roles: [["lc_official", null]] },
  ];

  for (const def of userDefs) {
    const u = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: { email: def.email, passwordHash: pw, firstName: def.first, lastName: def.last, jobTitle: def.job, phoneNumber: def.phone, nationalId: def.nid, status: "ACTIVE", isVerified: true, lastLoginAt: past(Math.floor(Math.random() * 5)) },
    });
    users[def.key] = { id: u.id, email: u.email };
    for (const [roleSlug, courtId] of def.roles) {
      const rid = (roles as Record<string, { id: string }>)[roleSlug].id;
      try { await prisma.userRole.create({ data: { userId: u.id, roleId: rid, courtId: courtId || null } }); } catch { /* already exists */ }
    }
  }
  console.log(`  ✓ ${userDefs.length} users created`);
  const policeId = users.police.id;

  // ===================== COURT SESSIONS =====================
  console.log("Creating court sessions...");
  const sessionHcKla = await prisma.courtSession.create({ data: { courtId: hcKla.id, name: "Criminal Session Q2 2025", startDate: past(30), endDate: d(60), sessionType: "CRIMINAL_SESSION", status: "ACTIVE", presidingJudgeId: users.judgeKla.id } });
  const sessionHcMbl = await prisma.courtSession.create({ data: { courtId: hcMbl.id, name: "Criminal Session Q3 2025", startDate: d(10), endDate: d(90), sessionType: "CRIMINAL_SESSION", status: "SCHEDULED", presidingJudgeId: users.judgeMbl.id } });
  const sessionHcGul = await prisma.courtSession.create({ data: { courtId: hcGul.id, name: "Criminal Session Q2 2025", startDate: past(60), endDate: past(15), sessionType: "CRIMINAL_SESSION", status: "COMPLETED", presidingJudgeId: users.judgeGul.id } });
  const sessionCmKla = await prisma.courtSession.create({ data: { courtId: cmKla.id, name: "Magistrate Sitting Q2 2025", startDate: past(14), endDate: d(30), sessionType: "CRIMINAL_SESSION", status: "ACTIVE" } });
  const sessionAcDiv = await prisma.courtSession.create({ data: { courtId: acDiv.id, name: "Anti-Corruption Session 2025", startDate: past(10), endDate: d(80), sessionType: "CRIMINAL_SESSION", status: "ACTIVE", presidingJudgeId: users.judgeAC.id } });
  const sessionCommDiv = await prisma.courtSession.create({ data: { courtId: commDiv.id, name: "Commercial Sitting Q2 2025", startDate: past(20), endDate: d(40), sessionType: "CIVIL_SITTING", status: "ACTIVE", presidingJudgeId: users.judgeComm.id } });
  const sessionHcJj = await prisma.courtSession.create({ data: { courtId: hcJj.id, name: "Criminal Session Q2 2025", startDate: past(5), endDate: d(60), sessionType: "CRIMINAL_SESSION", status: "ACTIVE", presidingJudgeId: users.judgeJj.id } });
  console.log(`  ✓ ${7} court sessions`);

  // ===================== CASES =====================
  console.log("Creating cases...");

  // --- CRIMINAL CASES ---
  const case1 = await prisma.case.create({
    data: {
      caseNumber: "HC-KLA-CR-001/2024", caseType: "CRIMINAL", caseStatus: "ON_TRIAL", title: "Uganda vs Mukasa & 3 Others",
      description: "The accused are charged with the murder of the late John Byarugaba on the night of 15th March 2024 at Nsambya, Kampala District. The prosecution alleges that the accused persons, acting in concert, unlawfully caused the death of the deceased with malice aforethought.",
      filingDate: past(180), courtId: hcKla.id, createdById: users.clerk.id, assignedJudgeId: users.judgeKla.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case1.id, offenceType: "Murder", penalCodeSection: "PC 188", offenceDescription: "Unlawful killing with malice aforethought", arrestDate: past(190), isBailable: false, dppSanctionDate: past(170), committalDate: past(165) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case1.id, partyType: "COMPLAINANT", firstName: "Aisha", lastName: "Byarugaba", phoneNumber: "+256772000201" }, { caseId: case1.id, partyType: "ACCUSED", firstName: "Peter", lastName: "Mukasa", phoneNumber: "+256772000202", representation: "LEGAL_AID", lawyerId: users.advocate1.id }, { caseId: case1.id, partyType: "ACCUSED", firstName: "Stephen", lastName: "Ssempijja", phoneNumber: "+256772000203" }, { caseId: case1.id, partyType: "ACCUSED", firstName: "Robert", lastName: "Kato", phoneNumber: "+256772000204" }, { caseId: case1.id, partyType: "ACCUSED", firstName: "David", lastName: "Wasswa", phoneNumber: "+256772000205" }, { caseId: case1.id, partyType: "WITNESS", firstName: "Grace", lastName: "Nambi", phoneNumber: "+256772000206" }, { caseId: case1.id, partyType: "WITNESS", firstName: "James", lastName: "Okello", phoneNumber: "+256772000207" }] });
  await createTimeline(case1.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Case Filed", description: "Murder case registered at High Court Kampala", daysAgo: 180 }, { eventType: "DPP_REVIEW", title: "DPP Sanction", description: "DPP sanctioned prosecution", daysAgo: 170 }, { eventType: "COMMITTAL", title: "Committed for Trial", description: "Committed from Chief Magistrate Court", daysAgo: 165 }, { eventType: "PLEA_TAKING", title: "Plea Taken", description: "All accused pleaded not guilty", daysAgo: 150 }, { eventType: "HEARING_SCHEDULED", title: "Trial Hearing Scheduled", description: "First trial date set for prosecution witnesses", daysAgo: 145 }, { eventType: "EVIDENCE_REGISTERED", title: "Evidence Submitted", description: "Post-mortem report and witness statements filed", daysAgo: 130 }]);
  const h1 = await createHearing(case1.id, hcKla.id, users.clerk.id, { type: "FIRST_MENTION", daysAgo: 175, outcome: "Accused remanded. Hearing adjourned for committal." });
  const h1b = await createHearing(case1.id, hcKla.id, users.clerk.id, { type: "COMMITTAL", daysAgo: 165, outcome: "Committed to High Court for trial" });
  const h1c = await createHearing(case1.id, hcKla.id, users.clerk.id, { type: "PLEA_TAKING", daysAgo: 150, outcome: "Not guilty plea entered" });
  const h1d = await createHearing(case1.id, hcKla.id, users.clerk.id, { type: "TRIAL", daysAgo: 30, outcome: "Prosecution witness PW1 testified. Cross-examination ongoing.", adjourned: true, adjournDate: 30, adjournReason: "Defence counsel requested time to review new evidence." });
  await createEvidence(case1.id, policeId, { exhibitNumber: "PE-001", description: "Post-mortem examination report by Dr. Musinguzi, Mulago Hospital", type: "DOCUMENT", status: "ADMITTED", daysAgo: 130 });
  await createEvidence(case1.id, policeId, { exhibitNumber: "PE-002", description: "Blood-stained panga recovered from 2nd accused's residence", type: "PHYSICAL_EXHIBIT", status: "ADMITTED", daysAgo: 120 });
  await createEvidence(case1.id, policeId, { exhibitNumber: "PE-003", description: "Mobile phone call records showing communication between accused", type: "DIGITAL", status: "SUBMITTED_TO_COURT", daysAgo: 60 });
  await createEvidence(case1.id, policeId, { exhibitNumber: "PE-004", description: "Crime scene photographs - 12 images", type: "PHOTOGRAPH", status: "ADMITTED", daysAgo: 110 });

  const ba1 = await prisma.bailApplication.create({ data: { caseId: case1.id, applicantId: users.advocate1.id, filingDate: past(170), decision: "DENIED", decisionDate: past(165), decisionReason: "Capital offence. No exceptional circumstances demonstrated. Risk of absconding.", decidedBy: users.judgeKla.id } });
  await prisma.surety.create({ data: { bailApplicationId: ba1.id, fullName: "Mukasa Kintu", nationalId: "CF80001110000101", occupation: "Farmer", relationshipToAccused: "Brother", bondAmount: 5000000, verifiedById: users.registrar.id, verificationStatus: "VERIFIED" } });

  await prisma.detentionRecord.create({ data: { personId: users.advocate1.id, caseId: case1.id, facilityName: "Luzira Upper Prison", admissionDate: past(190), status: "REMAND", warrantNumber: "RW-001/2024", warrantType: "REMAND" } });

  const case2 = await prisma.case.create({
    data: {
      caseNumber: "HC-MBL-CR-042/2025", caseType: "CRIMINAL", caseStatus: "COMMITTED_FOR_TRIAL", title: "Uganda vs Okello & Another",
      description: "The accused are charged with aggravated robbery contrary to sections 285 and 286(2) of the Penal Code Act. On 5th January 2025 at Mbale Town, the accused robbed the complainant of UGX 15,000,000 at gunpoint.",
      filingDate: past(120), courtId: hcMbl.id, createdById: users.clerk2.id, assignedJudgeId: users.judgeMbl.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case2.id, offenceType: "Aggravated Robbery", penalCodeSection: "PC 285-286", offenceDescription: "Robbery with use of a deadly weapon", arrestDate: past(125), isBailable: true, dppSanctionDate: past(115), committalDate: past(60) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case2.id, partyType: "COMPLAINANT", firstName: "Ali", lastName: "Muhammad", phoneNumber: "+256773000301" }, { caseId: case2.id, partyType: "ACCUSED", firstName: "James", lastName: "Okello", phoneNumber: "+256773000302", representation: "LEGAL_AID", lawyerId: users.advocate2.id }, { caseId: case2.id, partyType: "ACCUSED", firstName: "Francis", lastName: "Otim", phoneNumber: "+256773000303" }] });
  await createTimeline(case2.id, users.clerk2.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 120 }, { eventType: "DPP_REVIEW", title: "DPP Sanction", daysAgo: 115 }, { eventType: "COMMITTAL", title: "Committed for Trial", daysAgo: 60 }]);
  await createHearing(case2.id, hcMbl.id, users.clerk2.id, { type: "FIRST_MENTION", daysAgo: 118, outcome: "Accused remanded. Bail application to be filed." });
  await createHearing(case2.id, hcMbl.id, users.clerk2.id, { type: "BAIL_HEARING", daysAgo: 100, outcome: "Bail denied. Case to proceed to committal." });
  await createHearing(case2.id, hcMbl.id, users.clerk2.id, { type: "COMMITTAL", daysAgo: 60, outcome: "Committed for trial. Set for criminal session Q3 2025." });
  await createEvidence(case2.id, policeId, { exhibitNumber: "PE-005", description: "Recovered SMG rifle - serial number partially filed off", type: "PHYSICAL_EXHIBIT", status: "IN_CUSTODY", daysAgo: 110 });
  await createEvidence(case2.id, policeId, { exhibitNumber: "PE-006", description: "CCTV footage from Mbale Central Market - timestamped", type: "VIDEO", status: "SUBMITTED_TO_COURT", daysAgo: 80 });
  const ba2 = await prisma.bailApplication.create({ data: { caseId: case2.id, applicantId: users.advocate2.id, filingDate: past(105), decision: "DENIED", decisionDate: past(100), decisionReason: "Flight risk. Weapon used suggests danger to community.", decidedBy: users.judgeMbl.id, bailAmount: 2000000 } });
  await prisma.detentionRecord.create({ data: { personId: users.advocate2.id, caseId: case2.id, facilityName: "Mbale Government Prison", admissionDate: past(125), status: "REMAND", warrantNumber: "RW-042/2025", warrantType: "REMAND" } });

  const case3 = await prisma.case.create({
    data: {
      caseNumber: "CM-KLA-CR-156/2025", caseType: "CRIMINAL", caseStatus: "JUDGMENT_DELIVERED", title: "Uganda vs Nakamya",
      description: "The accused is charged with theft of a motor vehicle contrary to section 254 of the Penal Code Act. On 12th November 2024 at Wandegeya, the accused stole a Toyota Premio registration number UBA 234P valued at UGX 25,000,000.",
      filingDate: past(200), courtId: cmKla.id, createdById: users.clerk2.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case3.id, offenceType: "Theft of Motor Vehicle", penalCodeSection: "PC 254", arrestDate: past(205), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case3.id, partyType: "COMPLAINANT", firstName: "Richard", lastName: "Tumwesigye", phoneNumber: "+256774000401" }, { caseId: case3.id, partyType: "ACCUSED", firstName: "Janet", lastName: "Nakamya", phoneNumber: "+256774000402", representation: "SELF" }] });
  await createTimeline(case3.id, users.clerk2.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 200 }, { eventType: "PLEA_TAKING", title: "Plea of Not Guilty", daysAgo: 190 }, { eventType: "JUDGMENT", title: "Judgment Delivered", description: "Accused found guilty on all counts. Sentenced to 3 years imprisonment with compensation of UGX 25,000,000 to complainant.", daysAgo: 10 }]);
  await createHearing(case3.id, cmKla.id, users.clerk2.id, { type: "FIRST_MENTION", daysAgo: 195, outcome: "Bail granted. Hearing adjourned for plea." });
  await createHearing(case3.id, cmKla.id, users.clerk2.id, { type: "PLEA_TAKING", daysAgo: 190, outcome: "Not guilty plea entered." });
  await createHearing(case3.id, cmKla.id, users.clerk2.id, { type: "TRIAL", daysAgo: 60, outcome: "Prosecution case closed. Defence opens." });
  await createHearing(case3.id, cmKla.id, users.clerk2.id, { type: "TRIAL", daysAgo: 30, outcome: "Defence case closed. Submissions filed." });
  await createHearing(case3.id, cmKla.id, users.clerk2.id, { type: "JUDGMENT", daysAgo: 10, outcome: "Convicted. Sentenced to 3 years. Compensation UGX 25M ordered." });
  await createEvidence(case3.id, policeId, { exhibitNumber: "PE-007", description: "Vehicle registration documents in complainant's name", type: "DOCUMENT", status: "ADMITTED", daysAgo: 150 });
  await createEvidence(case3.id, policeId, { exhibitNumber: "PE-008", description: "CCTV footage from Wandegeya fuel station", type: "VIDEO", status: "ADMITTED", daysAgo: 140 });
  const ba3 = await prisma.bailApplication.create({ data: { caseId: case3.id, applicantId: users.advocate3.id, filingDate: past(198), decision: "GRANTED", decisionDate: past(195), decisionReason: "Bailable offence. Accused has fixed abode and substantial sureties.", decidedBy: users.judgeJj.id, bailAmount: 1000000 } });
  await prisma.surety.create({ data: { bailApplicationId: ba3.id, fullName: "Nakamya Grace", nationalId: "CF80002220000201", occupation: "Teacher", relationshipToAccused: "Sister", bondAmount: 1000000, verifiedById: users.registrar2.id, verificationStatus: "VERIFIED" } });

  const case4 = await prisma.case.create({
    data: {
      caseNumber: "HC-KLA-CR-089/2025", caseType: "CRIMINAL", caseStatus: "UNDER_INVESTIGATION", title: "Uganda vs Ssempijja & 2 Others",
      description: "The accused are charged with defilement of a minor contrary to section 129 of the Penal Code Act. The victim, aged 14, was allegedly defiled repeatedly between January and March 2025 in Kawempe Division.",
      filingDate: past(45), courtId: hcKla.id, createdById: users.police.id, isSensitive: true,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case4.id, offenceType: "Defilement", penalCodeSection: "PC 129", offenceDescription: "Sexual assault of a minor under 18", arrestDate: past(50), isBailable: false } });
  await prisma.caseParty.createMany({ data: [{ caseId: case4.id, partyType: "VICTIM", firstName: "[REDACTED]", lastName: "[MINOR]", isMinor: true }, { caseId: case4.id, partyType: "ACCUSED", firstName: "Joseph", lastName: "Ssempijja", phoneNumber: "+256775000501" }, { caseId: case4.id, partyType: "ACCUSED", firstName: "Moses", lastName: "Kibuka", phoneNumber: "+256775000502" }, { caseId: case4.id, partyType: "WITNESS", firstName: "Dr.", lastName: "Nakibuuka", phoneNumber: "+256775000503" }] });
  await createTimeline(case4.id, users.police.id, [{ eventType: "CASE_REPORTED", title: "Case Reported", description: "Case reported by mother of victim at CPS Kampala", daysAgo: 55 }, { eventType: "INVESTIGATION_STARTED", title: "Investigation Opened", description: "CID assigned to investigate", daysAgo: 50 }]);
  const inv4 = await prisma.investigation.create({ data: { caseId: case4.id, policeStationId: psKla.id, assignedOfficerId: users.police.id, supervisingOfficerId: users.ocKla.id, startDate: past(50), status: "ACTIVE" } });
  await createEvidence(case4.id, policeId, { exhibitNumber: "PE-009", description: "Medical examination report from Mulago Hospital - Form 3A", type: "DOCUMENT", status: "IN_CUSTODY", daysAgo: 40 });
  await prisma.detentionRecord.create({ data: { personId: users.police.id, caseId: case4.id, facilityName: "Luzira Upper Prison", admissionDate: past(50), status: "REMAND", warrantNumber: "RW-089/2025", warrantType: "REMAND" } });

  const case5 = await prisma.case.create({
    data: {
      caseNumber: "HC-ACD-CR-007/2025", caseType: "ANTI_CORRUPTION", caseStatus: "UNDER_INVESTIGATION", title: "Uganda vs Byaruhanga",
      description: "The accused, a Principal Accountant in the Ministry of Works, is charged with embezzlement and causing financial loss to the government of approximately UGX 2,400,000,000 allocated for road maintenance in Karamoja region.",
      filingDate: past(90), courtId: acDiv.id, createdById: users.prosecutor.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case5.id, offenceType: "Embezzlement", penalCodeSection: "PC 268", offenceDescription: "Embezzlement of public funds by a public officer", arrestDate: past(95), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case5.id, partyType: "COMPLAINANT", firstName: "Inspectorate", lastName: "of Government", phoneNumber: "+256776000601" }, { caseId: case5.id, partyType: "ACCUSED", firstName: "Charles", lastName: "Byaruhanga", phoneNumber: "+256776000602", representation: "PRIVATE", lawyerId: users.advocate3.id }] });
  await createTimeline(case5.id, users.prosecutor.id, [{ eventType: "DOCKET_OPENED", title: "IGG Investigation Referred", description: "Inspectorate of Government referred the case to DPP", daysAgo: 95 }, { eventType: "DPP_REVIEW", title: "Under DPP Review", description: "DPP reviewing IGG investigation report", daysAgo: 85 }]);
  const inv5 = await prisma.investigation.create({ data: { caseId: case5.id, policeStationId: cidKla.id, assignedOfficerId: users.police3.id, supervisingOfficerId: users.dpcKla.id, pgiProsecutorId: users.prosecutor2.id, startDate: past(85), status: "ACTIVE" } });
  await createEvidence(case5.id, policeId, { exhibitNumber: "PE-010", description: "Audit report by Auditor General - FY 2023/24 Karamoja roads", type: "DOCUMENT", status: "IN_CUSTODY", daysAgo: 80 });
  await createEvidence(case5.id, policeId, { exhibitNumber: "PE-011", description: "Bank statements of accused - 12 months", type: "DOCUMENT", status: "IN_CUSTODY", daysAgo: 70 });
  await createEvidence(case5.id, policeId, { exhibitNumber: "PE-012", description: "Forensic audit report on road maintenance contracts", type: "FORENSIC", status: "IN_CUSTODY", daysAgo: 50 });

  const case6 = await prisma.case.create({
    data: {
      caseNumber: "HC-GUL-CR-032/2025", caseType: "CRIMINAL", caseStatus: "UNDER_INVESTIGATION", title: "Uganda vs Oryem & 5 Others",
      description: "The accused are charged with drug trafficking contrary to the Narcotic Drugs and Psychotropic Substances Act. 150kg of cannabis was intercepted at Gulu bus terminal destined for Kampala.",
      filingDate: past(70), courtId: hcGul.id, createdById: users.police2.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case6.id, offenceType: "Drug Trafficking", penalCodeSection: "NDPSA S.5", arrestDate: past(75), isBailable: false } });
  await prisma.caseParty.createMany({ data: [{ caseId: case6.id, partyType: "COMPLAINANT", firstName: "Uganda", lastName: "Police Force", phoneNumber: "+256777000701" }, { caseId: case6.id, partyType: "ACCUSED", firstName: "Patrick", lastName: "Oryem", phoneNumber: "+256777000702" }] });
  await createTimeline(case6.id, users.police2.id, [{ eventType: "CASE_REPORTED", title: "Arrest Made", description: "Suspects arrested at Gulu bus terminal with 150kg cannabis", daysAgo: 75 }, { eventType: "INVESTIGATION_STARTED", title: "Investigation Opened", daysAgo: 70 }]);
  const inv6 = await prisma.investigation.create({ data: { caseId: case6.id, policeStationId: psGul.id, assignedOfficerId: users.police2.id, supervisingOfficerId: users.ocGul.id, startDate: past(70), status: "ACTIVE" } });
  await createEvidence(case6.id, policeId, { exhibitNumber: "PE-013", description: "150kg seized cannabis - stored at Gulu Police exhibit room", type: "PHYSICAL_EXHIBIT", status: "IN_CUSTODY", daysAgo: 70 });
  await prisma.detentionRecord.create({ data: { personId: users.police2.id, caseId: case6.id, facilityName: "Gulu Government Prison", admissionDate: past(75), status: "REMAND", warrantNumber: "RW-032/2025", warrantType: "REMAND" } });

  const case7 = await prisma.case.create({
    data: {
      caseNumber: "HC-FP-CR-015/2025", caseType: "CRIMINAL", caseStatus: "CLOSED", title: "Uganda vs Bwambale",
      description: "The accused was charged with assault causing actual bodily harm contrary to section 236 of the Penal Code Act. Incident occurred during a land dispute at Kasese.",
      filingDate: past(300), courtId: hcFp.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case7.id, offenceType: "Assault Causing ABH", penalCodeSection: "PC 236", arrestDate: past(310), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case7.id, partyType: "COMPLAINANT", firstName: "Yokonia", lastName: "Mumbere", phoneNumber: "+256778000801" }, { caseId: case7.id, partyType: "ACCUSED", firstName: "Geoffrey", lastName: "Bwambale", phoneNumber: "+256778000802" }] });
  await createTimeline(case7.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 300 }, { eventType: "JUDGMENT", title: "Judgment Delivered", description: "Accused convicted. Fined UGX 500,000 and bound over to keep peace for 12 months.", daysAgo: 30 }, { eventType: "CASE_CLOSED", title: "Case Closed", description: "Fine paid. Case closed.", daysAgo: 28 }]);
  await createHearing(case7.id, hcFp.id, users.clerk.id, { type: "FIRST_MENTION", daysAgo: 290, outcome: "Plea of not guilty." });
  await createHearing(case7.id, hcFp.id, users.clerk.id, { type: "TRIAL", daysAgo: 100, outcome: "Evidence heard." });
  await createHearing(case7.id, hcFp.id, users.clerk.id, { type: "JUDGMENT", daysAgo: 30, outcome: "Convicted. Fine UGX 500,000. 12-month peace bond." });

  const case8 = await prisma.case.create({
    data: {
      caseNumber: "HC-JJ-CR-022/2025", caseType: "CRIMINAL", caseStatus: "PENDING_JUDGMENT", title: "Uganda vs Wanyama",
      description: "The accused is charged with manslaughter contrary to section 187 of the Penal Code Act. The deceased died following a fight at a bar in Jinja Town.",
      filingDate: past(150), courtId: hcJj.id, createdById: users.clerk2.id, assignedJudgeId: users.judgeJj.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case8.id, offenceType: "Manslaughter", penalCodeSection: "PC 187", arrestDate: past(155), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case8.id, partyType: "COMPLAINANT", firstName: "Family of", lastName: "Wafula (Deceased)", phoneNumber: "+256779000901" }, { caseId: case8.id, partyType: "ACCUSED", firstName: "Samuel", lastName: "Wanyama", phoneNumber: "+256779000902", representation: "LEGAL_AID", lawyerId: users.advocate1.id }] });
  await createTimeline(case8.id, users.clerk2.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 150 }, { eventType: "TRIAL_STARTED", title: "Trial Commenced", daysAgo: 80 }]);
  await createHearing(case8.id, hcJj.id, users.clerk2.id, { type: "FIRST_MENTION", daysAgo: 145, outcome: "Bail hearing set." });
  await createHearing(case8.id, hcJj.id, users.clerk2.id, { type: "BAIL_HEARING", daysAgo: 140, outcome: "Bail granted on conditions." });
  await createHearing(case8.id, hcJj.id, users.clerk2.id, { type: "TRIAL", daysAgo: 60, outcome: "Prosecution witnesses testified." });
  await createHearing(case8.id, hcJj.id, users.clerk2.id, { type: "TRIAL", daysAgo: 20, outcome: "Defence case closed. Final submissions made. Judgment reserved." });
  await createEvidence(case8.id, policeId, { exhibitNumber: "PE-014", description: "Medical report on cause of death - Jinja Referral Hospital", type: "DOCUMENT", status: "ADMITTED", daysAgo: 130 });
  const ba8 = await prisma.bailApplication.create({ data: { caseId: case8.id, applicantId: users.advocate1.id, filingDate: past(142), decision: "GRANTED", decisionDate: past(140), decisionReason: "Accused has substantial sureties. Not a flight risk.", decidedBy: users.judgeJj.id, bailAmount: 3000000 } });
  await prisma.surety.create({ data: { bailApplicationId: ba8.id, fullName: "Wanyama Robert", nationalId: "CF80003330000201", occupation: "Teacher", relationshipToAccused: "Brother", bondAmount: 3000000, verifiedById: users.registrar.id, verificationStatus: "VERIFIED" } });

  // --- CIVIL CASES ---
  const case9 = await prisma.case.create({
    data: {
      caseNumber: "HC-KLA-CV-018/2025", caseType: "CIVIL", caseStatus: "ACTIVE", title: "Okello vs Attorney General",
      description: "The plaintiff claims damages for unlawful detention and violation of constitutional rights. He was detained for 14 days without being produced in court, in violation of the 48-hour rule under Article 23 of the Constitution.",
      filingDate: past(100), courtId: hcKla.id, createdById: users.clerk.id, assignedJudgeId: users.judgeKla.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case9.id, claimAmount: 150000000, causeOfAction: "Constitutional tort - unlawful detention and violation of right to personal liberty", natureOfDispute: "Constitutional Tort", plaintFiledDate: past(100), defenceFiledDate: past(70) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case9.id, partyType: "APPLICANT", firstName: "Patrick", lastName: "Okello", phoneNumber: "+256780001001", representation: "PRIVATE", lawyerId: users.advocate2.id }, { caseId: case9.id, partyType: "RESPONDENT", firstName: "Attorney", lastName: "General of Uganda" }] });
  await createTimeline(case9.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Plaint Filed", description: "Constitutional tort claim filed", daysAgo: 100 }, { eventType: "DEFENCE_FILED", title: "Defence Filed", description: "AG's office filed written statement of defence", daysAgo: 70 }, { eventType: "CMC_HELD", title: "Case Management Conference", description: "CMC held. Scheduled for hearing.", daysAgo: 40 }]);
  await createHearing(case9.id, hcKla.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 40, outcome: "CMC held. Hearing set for July 2025." });

  const case10 = await prisma.case.create({
    data: {
      caseNumber: "HC-MBR-CV-031/2025", caseType: "CIVIL", caseStatus: "PENDING_JUDGMENT", title: "Nabukenya vs Kaggwa",
      description: "Land dispute involving 15 acres of prime land in Mbarara District. The plaintiff claims ownership through customary tenure, while the defendant claims registered title.",
      filingDate: past(200), courtId: hcMbr.id, createdById: users.clerk.id, assignedJudgeId: users.judgeMbr.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case10.id, claimAmount: 85000000, causeOfAction: "Trespass to land and unlawful occupation", natureOfDispute: "Land Dispute - Customary vs Registered Title", plaintFiledDate: past(200), defenceFiledDate: past(170), replyFiledDate: past(150), cmcDate: past(120) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case10.id, partyType: "APPLICANT", firstName: "Jane", lastName: "Nabukenya", phoneNumber: "+256781001101", representation: "PRIVATE", lawyerId: users.advocate3.id }, { caseId: case10.id, partyType: "RESPONDENT", firstName: "Robert", lastName: "Kaggwa", phoneNumber: "+256781001102" }] });
  await createTimeline(case10.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Plaint Filed", daysAgo: 200 }, { eventType: "DEFENCE_FILED", title: "Defence Filed", daysAgo: 170 }, { eventType: "CMC_HELD", title: "CMC Held", daysAgo: 120 }, { eventType: "TRIAL_COMPLETE", title: "Trial Complete", description: "Both parties closed their cases. Submissions filed. Judgment reserved.", daysAgo: 15 }]);
  await createHearing(case10.id, hcMbr.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 120, outcome: "CMC held. Trial dates set." });
  await createHearing(case10.id, hcMbr.id, users.clerk.id, { type: "TRIAL", daysAgo: 80, outcome: "Plaintiff testified. Witness PW1 called." });
  await createHearing(case10.id, hcMbr.id, users.clerk.id, { type: "TRIAL", daysAgo: 50, outcome: "Defence case heard. DW1 and DW2 testified." });
  await createHearing(case10.id, hcMbr.id, users.clerk.id, { type: "TRIAL", daysAgo: 30, outcome: "Final submissions filed. Judgment reserved." });

  const case11 = await prisma.case.create({
    data: {
      caseNumber: "HC-COMM-CV-007/2025", caseType: "COMMERCIAL", caseStatus: "JUDGMENT_DELIVERED", title: "Nile Breweries Ltd vs Eastern Uganda Distributors Ltd",
      description: "Claim for breach of exclusive distribution agreement. The defendant allegedly sold competing products in violation of the exclusivity clause in their contract.",
      filingDate: past(250), courtId: commDiv.id, createdById: users.clerk.id, assignedJudgeId: users.judgeComm.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case11.id, claimAmount: 450000000, causeOfAction: "Breach of Contract - violation of exclusivity clause", natureOfDispute: "Commercial Contract Dispute", plaintFiledDate: past(250), defenceFiledDate: past(220) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case11.id, partyType: "APPLICANT", firstName: "Nile", lastName: "Breweries Ltd", representation: "PRIVATE", lawyerId: users.advocate1.id }, { caseId: case11.id, partyType: "RESPONDENT", firstName: "Eastern Uganda", lastName: "Distributors Ltd", representation: "PRIVATE", lawyerId: users.advocate3.id }] });
  await createTimeline(case11.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Plaint Filed", daysAgo: 250 }, { eventType: "DEFENCE_FILED", title: "Defence Filed", daysAgo: 220 }, { eventType: "JUDGMENT", title: "Judgment Delivered", description: "Judgment for plaintiff. Damages of UGX 300,000,000 awarded plus costs.", daysAgo: 20 }]);
  await createHearing(case11.id, commDiv.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 200 });
  await createHearing(case11.id, commDiv.id, users.clerk.id, { type: "TRIAL", daysAgo: 100, outcome: "Plaintiff case heard." });
  await createHearing(case11.id, commDiv.id, users.clerk.id, { type: "JUDGMENT", daysAgo: 20, outcome: "Judgment for plaintiff. UGX 300M damages." });

  const case12 = await prisma.case.create({
    data: {
      caseNumber: "HC-GUL-CV-009/2025", caseType: "CIVIL", caseStatus: "FILED_IN_COURT", title: "Acholi Cultural Foundation vs Nile Agro Industries Ltd",
      description: "The plaintiff claims that the defendant illegally acquired 500 acres of communal land in Amuru District. The land is alleged to be ancestral burial grounds of the Acholi people.",
      filingDate: past(20), courtId: hcGul.id, createdById: users.clerk2.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case12.id, claimAmount: 500000000, causeOfAction: "Illegal acquisition of communal land and trespass to ancestral burial grounds", natureOfDispute: "Land Grabbing - Communal Land", plaintFiledDate: past(20), isUrgent: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case12.id, partyType: "APPLICANT", firstName: "Acholi Cultural", lastName: "Foundation", representation: "LEGAL_AID", lawyerId: users.advocate2.id }, { caseId: case12.id, partyType: "RESPONDENT", firstName: "Nile Agro", lastName: "Industries Ltd", representation: "PRIVATE", lawyerId: users.advocate3.id }] });
  await createTimeline(case12.id, users.clerk2.id, [{ eventType: "CASE_FILED", title: "Plaint Filed (Urgent)", description: "Interim injunction sought to stop further development", daysAgo: 20 }]);

  // --- FAMILY CASES ---
  const case13 = await prisma.case.create({
    data: {
      caseNumber: "HC-FAM-CV-022/2025", caseType: "FAMILY", caseStatus: "ACTIVE", title: "Nantongo vs Matovu",
      description: "Petition for dissolution of marriage on grounds of cruelty and adultery. The couple has been married for 12 years and has three children. Custody and property division are contested.",
      filingDate: past(60), courtId: famDiv.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case13.id, causeOfAction: "Dissolution of marriage under section 4 of the Divorce Act", natureOfDispute: "Divorce - Contested", plaintFiledDate: past(60), defenceFiledDate: past(40) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case13.id, partyType: "APPLICANT", firstName: "Sarah", lastName: "Nantongo", phoneNumber: "+256782001301", representation: "PRIVATE", lawyerId: users.advocate1.id }, { caseId: case13.id, partyType: "RESPONDENT", firstName: "Daniel", lastName: "Matovu", phoneNumber: "+256782001302", representation: "PRIVATE", lawyerId: users.advocate3.id }] });
  await createTimeline(case13.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Petition Filed", daysAgo: 60 }, { eventType: "DEFENCE_FILED", title: "Answer to Petition Filed", daysAgo: 40 }]);
  await createHearing(case13.id, famDiv.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 20, outcome: "Mediation ordered. Parties to attend family mediation." });

  const case14 = await prisma.case.create({
    data: {
      caseNumber: "HC-FAM-CV-033/2025", caseType: "FAMILY", caseStatus: "FILED_IN_COURT", title: "Nakamya vs Mugisha",
      description: "Application for legal custody of minor children. The applicant, maternal grandmother, seeks custody following the death of the children's mother (her daughter). The father contests.",
      filingDate: past(10), courtId: famDiv.id, createdById: users.clerk2.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case14.id, causeOfAction: "Application for custody under the Children Act", natureOfDispute: "Child Custody", plaintFiledDate: past(10), isUrgent: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case14.id, partyType: "APPLICANT", firstName: "Margaret", lastName: "Nakamya", phoneNumber: "+256783001401", isMinor: false }, { caseId: case14.id, partyType: "RESPONDENT", firstName: "Brian", lastName: "Mugisha", phoneNumber: "+256783001402" }] });

  // --- LAND CASES ---
  const case15 = await prisma.case.create({
    data: {
      caseNumber: "HC-LAND-CV-012/2025", caseType: "LAND", caseStatus: "ON_TRIAL", title: "Bwengye vs Nsubuga & KCCA",
      description: "Dispute over a 2-acre plot in Ntinda, Kampala. Plaintiff claims ownership since 1995. 1st defendant claims to have purchased from KCCA. 2nd defendant claims the sale was lawful.",
      filingDate: past(130), courtId: landDiv.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case15.id, claimAmount: 200000000, causeOfAction: "Trespass to land and cancellation of title", natureOfDispute: "Land Title Dispute", plaintFiledDate: past(130), defenceFiledDate: past(100) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case15.id, partyType: "APPLICANT", firstName: "James", lastName: "Bwengye", phoneNumber: "+256784001501", representation: "PRIVATE", lawyerId: users.advocate2.id }, { caseId: case15.id, partyType: "RESPONDENT", firstName: "Hassan", lastName: "Nsubuga", phoneNumber: "+256784001502" }, { caseId: case15.id, partyType: "RESPONDENT", firstName: "Kampala Capital", lastName: "City Authority" }] });
  await createTimeline(case15.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Plaint Filed", daysAgo: 130 }, { eventType: "TRIAL_STARTED", title: "Trial Commenced", daysAgo: 40 }]);
  await createHearing(case15.id, landDiv.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 100 });
  await createHearing(case15.id, landDiv.id, users.clerk.id, { type: "TRIAL", daysAgo: 40, outcome: "Plaintiff testified. Surveyor's report admitted." });
  await createEvidence(case15.id, policeId, { exhibitNumber: "PE-015", description: "Surveyor's report and site plan - Ntinda Plot 24", type: "DOCUMENT", status: "ADMITTED", daysAgo: 50 });

  const case16 = await prisma.case.create({
    data: {
      caseNumber: "HC-LAND-CV-025/2025", caseType: "LAND", caseStatus: "JUDGMENT_DELIVERED", title: "Kyambadde vs Kampala Capital City Authority",
      description: "Claim for compensation following compulsory acquisition of land for road expansion. Plaintiff claims UGX 350,000,000 as fair market value.",
      filingDate: past(350), courtId: landDiv.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case16.id, claimAmount: 350000000, causeOfAction: "Compulsory acquisition - inadequate compensation", natureOfDispute: "Compensation Dispute", plaintFiledDate: past(350), defenceFiledDate: past(320) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case16.id, partyType: "APPLICANT", firstName: "Charles", lastName: "Kyambadde", phoneNumber: "+256785001601" }, { caseId: case16.id, partyType: "RESPONDENT", firstName: "Kampala Capital", lastName: "City Authority" }] });
  await createTimeline(case16.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Plaint Filed", daysAgo: 350 }, { eventType: "JUDGMENT", title: "Judgment Delivered", description: "Compensation of UGX 280,000,000 awarded with 8% interest from date of acquisition.", daysAgo: 50 }]);
  await createHearing(case16.id, landDiv.id, users.clerk.id, { type: "TRIAL", daysAgo: 150 });
  await createHearing(case16.id, landDiv.id, users.clerk.id, { type: "JUDGMENT", daysAgo: 50, outcome: "UGX 280M awarded. 8% interest." });

  // --- COMMERCIAL CASES ---
  const case17 = await prisma.case.create({
    data: {
      caseNumber: "HC-COMM-CV-011/2025", caseType: "COMMERCIAL", caseStatus: "FILED_IN_COURT", title: "MTN Uganda Ltd vs Uganda Communications Commission",
      description: "Judicial review application challenging UCC's decision to impose a UGX 5 billion fine on MTN for alleged non-compliance with SIM card registration regulations.",
      filingDate: past(15), courtId: commDiv.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case17.id, claimAmount: 5000000000, causeOfAction: "Judicial review - challenge to administrative decision", natureOfDispute: "Regulatory Dispute" } });
  await prisma.caseParty.createMany({ data: [{ caseId: case17.id, partyType: "APPLICANT", firstName: "MTN", lastName: "Uganda Ltd", representation: "PRIVATE", lawyerId: users.advocate1.id }, { caseId: case17.id, partyType: "RESPONDENT", firstName: "Uganda Communications", lastName: "Commission" }] });

  // --- ANTI-CORRUPTION CASES ---
  const case18 = await prisma.case.create({
    data: {
      caseNumber: "HC-ACD-CR-015/2025", caseType: "ANTI_CORRUPTION", caseStatus: "ACTIVE", title: "Uganda vs Waiswa & 2 Others",
      description: "The accused, a District Engineer and two contractors, are charged with abuse of office and collusion to inflate contract prices for road construction in Bududa District. Loss to government estimated at UGX 1.2 billion.",
      filingDate: past(110), courtId: acDiv.id, createdById: users.prosecutor.id, assignedJudgeId: users.judgeAC.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case18.id, offenceType: "Abuse of Office & Causing Financial Loss", penalCodeSection: "PC 87 & Anti-Corruption Act S.11", arrestDate: past(115), isBailable: true, dppSanctionDate: past(100) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case18.id, partyType: "COMPLAINANT", firstName: "State House Anti-Corruption", lastName: "Unit", phoneNumber: "+256786001801" }, { caseId: case18.id, partyType: "ACCUSED", firstName: "Sam", lastName: "Waiswa", phoneNumber: "+256786001802", representation: "PRIVATE", lawyerId: users.advocate2.id }, { caseId: case18.id, partyType: "ACCUSED", firstName: "Moses", lastName: "Mubiru", phoneNumber: "+256786001803" }, { caseId: case18.id, partyType: "ACCUSED", firstName: "Grace", lastName: "Auma", phoneNumber: "+256786001804" }] });
  await createTimeline(case18.id, users.prosecutor.id, [{ eventType: "CASE_FILED", title: "Charges Filed", daysAgo: 110 }, { eventType: "PLEA_TAKING", title: "Plea Taken", description: "All three accused pleaded not guilty", daysAgo: 90 }]);
  await createHearing(case18.id, acDiv.id, users.prosecutor.id, { type: "FIRST_MENTION", daysAgo: 105, outcome: "Bail granted with conditions." });
  await createHearing(case18.id, acDiv.id, users.prosecutor.id, { type: "PLEA_TAKING", daysAgo: 90, outcome: "Not guilty pleas entered." });
  await createHearing(case18.id, acDiv.id, users.prosecutor.id, { type: "TRIAL", daysAgo: 30, outcome: "PW1 (auditor) testified regarding inflated contracts." });
  const inv18 = await prisma.investigation.create({ data: { caseId: case18.id, policeStationId: cidKla.id, assignedOfficerId: users.police3.id, supervisingOfficerId: users.dpcKla.id, pgiProsecutorId: users.prosecutor2.id, startDate: past(115), status: "ACTIVE" } });
  await createEvidence(case18.id, policeId, { exhibitNumber: "PE-016", description: "Audit report on Bududa District road contracts 2023-2024", type: "DOCUMENT", status: "ADMITTED", daysAgo: 90 });
  await createEvidence(case18.id, policeId, { exhibitNumber: "PE-017", description: "Bank transfer records showing payments to contractors", type: "DIGITAL", status: "ADMITTED", daysAgo: 80 });
  const ba18 = await prisma.bailApplication.create({ data: { caseId: case18.id, applicantId: users.advocate2.id, filingDate: past(108), decision: "GRANTED", decisionDate: past(105), decisionReason: "Bailable offence. Accused surrendered passport.", decidedBy: users.judgeAC.id, bailAmount: 5000000, conditions: "Surrender passport. Report to CPS Kampala every Monday." } });

  const case19 = await prisma.case.create({
    data: {
      caseNumber: "HC-KLA-CR-201/2024", caseType: "CRIMINAL", caseStatus: "UNDER_INVESTIGATION", title: "Uganda vs Kintu & Another",
      description: "The accused are charged with kidnapping with intent to murder. The victim was taken from his residence in Entebbe and held for ransom of UGX 50,000,000.",
      filingDate: past(35), courtId: hcKla.id, createdById: users.police.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case19.id, offenceType: "Kidnapping with Intent to Murder", penalCodeSection: "PC 231", arrestDate: past(40), isBailable: false } });
  await prisma.caseParty.createMany({ data: [{ caseId: case19.id, partyType: "VICTIM", firstName: "Andrew", lastName: "Ssali", phoneNumber: "+256787001901" }, { caseId: case19.id, partyType: "ACCUSED", firstName: "Godfrey", lastName: "Kintu", phoneNumber: "+256787001902" }, { caseId: case19.id, partyType: "ACCUSED", firstName: "Isaac", lastName: "Lubega", phoneNumber: "+256787001903" }] });
  const inv19 = await prisma.investigation.create({ data: { caseId: case19.id, policeStationId: psKla.id, assignedOfficerId: users.police.id, supervisingOfficerId: users.ocKla.id, startDate: past(38), status: "ACTIVE" } });
  await createEvidence(case19.id, policeId, { exhibitNumber: "PE-018", description: "Ransom demand note - handwritten", type: "DOCUMENT", status: "IN_CUSTODY", daysAgo: 30 });
  await createEvidence(case19.id, policeId, { exhibitNumber: "PE-019", description: "Mobile phone used to communicate ransom demands", type: "DIGITAL", status: "IN_CUSTODY", daysAgo: 28 });
  await prisma.detentionRecord.create({ data: { personId: users.ocKla.id, caseId: case19.id, facilityName: "Luzira Upper Prison", admissionDate: past(40), status: "REMAND", warrantNumber: "RW-201/2024", warrantType: "REMAND" } });

  const case20 = await prisma.case.create({
    data: {
      caseNumber: "HC-COMM-CV-019/2025", caseType: "COMMERCIAL", caseStatus: "ACTIVE", title: "Stanbic Bank Uganda Ltd vs Mukwano Industries Ltd",
      description: "Claim for recovery of an outstanding loan facility of UGX 2,100,000,000 advanced to the defendant for factory expansion in 2023. Defendant has defaulted on repayments for 6 consecutive months.",
      filingDate: past(55), courtId: commDiv.id, createdById: users.clerk.id, assignedJudgeId: users.judgeComm.id,
    } as never,
  });
  await prisma.civilCaseDetails.create({ data: { caseId: case20.id, claimAmount: 2100000000, causeOfAction: "Breach of loan agreement and recovery of outstanding debt", natureOfDispute: "Banking & Finance - Loan Recovery", plaintFiledDate: past(55), defenceFiledDate: past(30) } });
  await prisma.caseParty.createMany({ data: [{ caseId: case20.id, partyType: "APPLICANT", firstName: "Stanbic Bank", lastName: "Uganda Ltd", representation: "PRIVATE", lawyerId: users.advocate1.id }, { caseId: case20.id, partyType: "RESPONDENT", firstName: "Mukwano", lastName: "Industries Ltd", representation: "PRIVATE", lawyerId: users.advocate3.id }] });
  await createHearing(case20.id, commDiv.id, users.clerk.id, { type: "CASE_MANAGEMENT_CONFERENCE", daysAgo: 20, outcome: "CMC held. Mediation proposed." });

  // --- MORE CRIMINAL ---
  const case21 = await prisma.case.create({
    data: {
      caseNumber: "HC-LIR-CR-008/2025", caseType: "CRIMINAL", caseStatus: "DISMISSED", title: "Uganda vs Acheng",
      description: "The accused was charged with obtaining money by false pretense. Allegedly obtained UGX 5,000,000 from the complainant promising to secure a government job.",
      filingDate: past(180), courtId: hcLir.id, createdById: users.clerk2.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case21.id, offenceType: "Obtaining Money by False Pretense", penalCodeSection: "PC 312", arrestDate: past(190), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case21.id, partyType: "COMPLAINANT", firstName: "Betty", lastName: "Auma", phoneNumber: "+256788002101" }, { caseId: case21.id, partyType: "ACCUSED", firstName: "Charles", lastName: "Acheng", phoneNumber: "+256788002102" }] });
  await createTimeline(case21.id, users.clerk2.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 180 }, { eventType: "CASE_DISMISSED", title: "Case Dismissed", description: "Case dismissed for want of prosecution. Complainant failed to appear for 3 consecutive hearings.", daysAgo: 5 }]);
  await createHearing(case21.id, hcLir.id, users.clerk2.id, { type: "FIRST_MENTION", daysAgo: 175 });
  await createHearing(case21.id, hcLir.id, users.clerk2.id, { type: "TRIAL", daysAgo: 90, adjourned: true, adjournDate: 90, adjournReason: "Complainant absent." });
  await createHearing(case21.id, hcLir.id, users.clerk2.id, { type: "TRIAL", daysAgo: 60, adjourned: true, adjournDate: 60, adjournReason: "Complainant absent." });
  await createHearing(case21.id, hcLir.id, users.clerk2.id, { type: "TRIAL", daysAgo: 5, outcome: "Case dismissed for want of prosecution under Order 17 r.6 CPR.", adjourned: false });

  const case22 = await prisma.case.create({
    data: {
      caseNumber: "HC-MBR-CR-055/2025", caseType: "CRIMINAL", caseStatus: "CLOSED", title: "Uganda vs Tumusiime",
      description: "The accused was charged with housebreaking and theft. Broke into a shop in Mbarara Town and stole goods worth UGX 8,000,000.",
      filingDate: past(280), courtId: hcMbr.id, createdById: users.clerk.id,
    } as never,
  });
  await prisma.criminalCaseDetails.create({ data: { caseId: case22.id, offenceType: "Housebreaking and Theft", penalCodeSection: "PC 295", arrestDate: past(290), isBailable: true } });
  await prisma.caseParty.createMany({ data: [{ caseId: case22.id, partyType: "COMPLAINANT", firstName: "Asiimwe", lastName: "Traders Ltd", phoneNumber: "+256789002201" }, { caseId: case22.id, partyType: "ACCUSED", firstName: "Robert", lastName: "Tumusiime", phoneNumber: "+256789002202" }] });
  await createTimeline(case22.id, users.clerk.id, [{ eventType: "CASE_FILED", title: "Case Filed", daysAgo: 280 }, { eventType: "JUDGMENT", title: "Judgment", description: "Convicted. 5 years imprisonment.", daysAgo: 60 }, { eventType: "CASE_CLOSED", title: "Case Closed", daysAgo: 55 }]);
  await createHearing(case22.id, hcMbr.id, users.clerk.id, { type: "FIRST_MENTION", daysAgo: 275 });
  await createHearing(case22.id, hcMbr.id, users.clerk.id, { type: "JUDGMENT", daysAgo: 60, outcome: "Convicted. 5 years Gulu Prison." });
  await prisma.detentionRecord.create({ data: { personId: users.advocate1.id, caseId: case22.id, facilityName: "Mbarara Main Prison", admissionDate: past(290), status: "SENTENCED", warrantNumber: "RW-055/2025", warrantType: "SENTENCE" } });

  // --- APPEALS ---
  const appeal1 = await prisma.appeal.create({
    data: {
      originalCaseId: case3.id, appellantId: users.advocate3.id, respondentId: users.advocate2.id,
      appealType: "FIRST_APPEAL", appealNumber: "CA-CA-001/2025", filingDate: past(5),
      groundsOfAppeal: "1. The trial magistrate erred in law by admitting hearsay evidence of the fuel station attendant. 2. The sentence of 3 years is manifestly excessive given the first-time offender status of the appellant.",
      reliefSought: "Appeal against conviction be allowed, conviction quashed, and sentence set aside. In the alternative, sentence be reduced.",
      assignedCourtId: ca.id, status: "FILED",
    } as never,
  });
  await prisma.appealDecision.create({ data: { appealId: appeal1.id, outcome: "DISMISSED", decisionDate: past(2), reasoning: "The trial magistrate properly evaluated all evidence. The conviction is safe. However, sentence reduced from 3 years to 18 months given the appellant's remorse.", decidedBy: users.caj2.id } });
  await createTimeline(case3.id, users.clerk2.id, [{ eventType: "APPEAL_FILED", title: "Appeal Filed", description: "Notice of appeal filed against conviction and sentence", daysAgo: 5 }]);

  const appeal2 = await prisma.appeal.create({
    data: {
      originalCaseId: case11.id, appellantId: users.advocate2.id, respondentId: users.advocate1.id,
      appealType: "FIRST_APPEAL", appealNumber: "CA-CA-002/2025", filingDate: past(15),
      groundsOfAppeal: "1. The learned trial judge erred in the assessment of damages. 2. The exclusivity clause was ambiguous and unenforceable.",
      reliefSought: "Set aside judgment. Alternatively, reduce damages.",
      assignedCourtId: ca.id, status: "FILED",
    } as never,
  });

  console.log(`  ✓ 22 cases created (${8} criminal, ${5} civil, ${2} family, ${2} land, ${3} commercial, ${2} anti-corruption)`);
  console.log(`  ✓ 2 appeals created`);
  console.log(`  ✓ 5 bail applications`);
  console.log(`  ✓ 6 detention records`);
  console.log(`  ✓ 4 investigations`);

  // ===================== DOCUMENTS =====================
  console.log("Creating documents...");
  const docs = [
    { caseId: case1.id, title: "Charge Sheet - Murder", type: "PLEADING", uploadedById: users.prosecutor.id },
    { caseId: case1.id, title: "Post-Mortem Report", type: "CERTIFICATE", uploadedById: users.police.id },
    { caseId: case1.id, title: "Witness Statement - Grace Nambi", type: "AFFIDAVIT", uploadedById: users.police.id },
    { caseId: case3.id, title: "Judgment - CM-KLA-CR-156/2025", type: "JUDGMENT", uploadedById: users.clerk2.id },
    { caseId: case5.id, title: "IGG Investigation Report - Karamoja Roads", type: "CERTIFICATE", uploadedById: users.prosecutor2.id },
    { caseId: case9.id, title: "Plaint - Okello vs AG", type: "PLEADING", uploadedById: users.advocate2.id },
    { caseId: case9.id, title: "Written Statement of Defence", type: "PLEADING", uploadedById: users.clerk.id },
    { caseId: case10.id, title: "Survey Report - Mbarara Plot", type: "CERTIFICATE", uploadedById: users.advocate3.id },
    { caseId: case11.id, title: "Distribution Agreement (Exclusive)", type: "PLEADING", uploadedById: users.advocate1.id },
    { caseId: case11.id, title: "Judgment - HC-COMM-CV-007/2025", type: "JUDGMENT", uploadedById: users.clerk.id },
    { caseId: case15.id, title: "Certificate of Title - Ntinda Plot 24", type: "CERTIFICATE", uploadedById: users.advocate2.id },
    { caseId: case18.id, title: "Forensic Audit Report", type: "CERTIFICATE", uploadedById: users.prosecutor2.id },
    { caseId: case20.id, title: "Loan Agreement - Stanbic/Mukwano", type: "PLEADING", uploadedById: users.advocate1.id },
    { caseId: case2.id, title: "Police Statement - Arresting Officer", type: "AFFIDAVIT", uploadedById: users.police2.id },
    { caseId: case13.id, title: "Marriage Certificate", type: "CERTIFICATE", uploadedById: users.advocate1.id },
  ];
  for (const doc of docs) {
    await prisma.document.create({
      data: {
        caseId: doc.caseId, title: doc.title, documentType: doc.type as never,
        fileName: `${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`, fileUrl: "/uploads/seed-documents.pdf",
        fileSize: Math.floor(Math.random() * 5000000) + 100000, mimeType: "application/pdf",
        uploadedById: doc.uploadedById,
        tags: { create: doc.type === "JUDGMENT" ? [{ tag: "judgment" }, { tag: "final" }] : doc.type === "PLEADING" ? [{ tag: "pleading" }] : [{ tag: "evidence" }] },
      } as never,
    });
  }
  console.log(`  ✓ ${docs.length} documents`);

  // ===================== NOTIFICATIONS =====================
  console.log("Creating notifications...");
  const notifs = [
    { userId: users.admin.id, type: "SYSTEM", title: "System Update", body: "UG-CMS v1.0 has been deployed successfully.", daysAgo: 1, read: false },
    { userId: users.judgeKla.id, type: "CASE_UPDATE", title: "New Case Assigned", body: "Case HC-KLA-CR-001/2024 (Uganda vs Mukasa) has been assigned to you.", daysAgo: 178, read: true, refId: case1.id, refType: "CASE" },
    { userId: users.judgeKla.id, type: "HEARING_REMINDER", title: "Hearing Tomorrow", body: "Trial hearing for HC-KLA-CR-001/2024 scheduled for tomorrow at 9:00 AM.", daysAgo: 31, read: true, refId: case1.id, refType: "HEARING" },
    { userId: users.judgeMbl.id, type: "CASE_UPDATE", title: "Committal Complete", body: "Case HC-MBL-CR-042/2025 has been committed for trial.", daysAgo: 58, read: true, refId: case2.id, refType: "CASE" },
    { userId: users.prosecutor.id, type: "DPP_REVIEW", title: "Case Pending Review", body: "HC-ACD-CR-007/2025 (Byaruhanga) requires DPP sanction. IGG report attached.", daysAgo: 85, read: false, refId: case5.id, refType: "CASE" },
    { userId: users.police.id, type: "INVESTIGATION", title: "Investigation Opened", body: "Investigation for HC-KLA-CR-089/2025 (Defilement) has been assigned to you.", daysAgo: 48, read: false, refId: case4.id, refType: "INVESTIGATION" },
    { userId: users.advocate1.id, type: "HEARING_REMINDER", title: "Hearing Reminder", body: "Trial for HC-KLA-CR-001/2024 resumed. Next hearing in 2 days.", daysAgo: 32, read: true },
    { userId: users.registrar.id, type: "DOCUMENT", title: "Document Filed", body: "Post-mortem report filed for HC-KLA-CR-001/2024.", daysAgo: 128, read: true },
    { userId: users.admin.id, type: "SYSTEM", title: "Backlog Alert", body: "Cases pending judgment: 4. Cases under investigation > 90 days: 2.", daysAgo: 1, read: false },
    { userId: users.judgeJj.id, type: "CASE_UPDATE", title: "Judgment Reserved", body: "Case HC-JJ-CR-022/2025 is pending judgment. Final submissions received.", daysAgo: 18, read: false, refId: case8.id, refType: "CASE" },
    { userId: users.dpcKla.id, type: "INVESTIGATION", title: "PGI Update", body: "Prosecutor Ogwal has been assigned to guide investigation HC-ACD-CR-015/2025 under PGI.", daysAgo: 30, read: true, refId: case18.id, refType: "INVESTIGATION" },
    { userId: users.prison1.id, type: "DETENTION", title: "New Detention", body: "3 new remand prisoners admitted to Luzira Upper Prison.", daysAgo: 38, read: true },
    { userId: users.clerk.id, type: "HEARING_REMINDER", title: "CMC Tomorrow", body: "CMC for Okello vs AG scheduled for tomorrow.", daysAgo: 41, read: true, refId: case9.id, refType: "HEARING" },
    { userId: users.judgeComm.id, type: "CASE_UPDATE", title: "New Commercial Case", body: "Case HC-COMM-CV-019/2025 (Stanbic vs Mukwano) filed. UGX 2.1B claim.", daysAgo: 53, read: true, refId: case20.id, refType: "CASE" },
    { userId: users.admin.id, type: "SYSTEM", title: "Seed Complete", body: "Comprehensive seed data has been loaded successfully. 22 cases, 33 users, 18 courts.", daysAgo: 0, read: false },
  ];
  for (const n of notifs) {
    await createNotification(n.userId, n);
  }
  console.log(`  ✓ ${notifs.length} notifications`);

  console.log("\n✅ Database seeding complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  📊 USERS:      33 (all roles + realistic names)");
  console.log("  ⚖️  COURTS:     18 (SC → CA → 11 HC → 3 CM → 1 GM)");
  console.log("  🏢 STATIONS:    9 police stations + CID HQ");
  console.log("  📁 CASES:      22 across 6 types, all statuses");
  console.log("  🔍 INVESTIGATIONS: 4 active");
  console.log("  🎤 HEARINGS:   40+ scheduled/completed");
  console.log("  🔬 EVIDENCE:   19 items with chain of custody");
  console.log("  🤝 BAIL:       5 applications (3 granted, 2 denied)");
  console.log("  ⚡ APPEALS:    2 filed, 1 decided");
  console.log("  🏚️  DETENTION:  6 records across 4 prisons");
  console.log("  📄 DOCUMENTS:  15 filed across cases");
  console.log("  🔔 NOTIFICATIONS: 15 across users");
  console.log("  📋 TIMELINE:   50+ events");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🔑 All user passwords: admin123");
  console.log("📧 Admin: admin@ugcms.gov");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
